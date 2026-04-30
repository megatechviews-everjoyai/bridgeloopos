"""
Image Post — Instagram 1:1 feed post generator wrapper
Called by bridge.ts via execFile.

Usage: python3 image_post.py <brand> <topic>
  brand: everjoyai | lave_gallery
  topic: free-text description / theme

Outputs: JSON line {"success": true, "path": "...", "caption": "..."}
"""
import sys
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

from skills.instagram_post import InstagramPost


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: image_post.py <brand> <topic>"}))
        sys.exit(1)

    brand = sys.argv[1]
    topic = " ".join(sys.argv[2:])

    try:
        image_path, caption = InstagramPost().generate(topic, brand)
        if image_path:
            print(json.dumps({"success": True, "path": image_path, "caption": caption}))
        else:
            print(json.dumps({"success": False, "error": caption}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))


if __name__ == "__main__":
    main()
