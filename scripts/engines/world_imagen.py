"""
World Builder — Vertex AI Imagen engine
Replaces Gemini API (quota-limited) with the service-account Imagen pipeline.
Called by worldbuilder.ts via execFile.

Usage: python3 world_imagen.py <brand> <scene_desc>
  brand: everjoy | curate | lave
  scene_desc: free-text scene description

Outputs: JSON line  {"success": true, "bg_path": "...", "subject_path": null}
"""
import sys
import json
import os
import datetime
from pathlib import Path

# Resolve workspace root (scripts/engines/ → ../../)
ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

from skills.image_generator import generate_shot

BRAND_WORLD_PROMPTS = {
    "everjoy": (
        "Cyberpunk aerial megacity at midnight, neon purple #A020F0 and deep navy #000033 "
        "atmospheric glow, holographic data streams floating through rain-slicked streets, "
        "ultra-wide cinematic establishing shot, RED V-Raptor anamorphic lens, "
        "teal-orange colour grade, Dezeen editorial world-building aesthetic"
    ),
    "curate": (
        "Infinite white architectural void with soft geometric shadow planes, "
        "single sculptural marble column as focal point, north-facing gallery diffused light, "
        "generous negative space, Leica M11 35mm f/5.6, Kinfolk architectural feature"
    ),
    "lave": (
        "Warm stone gallery hall at golden hour, arched limestone ceiling 8 metres high, "
        "warm amber museum exhibition lighting, large-format oil painting on far wall, "
        "Moroccan wool rug, patinated brass fixtures, Phase One XF 55mm, Architectural Digest"
    ),
}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: world_imagen.py <brand> <scene_desc>"}))
        sys.exit(1)

    brand      = sys.argv[1].lower()
    scene_desc = " ".join(sys.argv[2:])

    base_prompt = BRAND_WORLD_PROMPTS.get(brand, BRAND_WORLD_PROMPTS["everjoy"])
    full_prompt = f"{base_prompt}. Additional scene context: {scene_desc}. No text, no words, no letters in the image."

    ts        = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    shot_name = f"world_{brand}_{ts}"

    rel_path = generate_shot(full_prompt, shot_name, aspect_ratio="16:9")

    if rel_path:
        abs_path = str(ROOT / "remotion-engine" / "public" / rel_path)
        print(json.dumps({"success": True, "bg_path": abs_path, "subject_path": None}))
    else:
        print(json.dumps({"success": False, "error": "Imagen unavailable — check GCP service account credentials"}))


if __name__ == "__main__":
    main()
