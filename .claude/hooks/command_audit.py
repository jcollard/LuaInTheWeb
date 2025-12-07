#!/usr/bin/env python
"""
PreToolUse Hook: Command Audit Log
Logs all Bash commands to .claude-log with timestamp, session ID, and working directory.
"""
import json
import sys
import os
from datetime import datetime

def main():
    try:
        # Read hook input from stdin
        hook_input = json.loads(sys.stdin.read())

        # Get tool information
        tool_name = hook_input.get('tool_name', '')
        tool_input = hook_input.get('tool_input', {})

        # Only process Bash tool
        if tool_name != 'Bash':
            sys.exit(0)

        # Get command details
        command = tool_input.get('command', '')
        if not command:
            sys.exit(0)

        # Get additional context
        session_id = hook_input.get('session_id', 'unknown')
        cwd = hook_input.get('cwd', '')
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', cwd)

        # Format timestamp
        timestamp = datetime.now().isoformat()

        # Prepare log entry
        log_entry = f"{timestamp} | Session: {session_id} | CWD: {cwd} | Command: {command}\n"

        # Path to log file
        log_file = os.path.join(project_dir, '.claude-log')

        # Append to log file
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry)

        # Don't modify the command, just log it
        sys.exit(0)

    except Exception as e:
        # Log error to stderr but don't block
        print(f"Error in command_audit hook: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
