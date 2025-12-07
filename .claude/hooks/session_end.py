#!/usr/bin/env python3
"""
SessionEnd Hook: Save session transcript to SessionCleanup directory
Files are named with reverse-ordered timestamp so newest appears first when sorted.
"""
import json
import sys
import os
import shutil
from datetime import datetime

def main():
    try:
        # Read hook input from stdin
        hook_input = json.loads(sys.stdin.read())

        # Get session information
        session_id = hook_input.get('session_id', 'unknown')
        transcript_path = hook_input.get('transcript_path', '')
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', hook_input.get('cwd', ''))

        # Create timestamp in reverse order format (YYYYMMDD_HHMMSS)
        # This ensures newest files appear first when sorted alphabetically
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Prepare filename
        # Format: YYYYMMDD_HHMMSS_sessionid.json
        filename = f"{timestamp}_{session_id}.json"

        # Path to SessionCleanup directory
        cleanup_dir = os.path.join(project_dir, '.claude', 'SessionCleanup')

        # Ensure directory exists
        os.makedirs(cleanup_dir, exist_ok=True)

        # Destination path
        dest_path = os.path.join(cleanup_dir, filename)

        # Copy transcript if it exists
        if transcript_path and os.path.exists(transcript_path):
            shutil.copy2(transcript_path, dest_path)
            print(f"Session transcript saved to: {filename}", file=sys.stderr)
        else:
            # If no transcript, create a minimal session log
            session_data = {
                "session_id": session_id,
                "timestamp": timestamp,
                "project_dir": project_dir,
                "note": "Session ended - no transcript available"
            }

            with open(dest_path, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2)

            print(f"Session log created: {filename}", file=sys.stderr)

        sys.exit(0)

    except Exception as e:
        # Log error to stderr but don't block session end
        print(f"Error in session_end hook: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
