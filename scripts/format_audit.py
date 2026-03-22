#!/usr/bin/env python3
import sys
import os

def format_audit(raw_file_path):
    if not os.path.exists(raw_file_path):
        return "Error: Raw audit file not found."
    
    with open(raw_file_path, 'r') as f:
        content = f.read()

    # The "Vibe-Coded" Script Template
    formatted_script = f"""# MegaViews Audit: {os.path.basename(raw_file_path).replace('.md', '')}
    
## [INTRO - The Hook]
(Energy: High. Aesthetic: Vibe-coded tech.)
"We're diving deep into the infrastructure of this business. No fluff, just the code and the strategy that scales."

## [THE ANALYSIS]
{content}

## [THE VIBE CHECK]
- Efficiency Score: [Auto-calculated]
- Scalability: [High/Medium/Low]

## [OUTRO]
"That's the audit. Build fast, stay aesthetic. See you in the next one."
"""
    
    output_path = raw_file_path.replace('context/', 'outputs/megaviews-media/')
    with open(output_path, 'w') as f:
        f.write(formatted_script)
    
    return f"✅ Audit script generated at: {output_path}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(format_audit(sys.argv[1]))