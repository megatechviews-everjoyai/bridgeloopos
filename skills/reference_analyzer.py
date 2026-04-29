"""
ReferenceAnalyzer — Multi-Image Face Description Locker
========================================================
Uses Gemini Vision to analyze multiple reference thumbnails and produce
a single hyper-detailed, generation-ready description for use in Imagen prompts.

The goal: every future thumbnail generated looks like the same person.
"""

import base64
import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
REFS_DIR = BASE_DIR / "backend" / "references"
REFS_DIR.mkdir(parents=True, exist_ok=True)


FACE_ANALYSIS_PROMPT = """
You are an expert AI image prompt engineer. I am giving you multiple reference photos of the same real person.

Analyze ALL photos together and produce ONE precise, generation-ready description of this person's appearance.
Focus ONLY on stable, consistent physical traits visible across all photos. Ignore lighting, clothing, makeup.

Output a JSON object with exactly these fields:
{
  "face_shape": "...",
  "skin_tone": "...",
  "eyes": "...",
  "nose": "...",
  "lips": "...",
  "hair": "...",
  "distinctive_features": "...",
  "age_range": "...",
  "ethnicity_descriptor": "...",
  "generation_prompt": "A photorealistic portrait of [paste the exact person description here, in one dense phrase suitable for an image model, 30-50 words]"
}

The generation_prompt field is the most important — it must be a single dense phrase that, if given to an image generator, would recreate this exact person consistently. Be specific about hair texture, color, face shape, eye color, skin tone. Do not use the person's name.
"""

AVATAR_ANALYSIS_PROMPT = """
You are an expert AI image prompt engineer. I am giving you multiple reference images of the same AI avatar character.

Analyze ALL images together and produce ONE precise, generation-ready description of this character's consistent visual identity.
Focus on: hair style/color, face shape, eye color/style, skin tone, art style (photorealistic vs illustrated).

Output a JSON object with exactly these fields:
{
  "art_style": "...",
  "hair": "...",
  "eyes": "...",
  "skin_tone": "...",
  "face_shape": "...",
  "distinctive_features": "...",
  "generation_prompt": "A [art style] portrait of [exact character description in one dense phrase, 30-50 words]"
}

The generation_prompt must recreate this exact character consistently in every future generation.
"""


class ReferenceAnalyzer:

    def __init__(self, gemini_key: str):
        self.gemini_key = gemini_key

    def analyze_references(self, image_paths: list, ref_type: str = "face") -> dict:
        """
        Analyze multiple reference images and return a locked description dict.
        ref_type: "face" (real person) or "avatar" (AI character)
        """
        import google.generativeai as genai
        genai.configure(api_key=self.gemini_key)
        model = genai.GenerativeModel("gemini-1.5-pro")

        # Load all images
        parts = []
        prompt = FACE_ANALYSIS_PROMPT if ref_type == "face" else AVATAR_ANALYSIS_PROMPT
        parts.append(prompt)

        loaded = 0
        for p in image_paths:
            try:
                img_bytes = Path(p).read_bytes()
                parts.append({
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(img_bytes).decode()
                })
                loaded += 1
            except Exception as e:
                print(f"[ReferenceAnalyzer] Could not load {p}: {e}")

        if loaded == 0:
            return {"error": "No valid images found"}

        print(f"[ReferenceAnalyzer] Analyzing {loaded} reference image(s) via Gemini Vision...")

        try:
            response = model.generate_content(parts)
            raw = response.text.strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            result = json.loads(raw.strip())
            return result

        except json.JSONDecodeError:
            # Return raw text in generation_prompt if JSON parse fails
            return {"generation_prompt": response.text.strip(), "raw": True}
        except Exception as e:
            return {"error": str(e)}

    def save_description(self, description: dict, ref_type: str):
        """Save the locked description to backend/references/."""
        out_path = REFS_DIR / f"{ref_type}_description.json"
        out_path.write_text(json.dumps(description, indent=2))
        print(f"[ReferenceAnalyzer] Saved {ref_type} description → {out_path}")
        return str(out_path)

    def load_description(self, ref_type: str) -> dict | None:
        """Load a previously saved description."""
        p = REFS_DIR / f"{ref_type}_description.json"
        if p.exists():
            return json.loads(p.read_text())
        return None

    def get_generation_prompt(self, ref_type: str) -> str | None:
        """Return just the generation_prompt string for use in Imagen."""
        desc = self.load_description(ref_type)
        if desc:
            return desc.get("generation_prompt")
        return None
