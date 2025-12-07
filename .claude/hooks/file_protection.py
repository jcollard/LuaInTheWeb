#!/usr/bin/env python3
"""
PreToolUse Hook: File Protection
Parses .claude-ignore file and blocks Read/Edit operations on matching files.
Also protects .claude-ignore itself from modification.
"""
import json
import sys
import os
import fnmatch
from pathlib import Path

def parse_ignore_file(ignore_file_path):
    """
    Parse .claude-ignore file and return list of patterns.
    Similar to .gitignore syntax.
    """
    patterns = []

    if not os.path.exists(ignore_file_path):
        return patterns

    try:
        with open(ignore_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                patterns.append(line)
    except Exception as e:
        print(f"Warning: Could not parse .claude-ignore: {e}", file=sys.stderr)

    return patterns

def normalize_path(path, project_dir):
    """
    Normalize a file path to be relative to project directory.
    Handles both absolute and relative paths.
    """
    try:
        # Convert to absolute path
        abs_path = os.path.abspath(path)
        # Make it relative to project directory
        rel_path = os.path.relpath(abs_path, project_dir)
        # Normalize path separators
        rel_path = rel_path.replace('\\', '/')
        return rel_path
    except Exception:
        # If normalization fails, return the original path
        return path.replace('\\', '/')

def matches_pattern(file_path, patterns, project_dir):
    """
    Check if file_path matches any of the ignore patterns.
    Supports:
    - Exact matches: .env
    - Wildcards: *.log
    - Directory matches: node_modules/
    - Glob patterns: **/*.tmp
    """
    # Normalize the file path
    normalized_path = normalize_path(file_path, project_dir)

    for pattern in patterns:
        # Remove trailing slash for directory patterns
        pattern = pattern.rstrip('/')

        # Check if pattern matches
        # Direct match
        if normalized_path == pattern or normalized_path.startswith(pattern + '/'):
            return True, pattern

        # Wildcard match using fnmatch
        if fnmatch.fnmatch(normalized_path, pattern):
            return True, pattern

        # Check if any parent directory matches
        path_parts = normalized_path.split('/')
        for i in range(len(path_parts)):
            partial_path = '/'.join(path_parts[:i+1])
            if fnmatch.fnmatch(partial_path, pattern):
                return True, pattern

        # Handle ** glob patterns
        if '**' in pattern:
            # Convert ** pattern to regex-like matching
            pattern_parts = pattern.split('**')
            if len(pattern_parts) == 2:
                start, end = pattern_parts
                start = start.rstrip('/')
                end = end.lstrip('/')

                # Check if path starts with start pattern and ends with end pattern
                if (not start or normalized_path.startswith(start)) and \
                   (not end or normalized_path.endswith(end) or ('/' + end + '/') in normalized_path or normalized_path.endswith('/' + end)):
                    return True, pattern

    return False, None

def main():
    try:
        # Read hook input from stdin
        hook_input = json.loads(sys.stdin.read())

        # Get tool information
        tool_name = hook_input.get('tool_name', '')
        tool_input = hook_input.get('tool_input', {})

        # Only process Read and Edit tools
        if tool_name not in ['Read', 'Edit', 'Write']:
            sys.exit(0)

        # Get the file path being accessed
        file_path = tool_input.get('file_path', '')
        if not file_path:
            sys.exit(0)

        # Get the project directory
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', hook_input.get('cwd', ''))

        # Always protect .claude-ignore from modification
        normalized_path = normalize_path(file_path, project_dir)
        if '.claude-ignore' in normalized_path or normalized_path.endswith('.claude-ignore'):
            if tool_name in ['Edit', 'Write']:
                output = {
                    "decision": "block",
                    "reason": "File protection policy: .claude-ignore is protected from modification",
                    "continue": False,
                    "stopReason": f"Protected file: .claude-ignore cannot be modified",
                    "permissionDecision": "deny"
                }
                print(json.dumps(output))
                sys.exit(2)  # Exit code 2 blocks the action

        # Parse .claude-ignore file
        ignore_file_path = os.path.join(project_dir, '.claude-ignore')
        patterns = parse_ignore_file(ignore_file_path)

        # If no patterns, allow all
        if not patterns:
            sys.exit(0)

        # Check if file matches any pattern
        is_match, matched_pattern = matches_pattern(file_path, patterns, project_dir)

        if is_match:
            # Block the operation
            output = {
                "decision": "block",
                "reason": f"File protection policy: '{file_path}' matches ignore pattern '{matched_pattern}'",
                "continue": False,
                "stopReason": f"Protected file: {file_path}",
                "permissionDecision": "deny"
            }
            print(json.dumps(output))
            sys.exit(2)  # Exit code 2 blocks the action

        # Allow the operation
        sys.exit(0)

    except Exception as e:
        # Log error to stderr but don't block
        print(f"Error in file_protection hook: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
