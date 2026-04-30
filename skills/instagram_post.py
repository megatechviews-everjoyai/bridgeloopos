"""
InstagramPost — Branded 1:1 Feed Post Generator
================================================
Two distinct brand pipelines, both 1080x1080 (1:1):

  "lave_gallery"  — Nature-inspired Imagen scene + Bible verse of the day
                    Elegant calligraphy text composited by Pillow (Brush Script)
                    Warm botanical aesthetic: ivory, gold, sage green

  "everjoyai"     — Cyberpunk tech scene with avatar face reference
                    Neon typography composited by Pillow (Impact + Arial Bold)
                    Deep navy, neon purple, electric blue palette

All text is added AFTER Imagen via Pillow — eliminating hallucination entirely.
"""

import datetime
import sys
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR  = Path(__file__).parent.parent
SHOTS_DIR = BASE_DIR / "remotion-engine" / "public" / "shots"
REFS_DIR  = BASE_DIR / "backend" / "references"

# Avatar reference for EverjoyAI posts
AVATAR_REF = str(SHOTS_DIR / "refsheet_avatar_front.jpg")

# Fonts
FONT_BRUSH   = "/System/Library/Fonts/Supplemental/Brush Script.ttf"      # Lave calligraphy
FONT_GEORGIA = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"    # Lave reference text
FONT_IMPACT  = "/System/Library/Fonts/Supplemental/Impact.ttf"             # EverjoyAI headline
FONT_BOLD    = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"         # EverjoyAI subtext


# ── Bible verses — rotating daily ────────────────────────────────────────────
# Nature, hope, strength, wisdom themes — curated for elegance
BIBLE_VERSES = [
    ("The earth is the Lord's, and everything in it, the world, and all who live in it.",        "Psalm 24:1"),
    ("He makes me lie down in green pastures, he leads me beside quiet waters.",                  "Psalm 23:2"),
    ("For I know the plans I have for you, plans to prosper you and not to harm you.",            "Jeremiah 29:11"),
    ("The heavens declare the glory of God; the skies proclaim the work of his hands.",           "Psalm 19:1"),
    ("Be still, and know that I am God.",                                                          "Psalm 46:10"),
    ("I can do all this through him who gives me strength.",                                       "Philippians 4:13"),
    ("And we know that in all things God works for the good of those who love him.",               "Romans 8:28"),
    ("Trust in the Lord with all your heart and lean not on your own understanding.",              "Proverbs 3:5"),
    ("She is clothed with strength and dignity; she can laugh at the days to come.",               "Proverbs 31:25"),
    ("The Lord is my shepherd, I lack nothing.",                                                   "Psalm 23:1"),
    ("Consider the lilies of the field, how they grow; they toil not, neither do they spin.",     "Matthew 6:28"),
    ("He gives strength to the weary and increases the power of the weak.",                        "Isaiah 40:29"),
    ("The Lord will fight for you; you need only to be still.",                                    "Exodus 14:14"),
    ("Your word is a lamp for my feet, a light on my path.",                                       "Psalm 119:105"),
    ("For God so loved the world that he gave his one and only Son.",                              "John 3:16"),
    ("Do not be anxious about anything, but in every situation, by prayer and petition.",          "Philippians 4:6"),
    ("Come to me, all you who are weary and burdened, and I will give you rest.",                  "Matthew 11:28"),
    ("For the Lord your God is with you wherever you go.",                                         "Joshua 1:9"),
    ("Create in me a pure heart, O God, and renew a steadfast spirit within me.",                 "Psalm 51:10"),
    ("But seek first his kingdom and his righteousness, and all these things will be given.",      "Matthew 6:33"),
    ("The Lord bless you and keep you; the Lord make his face shine on you.",                      "Numbers 6:24-25"),
    ("Delight yourself in the Lord, and he will give you the desires of your heart.",              "Psalm 37:4"),
    ("With God all things are possible.",                                                           "Matthew 19:26"),
    ("Give thanks to the Lord, for he is good; his love endures forever.",                         "Psalm 107:1"),
    ("In the beginning God created the heavens and the earth.",                                    "Genesis 1:1"),
    ("So do not fear, for I am with you; do not be dismayed, for I am your God.",                  "Isaiah 41:10"),
    ("Love is patient, love is kind. It does not envy, it does not boast.",                        "1 Corinthians 13:4"),
    ("Let your light shine before others, that they may see your good deeds.",                     "Matthew 5:16"),
    ("He has made everything beautiful in its time.",                                               "Ecclesiastes 3:11"),
    ("The Lord is my light and my salvation — whom shall I fear?",                                 "Psalm 27:1"),
    ("Ask and it will be given to you; seek and you will find.",                                    "Matthew 7:7"),
    ("Peace I leave with you; my peace I give you.",                                               "John 14:27"),
    ("Rejoice always, pray continually, give thanks in all circumstances.",                         "1 Thessalonians 5:16-18"),
    ("But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", "Isaiah 40:31"),
    ("For where two or three gather in my name, there am I with them.",                            "Matthew 18:20"),
    ("The fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness.",              "Galatians 5:22"),
    ("I am the vine; you are the branches.",                                                        "John 15:5"),
    ("Blessed are the pure in heart, for they will see God.",                                       "Matthew 5:8"),
    ("The grass withers and the flowers fall, but the word of our God endures forever.",           "Isaiah 40:8"),
    ("I praise you because I am fearfully and wonderfully made.",                                   "Psalm 139:14"),
]


