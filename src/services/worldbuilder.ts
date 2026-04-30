import { execFile, exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const WORLD_SCRIPT = path.join(__dirname, "../../scripts/engines/world_imagen.py");
const REMOTION_DIR = path.join(__dirname, "../../remotion-engine");
const OUTPUT_DIR = path.join(process.env.HOME || "~", "Documents/everjoy_worlds");

export type WorldBrand = "everjoy" | "curate" | "lave";

export type WorldSceneType = "world" | "scene" | "character" | "cinematic";

export interface WorldResult {
  success: boolean;
  bgPath?: string;
  subjectPath?: string;
  videoPath?: string;
  brand?: string;
  error?: string;
}

const SCENE_DEFAULTS: Record<WorldSceneType, { duration: number; fps: number; desc: string }> = {
  world:     { duration: 10, fps: 30, desc: "Epic cinematic world environment" },
  scene:     { duration: 6,  fps: 30, desc: "Architectural spatial composition" },
  cinematic: { duration: 15, fps: 24, desc: "Pure world — no subject" },
  character: { duration: 8,  fps: 30, desc: "Character reveal on brand background" },
};

export class WorldBuilderService {
  constructor(private geminiKey: string) {}

  async buildWorld(
    brand: WorldBrand,
    sceneType: WorldSceneType,
    sceneDesc: string,
    subjectDesc?: string
  ): Promise<WorldResult> {
    // Step 1: Generate background + transparent subject via Python
    const subject = subjectDesc || this.defaultSubject(brand, sceneType);
    const images = await this.runWorldScript(brand, sceneDesc, subject);
    if (!images.success) return images;

    // Step 2: Render Remotion composite to MP4
    const videoPath = await this.renderComposite(
      images.bgPath!,
      images.subjectPath!,
      brand,
      sceneType
    );

    return {
      ...images,
      videoPath: videoPath || undefined,
    };
  }

  private defaultSubject(brand: WorldBrand, type: WorldSceneType): string {
    if (type === "cinematic") return "none — background world only, no foreground subject";
    const subjects: Record<WorldBrand, string> = {
      everjoy: "EverjoyAI brand ambassador: female figure in neon purple tech-wear, wavy dark brown hair, refined complexion, friendly confident expression, full body visible",
      curate:  "Minimalist sculptural art piece — white marble abstract form, clean silhouette, editorial object",
      lave:    "Luxury art collector: female figure in refined ivory linen, warm expression, holding a rolled canvas, full body",
    };
    return subjects[brand];
  }

  private async runWorldScript(
    brand: WorldBrand,
    sceneDesc: string,
    subject: string
  ): Promise<WorldResult> {
    try {
      const args = [
        WORLD_SCRIPT,
        brand,
        sceneDesc,
      ];
      const { stdout } = await execFileAsync("python3", args, { timeout: 180000 });
      // Parse the last JSON line (status lines may precede it)
      const lines = stdout.trim().split("\n");
      const result = JSON.parse(lines[lines.length - 1]);

      if (result.error) return { success: false, error: result.message };

      return {
        success: true,
        bgPath: result.bg_path,
        subjectPath: result.subject_path,
        brand: result.brand,
      };
    } catch (e: any) {
      return {
        success: false,
        error: `[WORLD_BUILDER] | [${e.message}] | [Check GEMINI_API_KEY + python3] | [Retry /world]`,
      };
    }
  }

  private async renderComposite(
    bgPath: string,
    subjectPath: string,
    brand: WorldBrand,
    sceneType: WorldSceneType
  ): Promise<string | null> {
    // Check Remotion project exists
    if (!fs.existsSync(REMOTION_DIR)) {
      console.warn("⚠️ remotion-engine not found — skipping video render. Images generated OK.");
      return null;
    }

    const { duration, fps } = SCENE_DEFAULTS[sceneType];
    const durationFrames = duration * fps;
    const timestamp = Date.now();
    const outPath = path.join(OUTPUT_DIR, `world_${brand}_${timestamp}.mp4`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const cmd = [
      `cd "${REMOTION_DIR}"`,
      `npx remotion render WorldScene "${outPath}"`,
      `--props='${JSON.stringify({ bgPath, subjectPath, brand })}'`,
      `--frames=0-${durationFrames - 1}`,
      `--fps=${fps}`,
      `--log=error`,
    ].join(" ");

    try {
      await execAsync(cmd, { timeout: 300000 });
      return outPath;
    } catch (e: any) {
      console.error("Remotion render error:", e.message);
      return null; // Images still delivered even if video fails
    }
  }
}
