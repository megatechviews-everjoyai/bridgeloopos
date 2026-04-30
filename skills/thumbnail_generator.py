"""
ThumbnailGenerator — EverjoyAI Consistent Thumbnail Skill
==========================================================
Generates a cinematic 16:9 YouTube thumbnail via Vertex AI Imagen 3.0,
then composites clean accurate text using Pillow — eliminating all AI
text hallucination and gibberish.

Pipeline:
  1. Imagen generates the scene + person with ZERO text in the prompt
  2. Pillow draws pixel-perfect headline + subtext on top
  3. Final JPEG delivered to Telegram

Two identity modes:
  "face"   — User's real face (South Asian woman, dark hair, purple blazer)
  "avatar" — EverjoyAI avatar (white blazer, lavender shirt, dark brunette)
"""

import datetime
import re
import sys
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR  = Path(__file__).parent.parent
REFS_DIR  = BASE_DIR / "backend" / "references"
SHOTS_DIR = BASE_DIR / "remotion-engine" / "public" / "shots"

# Primary reference images (clear front-facing shot per mode)
REFERENCE_IMAGES = {
    "avatar": str(SHOTS_DIR / "refsheet_avatar_front.jpg"),
    "face":   str(REFS_DIR / "face_ref_1.jpg"),
}

# System fonts — Impact for headline, Arial Bold for subtext
FONT_IMPACT   = "/System/Library/Fonts/Supplemental/Impact.ttf"
FONT_BOLD     = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# ── Identity fallbacks ────────────────────────────────────────────────────────
DEFAULT_FACE_PROMPT = (
    "A professional South Asian woman with dark near-black wavy hair, warm olive "
    "medium-dark complexion, dark expressive brown eyes, warm confident smile, "
    "wearing a purple blazer over a cream top, looking directly at camera"
)
DEFAULT_AVATAR_PROMPT = (
    "A beautiful woman with long free-flowing wavy rich dark chocolate brown glossy hair, "
    "light porcelain complexion, blue-green eyes with polished makeup, warm confident smile, "
    "wearing a crisp white blazer over a lavender purple silk shirt, looking directly at camera"
)

# ── Per-mode Imagen style constraints (NO TEXT — text added by Pillow) ────────
STYLE_FACE = (
    "YouTube thumbnail 16:9 format, "
    "natural accurate warm olive South Asian skin tone, absolutely no purple or cool colour cast on skin, "
    "dark near-black hair, natural makeup, "
    "person on the LEFT third of frame, right two-thirds left open for text, "
    "ultra-photorealistic 8K, eye-catching thumbnail composition, shallow depth of field, "
    "NO TEXT, NO WORDS, NO LETTERS anywhere in the image"
)

STYLE_AVATAR = (
    "YouTube thumbnail 16:9 format, "
    "light porcelain skin tone on face — no purple cast, no grey cast, "
    "hair is deep rich chocolate brown very dark brunette, glossy shiny, free-flowing, "
    "absolutely no headband, no alice band, no hair clip, no hair accessories, "
    "white blazer with lavender shirt, "
    "person on the LEFT third of frame, right two-thirds left open for text, "
    "ultra-photorealistic 8K, eye-catching thumbnail composition, shallow depth of field, "
    "NO TEXT, NO WORDS, NO LETTERS anywhere in the image"
)

# ── Topic classifier ──────────────────────────────────────────────────────────
def _classify_topic(topic: str) -> str:
    t = topic.lower()
    if any(w in t for w in ["ai", "tech", "code", "software", "robot", "automation", "gpt", "claude", "machine", "data"]):
        return "tech"
    if any(w in t for w in ["money", "invest", "finance", "profit", "income", "rich", "wealth", "revenue", "business", "crypto"]):
        return "finance"
    if any(w in t for w in ["fitness", "health", "workout", "diet", "weight", "gym", "nutrition", "wellness"]):
        return "health"
    if any(w in t for w in ["market", "brand", "social", "content", "instagram", "youtube", "viral", "growth", "ads", "engagement"]):
        return "marketing"
    if any(w in t for w in ["design", "art", "creative", "style", "fashion", "luxury", "aesthetic", "jewel"]):
        return "creative"
    if any(w in t for w in ["secret", "hack", "truth", "exposed", "nobody", "mistake", "avoid", "warning", "scam", "lie"]):
        return "reveal"
    return "general"