def _get_verse_of_day() -> tuple[str, str]:
    """Return today's Bible verse, rotating through the curated list by day of year."""
    day_of_year = datetime.date.today().timetuple().tm_yday
    verse, ref  = BIBLE_VERSES[day_of_year % len(BIBLE_VERSES)]
    return verse, ref


# ── Nature scene templates (Lave Gallery) ─────────────────────────────────────
NATURE_SCENES = [
    "A breathtaking golden hour botanical garden with soft bokeh wildflowers, warm amber and cream tones, dappled sunlight filtering through lush green leaves, dreamy film photography aesthetic",
    "A misty ancient forest clearing at dawn, shafts of golden light piercing through tall trees, soft green moss and ferns, ethereal atmospheric haze, peaceful and sacred atmosphere",
    "A pristine white sand beach at sunrise with gentle turquoise waves, warm golden pink sky reflected on wet sand, shells and sea glass in foreground, serene and contemplative mood",
    "A lush lavender field at golden hour, purple blooms stretching to the horizon, warm sunset light casting long shadows, butterflies in soft focus, pastoral and serene",
    "A tranquil mountain lake at sunrise reflecting snow-capped peaks, crystal clear blue water with lily pads, morning mist rising from the surface, majestic and sacred landscape",
    "A wildflower meadow in full bloom with daisies and poppies, soft warm light, honeybees in flight, rolling green hills in background, joyful and abundant",
    "An ancient olive grove with gnarled silver-green trees, dappled Mediterranean light, soft warm earth tones, timeless and sacred atmosphere",
    "A coastal cliff at sunrise with waves crashing below, golden sky meeting turquoise sea, wildflowers on the clifftop, vast and awe-inspiring perspective",
]


def _get_nature_scene() -> str:
    """Pick a nature scene rotating by week so it changes but stays consistent per day."""
    week = datetime.date.today().isocalendar()[1]
    return NATURE_SCENES[week % len(NATURE_SCENES)]


