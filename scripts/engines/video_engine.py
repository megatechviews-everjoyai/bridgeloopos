import sys
import json
import ffmpeg # pip install ffmpeg-python
import os

def stitch_videos(clips, output_path):
    try:
        # Filter out any clips that don't exist
        valid_clips = [c for c in clips if os.path.exists(c)]
        
        if not valid_clips:
            raise Exception("No valid video files found to stitch.")

        inputs = [ffmpeg.input(c) for c in valid_clips]
        
        # Concatenate video and audio streams
        (
            ffmpeg
            .concat(*inputs, v=1, a=1)
            .output(output_path)
            .run(overwrite_output=True, quiet=True)
        )
        return True
    except Exception as e:
        print(f"STITCH_ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        clip_list = json.loads(sys.argv[1])
        out_file = sys.argv[2]
        stitch_videos(clip_list, out_file)