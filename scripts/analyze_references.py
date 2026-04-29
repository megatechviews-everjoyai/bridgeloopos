#!/usr/bin/env python3
"""
analyze_references.py — Called by src/index.ts after /setmyface or /setavatar

Usage:
  python3 scripts/analyze_references.py <ref_type> <image1.jpg> [image2.jpg ...]

ref_type: "face" or "avatar"

Analyzes all images via Gemini Vision and saves a locked description to
backend/references/<ref_type>_description.json
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

if len(sys.argv) < 3:
    print("❌ Usage: analyze_references.py <ref_type> <image1> [image2 ...]")
    sys.exit(1)

ref_type    = sys.argv[1]
image_paths = sys.argv[2:]

gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not gemini_key:
    print("❌ GEMINI_API_KEY not set in .env")
    sys.exit(1)

from skills.reference_analyzer import ReferenceAnalyzer

analyzer    = ReferenceAnalyzer(gemini_key)
description = analyzer.analyze_references(image_paths, ref_type)

if "error" in description:
    print(f"❌ Analysis error: {description['error']}")
    sys.exit(1)

saved_path = analyzer.save_description(description, ref_type)
print(f"✅ {ref_type.upper()} identity locked — {len(image_paths)} image(s) analyzed")
print(f"Saved: {saved_path}")
print(f"Generation prompt: {description.get('generation_prompt', 'N/A')}")
