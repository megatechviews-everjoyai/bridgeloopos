#!/usr/bin/env python3
"""
Everjoy Skill Runner — Python Subagent Dispatcher
==================================================
Called by src/index.ts via execFileSync to route to the correct Python
skill subagent. Each skill prints its result to stdout.

Usage:
  python3 scripts/skill_runner.py <skill> <prompt...>

Skills:
  gapfinder   — Market gap analysis (Gapfinder)
  executer    — Offer/task refinement (Executer)
  webbuilder  — React/Framer Motion component (WebBuilder)
  thumbnail   — Aesthetic style guide (CalliArt)
"""

import sys
import os

# Allow imports from workspace root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

if len(sys.argv) < 3:
    print("❌ Usage: skill_runner.py <skill> <prompt>")
    sys.exit(1)

skill  = sys.argv[1].lower().strip()
prompt = " ".join(sys.argv[2:])

try:
    if skill == "gapfinder":
        from skills.gapfinder import Gapfinder
        result = Gapfinder().analyze_market(prompt)

    elif skill == "executer":
        from skills.executer import Executer
        result = Executer().refine_offer(prompt)

    elif skill == "webbuilder":
        from skills.web_builder import WebBuilder
        file_path = WebBuilder().create_motion_component(prompt)
        result = (
            f"✅ *Web Component Generated*\n\n"
            f"Component saved to:\n`{file_path}`\n\n"
            f"Drop the `.tsx` file directly into your Lovable project."
        )

    elif skill == "thumbnail":
        # argv[2] = mode ("face" or "avatar"), argv[3:] = topic
        mode  = sys.argv[2] if len(sys.argv) > 2 else "avatar"
        topic = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else prompt
        from skills.thumbnail_generator import ThumbnailGenerator
        image_path, caption = ThumbnailGenerator().generate(topic, mode)
        if image_path:
            result = f"__IMAGE__{image_path}\n{caption}"
        else:
            result = caption

    else:
        result = f"❌ Unknown skill: `{skill}`\nAvailable: gapfinder | executer | webbuilder | thumbnail"

    print(result)

except Exception as e:
    print(f"❌ Skill `{skill}` failed: {str(e)}")
    sys.exit(1)
