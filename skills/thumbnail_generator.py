"""
ThumbnailGenerator — EverjoyAI Consistent Thumbnail Skill
==========================================================
Generates a real YouTube/social thumbnail image via Vertex AI Imagen.

CHARACTER LOCK (from EverjoyAI Brand S.O.P.):
  Female | wavy dark brown hair | refined warm complexion | confident smile
  Deep Navy (#000033) background | Neon Purple (#A020F0) accent lighting

Always uses the same character description so all thumbnails are consistent.
Topic/context is injected around the locked character identity.
"""

import datetime
import sys
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

# ── Locked character identity ──────────────────────────────────────────────────
CHARACTER = (
    "Andrea, a young professional woman with wavy dark brown hair, "
    "refined warm complexion, confident friendly smile, sharp expressive eyes, "
    "stylish professional attire"
)

THUMBNAIL_STYLE = (
    "16:9 YouTube thumbnail composition, "
    "deep navy (#000033) background, neon purple (#A020F0) rim lighting and glow accents, "
    "cyberpunk luxury tech aesthetic, "
    "ultra-photorealistic, 8K, professional studio lighting, "
    "bold dramatic composition with clear space for text overlay, "
    "shallow depth of field, anamorphic lens, film grain, "
    "high contrast, cinematic color grade"
)


class ThumbnailGenerator:

    def generate(self, topic: str):
        """
        Generate a consistent branded thumbnail image for the given topic.
        Returns (abs_image_path, caption) — path is None if Imagen unavailable.
        """
        prompt = (
            f"{CHARACTER}, {topic}, "
            f"looking directly at camera with authority and warmth, "
            f"{THUMBNAIL_STYLE}"
        )

        from skills.image_generator import generate_shot

        shot_name = f"thumb_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"

        print(f"[Thumbnail] Generating image for: {topic[:60]}", file=sys.stderr)
        rel_path = generate_shot(prompt, shot_name, aspect_ratio="16:9")

        if rel_path:
            abs_path = str(BASE_DIR / "remotion-engine" / "public" / rel_path)
            caption = (
                f"🖼️ *Thumbnail Generated*\n\n"
                f"Topic: _{topic}_\n\n"
                f"_Imagen 3.0 | 16:9 | Consistent Character Lock_"
            )
            return abs_path, caption
        else:
            # Graceful fallback — return None so caller knows no image
            caption = (
                f"❌ *Imagen unavailable* — check GCP credentials.\n\n"
                f"Prompt used:\n`{prompt[:200]}...`"
            )
            return None, caption