# ── Scene templates (NO TEXT INSTRUCTIONS — clean image only) ─────────────────
SCENE_TEMPLATES = {
    "tech": (
        "futuristic dark server room background with holographic data streams and neon blue circuit patterns, "
        "glowing purple and electric blue light rays cutting through dark atmosphere, "
        "floating 3D abstract UI panels in background, deep navy and cyan colour palette"
    ),
    "finance": (
        "dramatic financial district skyline at golden hour background, "
        "golden warm light mixed with deep navy reflections on glass towers, "
        "abstract upward trending graph shapes in background, cinematic wealth aesthetic"
    ),
    "health": (
        "vibrant energetic sports arena or gym background with dynamic motion blur, "
        "bright orange teal and white colour palette, radiating energy lines, "
        "strong cinematic contrast, clean modern fitness aesthetic"
    ),
    "marketing": (
        "explosive colourful abstract social media inspired background, "
        "bright magenta pink electric blue and white colour burst, "
        "bold high-energy commercial photography feel, vivid saturated palette"
    ),
    "creative": (
        "luxurious deep navy to warm gold gradient background with soft bokeh orbs, "
        "subtle neon purple accent rim lighting, gold particle dust floating in air, "
        "gallery-quality cinematic elegant atmosphere"
    ),
    "reveal": (
        "dramatic dark atmospheric background with single strong spotlight beam, "
        "high contrast deep shadows, deep burgundy and black with sharp white light cuts, "
        "documentary thriller cinematic style"
    ),
    "general": (
        "dynamic studio gradient background from deep navy to electric purple, "
        "dramatic cinematic rim lighting with subtle lens flare, "
        "professional broadcast quality atmosphere"
    ),
}

# ── Text styling per category (used by Pillow compositor) ─────────────────────
TEXT_STYLES = {
    "tech":      {"headline_color": (0, 220, 255),   "shadow_color": (0, 0, 80),    "subtext_color": (200, 200, 255)},
    "finance":   {"headline_color": (255, 215, 0),   "shadow_color": (20, 10, 0),   "subtext_color": (255, 240, 180)},
    "health":    {"headline_color": (255, 140, 0),   "shadow_color": (80, 20, 0),   "subtext_color": (255, 255, 255)},
    "marketing": {"headline_color": (255, 50, 180),  "shadow_color": (80, 0, 60),   "subtext_color": (255, 255, 255)},
    "creative":  {"headline_color": (255, 255, 255), "shadow_color": (60, 40, 0),   "subtext_color": (255, 210, 120)},
    "reveal":    {"headline_color": (255, 30, 30),   "shadow_color": (60, 0, 0),    "subtext_color": (255, 255, 255)},
    "general":   {"headline_color": (255, 255, 255), "shadow_color": (40, 0, 80),   "subtext_color": (200, 180, 255)},
}

SUBTEXT_MAP = {
    "tech":      "THE FUTURE IS HERE",
    "finance":   "CHANGE YOUR FINANCIAL LIFE",
    "health":    "TRANSFORM YOUR BODY",
    "marketing": "GO VIRAL NOW",
    "creative":  "THE ART OF EXCELLENCE",
    "reveal":    "THEY DON'T WANT YOU TO KNOW",
    "general":   "YOU NEED TO SEE THIS",
}


def _clean_headline(topic: str) -> str:
    """Derive a punchy 3-4 word headline from the topic — letters only."""
    cleaned = re.sub(r'[^a-zA-Z0-9 ]', '', topic).strip()
    words   = [w for w in cleaned.split() if len(w) > 1]
    # Use first 4 meaningful words, uppercased
    return " ".join(w.upper() for w in words[:4]) if words else topic.upper()[:20]


