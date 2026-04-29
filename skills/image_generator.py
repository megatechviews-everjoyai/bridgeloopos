"""
Nano Banana Image Generator
Uses Vertex AI Imagen (Google) to generate photorealistic shots per scene description.
Falls back gracefully if credentials or model are unavailable.
"""

import os
import base64
import datetime
import requests
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SHOTS_DIR = BASE_DIR / "remotion-engine" / "public" / "shots"
SHOTS_DIR.mkdir(parents=True, exist_ok=True)

IMAGEN_MODEL   = "imagen-3.0-generate-001"
IMAGEN_REGION  = os.getenv("GCP_LOCATION", "us-central1")

def _get_project_id():
    """Read project_id from service account JSON (most reliable source)."""
    cred_path = BASE_DIR / "everjoy_service_account.json"
    if cred_path.exists():
        try:
            import json
            data = json.loads(cred_path.read_text())
            return data.get("project_id", os.getenv("GCP_PROJECT_ID", "bridgeloop-os"))
        except Exception:
            pass
    return os.getenv("GCP_PROJECT_ID", "bridgeloop-os")

IMAGEN_PROJECT = _get_project_id()


def _get_access_token():
    """Get a short-lived OAuth2 token from the service account."""
    cred_path = BASE_DIR / "everjoy_service_account.json"
    if not cred_path.exists():
        return None
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests
        creds = service_account.Credentials.from_service_account_file(
            str(cred_path),
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        req = google.auth.transport.requests.Request()
        creds.refresh(req)
        return creds.token
    except Exception as e:
        print(f"[ImageGen] Auth failed: {e}")
        return None


def generate_shot(description: str, shot_name: str, aspect_ratio: str = "16:9"):
    """
    Generate one photorealistic shot via Imagen.
    Returns local file path (relative to remotion-engine/public/) or None on failure.
    """
    token = _get_access_token()
    if not token:
        print(f"[ImageGen] No token — skipping real image for: {shot_name}")
        return None

    url = (
        f"https://{IMAGEN_REGION}-aiplatform.googleapis.com/v1/"
        f"projects/{IMAGEN_PROJECT}/locations/{IMAGEN_REGION}/"
        f"publishers/google/models/{IMAGEN_MODEL}:predict"
    )

    payload = {
        "instances": [{"prompt": description}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": aspect_ratio,
            "outputMimeType": "image/jpeg",
            "enhancePrompt": True,
        },
    }

    try:
        resp = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        b64 = data["predictions"][0]["bytesBase64Encoded"]
        filename = f"{shot_name}.jpg"
        filepath = SHOTS_DIR / filename
        filepath.write_bytes(base64.b64decode(b64))
        import sys as _sys
        print(f"[ImageGen] ✅ {shot_name} → {filepath}", file=_sys.stderr)
        return f"shots/{filename}"  # relative to public/
    except Exception as e:
        import sys as _sys
        print(f"[ImageGen] ❌ {shot_name} failed: {e}", file=_sys.stderr)
        return None


# ─── Shot planner ─────────────────────────────────────────────────────────────

CAMERA_STYLE = (
    "Ultra-photorealistic, 8K cinematic photography, dramatic lighting, "
    "shallow depth of field, film grain, anamorphic lens flare, "
    "professional color grade"
)

SHOT_TEMPLATES = {
    "establishing": "{subject}, extreme wide angle establishing shot, "
                    "sweeping aerial perspective, golden hour lighting. " + CAMERA_STYLE,

    "drone":        "{subject}, top-down drone shot descending slowly, "
                    "vast landscape visible, cinematic scale. " + CAMERA_STYLE,

    "tracking":     "{subject}, side-on tracking shot, subject in motion, "
                    "background blur from movement, dynamic perspective. " + CAMERA_STYLE,

    "close_detail": "{subject}, extreme close-up macro detail shot, "
                    "razor-sharp focus on textures and surfaces. " + CAMERA_STYLE,

    "hero":         "{subject}, low-angle hero shot looking up, "
                    "dramatic silhouette against sky, god rays. " + CAMERA_STYLE,

    "atmosphere":   "Cinematic atmospheric shot of the environment surrounding {subject}, "
                    "volumetric fog and light rays, immersive depth. " + CAMERA_STYLE,
}


def plan_shots(prompt: str):
    """
    Analyse the prompt and return an ordered shot list.
    Each entry: {name, description, camera_type, duration_frames}
    """
    p = prompt.lower()
    subject = _extract_subject(prompt)

    def shot(name: str, template_key: str, camera: str, frames: int) -> dict:
        return {
            "name": name,
            "description": SHOT_TEMPLATES[template_key].format(subject=subject),
            "camera_type": camera,
            "duration_frames": frames,
        }

    # Always open with drone establishing + close with hero reveal
    shots = [shot("shot_01_establishing", "establishing", "drone_descend",  48)]

    # Middle shots — 2-3 based on prompt content
    if any(w in p for w in ["movement", "action", "running", "flying", "chase", "motion"]):
        shots.append(shot("shot_02_tracking", "tracking",    "tracking",      36))
    else:
        shots.append(shot("shot_02_atmosphere", "atmosphere", "pan_right",    36))

    shots.append(shot("shot_03_detail", "close_detail", "zoom_in",           30))

    # Warp zoom climax before title
    shots.append(shot("shot_04_hero",   "hero",         "warp_zoom",         36))

    return shots


def _extract_subject(prompt: str) -> str:
    """Pull the core subject phrase for use in shot prompts."""
    stop = {"a", "an", "the", "of", "in", "on", "with", "at", "for",
            "cinematic", "shot", "dramatic", "4k", "hd", "ultra", "create"}
    words = [w for w in prompt.split() if w.lower() not in stop]
    return " ".join(words[:8]) if words else prompt[:60]


def generate_all_shots(prompt: str):
    """
    Run the full shot generation pipeline.
    Returns shot list with 'image_path' filled in (or None if Imagen unavailable).
    """
    import time
    shots = plan_shots(prompt)
    import sys as _sys
    print(f"[ImageGen] Planning {len(shots)} shots for: {prompt[:60]}", file=_sys.stderr)
    for i, s in enumerate(shots):
        if i > 0:
            time.sleep(3)  # avoid Imagen rate limits
        s["image_path"] = generate_shot(s["description"], s["name"])
    return shots