# ── Lave Gallery: Pillow text compositor ──────────────────────────────────────
def _composite_lave_text(image_path: str, verse: str, reference: str) -> str:
    """
    Overlay Bible verse in elegant calligraphy on the Lave Gallery nature image.
    Uses a semi-transparent overlay panel at the bottom for readability.
    """
    img  = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size  # Should be 1080x1080

    # ── Semi-transparent dark overlay at bottom ───────────────────────────────
    overlay_h = int(h * 0.42)
    overlay_y = h - overlay_h
    # Gradient: draw RGBA lines directly, fade from transparent to warm dark
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    for i in range(overlay_h):
        alpha = int(185 * (i / overlay_h))
        ov_draw.line([(0, overlay_y + i), (w, overlay_y + i)], fill=(20, 12, 5, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    # Re-init draw after paste
    draw = ImageDraw.Draw(img)

    # ── Brand mark: "LAVE GALLERY" at top ────────────────────────────────────
    try:
        font_brand = ImageFont.truetype(FONT_GEORGIA, int(h * 0.038))
    except Exception:
        font_brand = ImageFont.load_default()

    brand_text = "LAVE GALLERY"
    bb  = draw.textbbox((0, 0), brand_text, font=font_brand)
    bw  = bb[2] - bb[0]
    bx  = (w - bw) // 2
    by  = int(h * 0.04)
    # Subtle shadow
    draw.text((bx + 1, by + 1), brand_text, font=font_brand, fill=(80, 60, 20, 180))
    draw.text((bx, by), brand_text, font=font_brand, fill=(220, 195, 130))

    # ── Verse text in Brush Script (calligraphy) ──────────────────────────────
    verse_font_size = int(h * 0.072)
    while verse_font_size > 28:
        try:
            font_verse = ImageFont.truetype(FONT_BRUSH, verse_font_size)
        except Exception:
            font_verse = ImageFont.load_default()
            break
        # Wrap to ~32 chars per line
        wrapped = textwrap.fill(verse, width=32)
        lines   = wrapped.split("\n")
        max_lw  = max(draw.textbbox((0, 0), l, font=font_verse)[2] for l in lines)
        if max_lw <= w - int(w * 0.1):
            break
        verse_font_size -= 4

    try:
        font_verse = ImageFont.truetype(FONT_BRUSH, verse_font_size)
        font_ref   = ImageFont.truetype(FONT_GEORGIA, int(verse_font_size * 0.42))
    except Exception:
        font_verse = ImageFont.load_default()
        font_ref   = ImageFont.load_default()

    wrapped = textwrap.fill(verse, width=32)
    lines   = wrapped.split("\n")
    line_h  = int(verse_font_size * 1.3)
    total_text_h = len(lines) * line_h + int(h * 0.06)  # + ref line

    # Centre text block in the lower overlay area
    text_start_y = overlay_y + (overlay_h - total_text_h) // 2

    for line in lines:
        bb  = draw.textbbox((0, 0), line, font=font_verse)
        lw  = bb[2] - bb[0]
        lx  = (w - lw) // 2
        # Soft shadow for readability
        draw.text((lx + 2, text_start_y + 2), line, font=font_verse, fill=(10, 5, 0))
        draw.text((lx, text_start_y), line, font=font_verse, fill=(245, 232, 195))
        text_start_y += line_h

    # ── Reference (e.g. "Psalm 23:2") in Georgia Italic ──────────────────────
    text_start_y += int(h * 0.015)
    bb  = draw.textbbox((0, 0), f"— {reference}", font=font_ref)
    rw  = bb[2] - bb[0]
    rx  = (w - rw) // 2
    draw.text((rx + 1, text_start_y + 1), f"— {reference}", font=font_ref, fill=(10, 5, 0))
    draw.text((rx, text_start_y), f"— {reference}", font=font_ref, fill=(200, 175, 110))

    out_path = image_path.replace(".jpg", "_lave.jpg")
    img.save(out_path, "JPEG", quality=95)
    return out_path


# ── EverjoyAI: Pillow text compositor ────────────────────────────────────────
def _composite_everjoy_text(image_path: str, topic: str) -> str:
    """
    Overlay EverjoyAI brand text on the tech cyberpunk image.
    Impact headline + neon purple glow aesthetic.
    """
    img  = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    try:
        font_brand    = ImageFont.truetype(FONT_BOLD,   int(h * 0.042))
        font_headline = ImageFont.truetype(FONT_IMPACT, int(h * 0.11))
        font_sub      = ImageFont.truetype(FONT_BOLD,   int(h * 0.038))
    except Exception:
        font_brand    = ImageFont.load_default()
        font_headline = ImageFont.load_default()
        font_sub      = ImageFont.load_default()

    # ── Dark overlay strip at bottom ──────────────────────────────────────────
    strip_h = int(h * 0.36)
    strip_y = h - strip_h
    strip   = Image.new("RGB", (w, strip_h), (0, 0, 30))
    img.paste(strip, (0, strip_y))
    # Re-init draw
    draw = ImageDraw.Draw(img)

    # Neon purple divider line
    draw.rectangle([(0, strip_y), (w, strip_y + 3)], fill=(160, 32, 240))

    # ── Brand mark: "EVERJOY AI" ──────────────────────────────────────────────
    brand_text = "EVERJOY AI"
    bb  = draw.textbbox((0, 0), brand_text, font=font_brand)
    bw  = bb[2] - bb[0]
    bx  = (w - bw) // 2
    by  = int(h * 0.04)
    # Neon glow effect (draw multiple times with offset)
    for gx, gy in [(-2,0),(2,0),(0,-2),(0,2)]:
        draw.text((bx + gx, by + gy), brand_text, font=font_brand, fill=(160, 32, 240))
    draw.text((bx, by), brand_text, font=font_brand, fill=(220, 180, 255))

    # ── Topic headline (uppercase, auto-wrapped) ──────────────────────────────
    import re
    cleaned  = re.sub(r'[^a-zA-Z0-9 ]', '', topic).strip().upper()
    words    = cleaned.split()
    headline = " ".join(words[:4]) if words else "EVERJOY AI"

    wrapped  = textwrap.fill(headline, width=14)
    h_lines  = wrapped.split("\n")
    hl_size  = int(h * 0.11)
    line_h   = int(hl_size * 1.1)
    total_hl = len(h_lines) * line_h

    # Sub-text
    subtext    = "POWERED BY EVERJOY AI"
    sub_size_h = int(h * 0.038)

    total_block = total_hl + int(h * 0.02) + sub_size_h
    start_y     = strip_y + (strip_h - total_block) // 2

    for line in h_lines:
        bb  = draw.textbbox((0, 0), line, font=font_headline)
        lw  = bb[2] - bb[0]
        lx  = (w - lw) // 2
        # Neon purple glow
        for dx, dy in [(-3,0),(3,0),(0,-3),(0,3),(-2,-2),(2,-2),(-2,2),(2,2)]:
            draw.text((lx + dx, start_y + dy), line, font=font_headline, fill=(120, 0, 200))
        # Main text
        draw.text((lx, start_y), line, font=font_headline, fill=(0, 220, 255))
        start_y += line_h

    # Sub-text
    start_y += int(h * 0.02)
    bb   = draw.textbbox((0, 0), subtext, font=font_sub)
    sw   = bb[2] - bb[0]
    sx   = (w - sw) // 2
    draw.text((sx, start_y), subtext, font=font_sub, fill=(160, 32, 240))

    out_path = image_path.replace(".jpg", "_everjoy.jpg")
    img.save(out_path, "JPEG", quality=95)
    return out_path


# ── Main generator class ──────────────────────────────────────────────────────
class InstagramPost:

    def generate(self, topic: str, brand: str = "everjoyai"):
        """
        Generate a 1:1 Instagram feed post.
        brand: "lave_gallery" or "everjoyai"
        Returns (abs_image_path, caption) or (None, error_caption).
        """
        from skills.image_generator import generate_shot

        ts        = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shot_name = f"ig_{brand}_{ts}"

        if brand == "lave_gallery":
            return self._generate_lave(topic, shot_name)
        else:
            return self._generate_everjoy(topic, shot_name)

    # ── Lave Gallery ──────────────────────────────────────────────────────────
    def _generate_lave(self, topic: str, shot_name: str):
        from skills.image_generator import generate_shot

        verse, reference = _get_verse_of_day()
        scene            = _get_nature_scene()

        prompt = (
            f"{scene}, "
            f"1:1 square format, "
            f"ultra-photorealistic 8K, "
            f"warm ivory cream and gold tones, soft natural light, "
            f"fine art photography aesthetic, gallery-quality composition, "
            f"no people, no text, no words in the image"
        )

        print(f"[LavePost] verse='{verse[:50]}...' | ref={reference}", file=sys.stderr)
        print(f"[LavePost] scene={scene[:60]}...", file=sys.stderr)

        rel_path = generate_shot(prompt, shot_name, aspect_ratio="1:1")

        if not rel_path:
            return None, f"Imagen unavailable. Brand: Lave Gallery"

        base_path = str(BASE_DIR / "remotion-engine" / "public" / rel_path)

        try:
            final_path = _composite_lave_text(base_path, verse, reference)
        except Exception as e:
            print(f"[LavePost] Text composite failed: {e}", file=sys.stderr)
            final_path = base_path

        caption = (
            f"Verse of the Day\n\n"
            f'"{verse}"\n\n'
            f"— {reference}\n\n"
            f"Lave Gallery | @lave_gallery"
        )
        return final_path, caption

    # ── EverjoyAI ─────────────────────────────────────────────────────────────
    def _generate_everjoy(self, topic: str, shot_name: str):
        from skills.image_generator import generate_shot

        has_avatar = Path(AVATAR_REF).exists()

        import json as _json
        avatar_identity = "A beautiful professional woman with long wavy dark chocolate brown glossy hair, light porcelain complexion, blue-green eyes, white blazer over lavender shirt, confident posture"
        desc_path = REFS_DIR / "avatar_description.json"
        if desc_path.exists():
            try:
                d = _json.loads(desc_path.read_text())
                avatar_identity = d.get("generation_prompt", avatar_identity)
            except Exception:
                pass

        prompt = (
            f"{avatar_identity}, "
            f"full body or three-quarter shot, "
            f"futuristic cyberpunk tech environment: holographic interfaces, "
            f"neon purple and electric blue light rays, dark deep navy background, "
            f"floating data streams and circuit patterns, "
            f"dramatic cinematic lighting, "
            f"1:1 square format, ultra-photorealistic 8K, "
            f"EverjoyAI brand aesthetic, luxury tech, "
            f"no text, no words in the image"
        )

        print(f"[EverjoyPost] topic={topic[:50]} | avatar_ref={'YES' if has_avatar else 'no'}", file=sys.stderr)

        rel_path = generate_shot(
            prompt, shot_name, aspect_ratio="1:1",
            reference_image_path=AVATAR_REF if has_avatar else None
        )

        if not rel_path:
            return None, "Imagen unavailable. Brand: EverjoyAI"

        base_path = str(BASE_DIR / "remotion-engine" / "public" / rel_path)

        try:
            final_path = _composite_everjoy_text(base_path, topic)
        except Exception as e:
            print(f"[EverjoyPost] Text composite failed: {e}", file=sys.stderr)
            final_path = base_path

        caption = (
            f"EverjoyAI\n\n"
            f"{topic}\n\n"
            f"Powered by EverjoyAI | @everjoyai"
        )
        return final_path, caption
