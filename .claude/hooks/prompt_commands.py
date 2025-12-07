#!/usr/bin/env python3
"""
UserPromptSubmit Hook: Detects special commands and injects corresponding markdown content.
Supported commands: !new-feature, !code-review, !tdd, !mutation-test
"""
import json
import sys
import os
import re

# Command to markdown file mapping
COMMANDS = {
    '!new-feature': 'OnNewFeature.md',
    '!code-review': 'OnCodeReview.md',
    '!tdd': 'OnTDD.md',
    '!mutation-test': 'OnMutationTesting.md'
}

def main():
    try:
        # Read hook input from stdin
        hook_input = json.loads(sys.stdin.read())

        # Get the user prompt from the input
        # The exact field name may vary, check common locations
        user_prompt = hook_input.get('user_prompt', '')
        if not user_prompt:
            # Try alternative field names
            user_prompt = hook_input.get('prompt', '')
            user_prompt = hook_input.get('message', user_prompt)

        # Get the project directory
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', hook_input.get('cwd', ''))

        # Check for command presence
        command_found = None
        for cmd in COMMANDS:
            if cmd in user_prompt:
                command_found = cmd
                break

        # If no command found, pass through
        if not command_found:
            sys.exit(0)

        # Get the corresponding markdown file
        markdown_file = COMMANDS[command_found]
        markdown_path = os.path.join(project_dir, '.claude', markdown_file)

        # Check if file exists
        if not os.path.exists(markdown_path):
            # Log warning but don't block
            print(f"Warning: {markdown_file} not found at {markdown_path}", file=sys.stderr)
            sys.exit(0)

        # Read the markdown content
        with open(markdown_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()

        # Return the markdown content as additional context
        # Note: UserPromptSubmit hooks cannot modify the prompt itself
        # The command will remain in the prompt, but the content will be injected
        output = {
            "hookSpecificOutput": {
                "hookEventName": "UserPromptSubmit",
                "additionalContext": markdown_content
            }
        }

        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        # Log error to stderr but don't block
        print(f"Error in prompt_commands hook: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
