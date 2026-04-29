"""
ThumbnailGenerator — EverjoyAI Consistent Thumbnail Skill
==========================================================
Generates a real 16:9 YouTube thumbnail via Vertex AI Imagen.

Two identity modes:
  "face"   — User's real face (locked via /setmyface + Gemini Vision analysis)
  "avatar" — EverjoyAI avatar character (locked via /setavatar)

If no reference has been set, falls back to the default avatar description.
"""

import datetime
import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
REFS_DIR = BASE_DIR / "backend" / "references"

# ── Default fallback avatar (used until /setavatar is run) ────────────────────
DEFAULT_AVATAR_PROMPT = (
    "A young professional woman with wavy dark brown hair, refined warm complexion, "
    "confident friendly smile, sharp expressive eyes, stylish professional attire, "
    "looking directly at camera with authority and warmth"
)

# ── Shared thumbnail style applied to BOTH modes ──────────────────────────────
THUMBNAIL_STYLE = (
    "YouTube thumbnail, 16:9 composition, "
    "deep navy (#000033) background, neon purple (#A020F0) rim lighting and accent glow, "
    "cyberpunk luxury tech aesthetic, ultra-photorealistic, 8K, "
    "professional studio lighting, bold dramatic framing, "
    "clear space at top or bottom for text overlay, "
    "shallow depth of field, anamorphic lens, cinematic color grade"
)


class ThumbnailGenerator:

    def _load_identity_prompt(self, mode: str) -> str:
        """Load the locked generation_prompt for 'face' or 'avatar'."""
        desc_path = REFS_DIR / f"{mode}_description.json"
        if desc_path.exists():
            try:
                desc = json.loads(desc_path.read_text())
                prompt = desc.get("generation_prompt", "")
                if prompt:
                    return prompt
            except Exception:
                pass
        # Fallback for avatar when no reference set yet
        return DEFAULT_AVATAR_PROMPT

    def generate(self, topic: str, mode: str = "avatar"):
        """
        Generate a branded thumbnail image.
        mode: "face" (real person) or "avatar" (AI character)
        Returns (abs_image_path, caption) — path is None if Imagen unavailable.
        """
        identity = self._load_identity_prompt(mode)

        prompt = (
            f"{identity}, "
            f"{topic}, "
            f"{THUMBNAIL_STYLE}"
        )

        from skills.image_generator import generate_shot

        shot_name = f"thumb_{mode}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"

        print(f"[Thumbnail] mode={mode} | topic={topic[:50]}", file=sys.stderr)
        print(f"[Thumbnail] identity={identity[:80]}...", file=sys.stderr)

        rel_path = generate_shot(prompt, shot_name, aspect_ratio="16:9")

        mode_label = "My Face" if mode == "face" else "Avatar"

        if rel_path:
            abs_path = str(BASE_DIR / "remotion-engine" / "public" / rel_path)
            caption = (
                f"🖼️ *Thumbnail Generated*\n\n"
                f"Mode: _{mode_label}_\n"
                f"Topic: _{topic}_\n\n"
                f"_Imagen 3.0 | 16:9 | Locked Identity_"
            )
            return abs_path, caption
        else:
            return None, (
                f"❌ *Imagen unavailable* — check GCP credentials.\n"
                f"Mode: {mode_label} | Topic: {topic}"
            )
