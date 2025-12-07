#!/usr/bin/env python
"""
PermissionRequest Hook: Auto-approve certain operations
- Read operations for markdown/documentation files
- WebSearch tool operations
"""
import json
import sys
import os

# Documentation file extensions to auto-approve
DOCS_EXTENSIONS = (
    '.md', '.mdx', '.txt', '.rst', '.asciidoc', '.adoc',
    '.markdown', '.mdown', '.mkdn', '.mkd'
)

def main():
    try:
        # Read hook input from stdin
        hook_input = json.loads(sys.stdin.read())

        # Get tool information
        tool_name = hook_input.get('tool_name', '')
        tool_input = hook_input.get('tool_input', {})

        # Debug logging to stderr
        print(f"[auto_approve] Called for tool: {tool_name}", file=sys.stderr)
        print(f"[auto_approve] Tool input: {json.dumps(tool_input)}", file=sys.stderr)

        # Auto-approve WebSearch operations
        if tool_name == 'WebSearch':
            print(f"[auto_approve] Auto-approving WebSearch", file=sys.stderr)
            # Output JSON to auto-approve
            output = {
                "decision": "approve",
                "permissionDecision": "allow",
                "reason": "WebSearch operations are auto-approved"
            }
            print(json.dumps(output))
            sys.exit(0)

        # Auto-approve Read operations for documentation files
        if tool_name == 'Read':
            file_path = tool_input.get('file_path', '')

            # Check if it's a documentation file
            if any(file_path.lower().endswith(ext) for ext in DOCS_EXTENSIONS):
                print(f"[auto_approve] Auto-approving Read for doc file: {file_path}", file=sys.stderr)
                # Exit 0 with no output = allow
                sys.exit(0)

        # For other operations, let normal permission flow continue
        print(f"[auto_approve] No auto-approve rule matched, allowing normal flow", file=sys.stderr)
        sys.exit(0)

    except Exception as e:
        # Log error to stderr but don't block
        print(f"Error in auto_approve hook: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
