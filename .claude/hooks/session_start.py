#!/usr/bin/env python3
"""
SessionStart Hook: Injects OnConversationStart.md content at session start
"""
import json
import sys
import os

def main():
    try:
        # Read hook input from stdin
        hook_input = json.loads(sys.stdin.read())

        # Get the project directory
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', hook_input.get('cwd', ''))

        # Path to the OnConversationStart.md file
        context_file = os.path.join(project_dir, '.claude', 'OnConversationStart.md')

        # Check if file exists
        if not os.path.exists(context_file):
            # Silent fail - don't inject anything if file doesn't exist
            sys.exit(0)

        # Read the context file
        with open(context_file, 'r', encoding='utf-8') as f:
            context_content = f.read()

        # Return the content to inject into the conversation
        output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": context_content
            }
        }

        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        # Log error to stderr but don't block
        print(f"Error in session_start hook: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