def _composite_text(image_path: str, headline: str, subtext: str, category: str) -> str:
    """
    Loads the Imagen-generated image, draws clean Pillow text over it,
    saves as a new file, and returns the new path.
    Avoids all AI text hallucination — guaranteed accurate output.
    """
    img    = Image.open(image_path).convert("RGB")
    draw   = ImageDraw.Draw(img)
    w, h   = img.size
    style  = TEXT_STYLES[category]

    # Text area: right 55% of image
    text_x_start = int(w * 0.42)
    text_area_w  = w - text_x_start - int(w * 0.04)  # 4% right margin
    text_center_x = text_x_start + text_area_w // 2

    # ── Headline font — auto-size to fit text area ────────────────────────────
    headline_size = int(h * 0.14)  # start at 14% of height
    while headline_size > 24:
        try:
            font_h = ImageFont.truetype(FONT_IMPACT, headline_size)
        except Exception:
            font_h = ImageFont.load_default()
            break
        # Check if headline fits on 2 lines
        words = headline.split()
        lines = []
        line  = ""
        for word in words:
            test = (line + " " + word).strip()
            bb   = draw.textbbox((0, 0), test, font=font_h)
            if bb[2] - bb[0] <= text_area_w:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
        if len(lines) <= 3:
            break
        headline_size -= 6

    try:
        font_headline = ImageFont.truetype(FONT_IMPACT, headline_size)
        font_subtext  = ImageFont.truetype(FONT_BOLD,   int(headline_size * 0.38))
    except Exception:
        font_headline = ImageFont.load_default()
        font_subtext  = ImageFont.load_default()

    # Wrap headline into lines
    words = headline.split()
    lines = []
    line  = ""
    for word in words:
        test = (line + " " + word).strip()
        bb   = draw.textbbox((0, 0), test, font=font_headline)
        if bb[2] - bb[0] <= text_area_w:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)

    # Calculate total text block height
    line_h     = int(headline_size * 1.15)
    subtext_h  = int(font_headline.size * 0.5)
    gap        = int(h * 0.025)
    total_h    = len(lines) * line_h + gap + subtext_h
    start_y    = (h - total_h) // 2

    shadow_offset = max(3, headline_size // 20)

    # ── Draw headline lines ───────────────────────────────────────────────────
    y = start_y
    for line_text in lines:
        bb = draw.textbbox((0, 0), line_text, font=font_headline)
        lw = bb[2] - bb[0]
        x  = text_center_x - lw // 2

        # Thick drop shadow
        for dx in range(-shadow_offset, shadow_offset + 1, shadow_offset):
            for dy in range(-shadow_offset, shadow_offset + 1, shadow_offset):
                if dx != 0 or dy != 0:
                    draw.text((x + dx, y + dy), line_text, font=font_headline, fill=style["shadow_color"])
        # Stroke outline (readability)
        s = max(2, shadow_offset // 2)
        for dx, dy in [(-s,0),(s,0),(0,-s),(0,s)]:
            draw.text((x + dx, y + dy), line_text, font=font_headline, fill=(0, 0, 0))
        # Main headline text
        draw.text((x, y), line_text, font=font_headline, fill=style["headline_color"])
        y += line_h

    # ── Draw subtext ──────────────────────────────────────────────────────────
    y += gap
    bb  = draw.textbbox((0, 0), subtext, font=font_subtext)
    sw  = bb[2] - bb[0]
    sx  = text_center_x - sw // 2
    # Shadow
    draw.text((sx + 2, y + 2), subtext, font=font_subtext, fill=style["shadow_color"])
    draw.text((sx, y), subtext, font=font_subtext, fill=style["subtext_color"])

    # ── Save composited image ─────────────────────────────────────────────────
    out_path = image_path.replace(".jpg", "_text.jpg")
    img.save(out_path, "JPEG", quality=95)
    return out_path


def _build_scene_prompt(topic: str, identity: str, mode: str) -> str:
    """Build the Imagen prompt — scene + person only, ZERO text."""
    category = _classify_topic(topic)
    scene    = SCENE_TEMPLATES[category]
    style    = STYLE_FACE if mode == "face" else STYLE_AVATAR

    return (
        f"{identity}, "
        f"positioned on the left third of the 16:9 frame, "
        f"three-quarter body shot facing slightly toward the right, "
        f"confident energetic expression matching topic: {topic}, "
        f"dramatic gesture or open hand pointing right toward text area, "
        f"{scene}, "
        f"vivid saturated colours, dramatic cinematic lighting, high contrast, "
        f"{style}"
    )


class ThumbnailGenerator:

    def _load_identity_prompt(self, mode: str) -> str:
        desc_path = REFS_DIR / f"{mode}_description.json"
        if desc_path.exists():
            try:
                desc   = json.loads(desc_path.read_text())
                prompt = desc.get("generation_prompt", "")
                if prompt:
                    return prompt
            except Exception:
                pass
        return DEFAULT_FACE_PROMPT if mode == "face" else DEFAULT_AVATAR_PROMPT

    def generate(self, topic: str, mode: str = "avatar"):
        """
        Generate a YouTube thumbnail with locked identity and accurate Pillow text.
        No AI text hallucination possible — Imagen generates scene only.
        Returns (abs_image_path, caption) or (None, error_message).
        """
        identity = self._load_identity_prompt(mode)
        prompt   = _build_scene_prompt(topic, identity, mode)
        category = _classify_topic(topic)
        headline = _clean_headline(topic)
        subtext  = SUBTEXT_MAP[category]

        from skills.image_generator import generate_shot

        shot_name = f"thumb_{mode}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"

        ref_path = REFERENCE_IMAGES.get(mode)
        has_ref  = ref_path and Path(ref_path).exists()

        print(f"[Thumbnail] mode={mode} | topic={topic[:50]}", file=sys.stderr)
        print(f"[Thumbnail] category={category} | headline='{headline}'", file=sys.stderr)
        print(f"[Thumbnail] reference={'YES' if has_ref else 'none'}", file=sys.stderr)

        rel_path = generate_shot(
            prompt, shot_name, aspect_ratio="16:9",
            reference_image_path=ref_path if has_ref else None
        )

        mode_label = "My Face" if mode == "face" else "Avatar"

        if not rel_path:
            return None, (
                f"Imagen unavailable — check GCP credentials.\n"
                f"Mode: {mode_label} | Topic: {topic}"
            )

        # Composite clean Pillow text on top — zero hallucination
        base_path = str(BASE_DIR / "remotion-engine" / "public" / rel_path)
        try:
            final_path = _composite_text(base_path, headline, subtext, category)
            print(f"[Thumbnail] Text composited → {final_path}", file=sys.stderr)
        except Exception as e:
            print(f"[Thumbnail] Text composite failed ({e}), using raw image", file=sys.stderr)
            final_path = base_path

        caption = (
            f"Thumbnail Generated\n\n"
            f"Mode: {mode_label}\n"
            f"Topic: {topic}\n"
            f"Headline: {headline}\n"
            f"Style: {category.title()}\n\n"
            f"Imagen 3.0 | 16:9 | Pillow Text"
        )
        return final_path, caption
