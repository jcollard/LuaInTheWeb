"""Visual verification parsing and screenshot capture for PR reviews.

This module handles:
- Parsing the Visual Verification section from issue bodies
- Running the screenshot capture utility
- Uploading screenshots as PR comments
"""

import os
import re
import json
import subprocess
from pathlib import Path
from .helpers import run, get_repo_root, get_temp_dir, BLUE, GREEN, YELLOW, RED, NC

# Timeout for screenshot capture subprocess (configurable via environment variable)
SCREENSHOT_CAPTURE_TIMEOUT = int(os.environ.get('SCREENSHOT_CAPTURE_TIMEOUT', 300))


def parse_visual_verification(body):
    """Parse Visual Verification section from an issue body.

    The Visual Verification section should follow this format:

    ## Visual Verification
    - /editor - Editor page initial state
    - /repl - REPL with some commands executed

    Or with subsections:

    ## Visual Verification
    ### Routes
    - /editor
    - /repl

    ### Expected Behavior
    - Editor should show welcome screen
    - REPL should show prompt

    Args:
        body: The issue body text

    Returns:
        Dict with 'routes' (list of route strings) and 'notes' (list of strings).
        Returns None if no Visual Verification section found.
    """
    if not body:
        return None

    # Find the Visual Verification section
    # Match "## Visual Verification" and capture everything until next ## (level 2) or end
    # Use MULTILINE mode with ^ anchor, allow optional leading whitespace before ##
    pattern = r'##\s*Visual\s+Verification\s*\n(.*?)(?=^\s*##\s|\Z)'
    match = re.search(pattern, body, re.IGNORECASE | re.DOTALL | re.MULTILINE)

    if not match:
        return None

    section_content = match.group(1).strip()

    result = {
        'routes': [],
        'notes': [],
    }

    # If section is empty, return empty result (not None - section exists but is empty)
    if not section_content:
        return result

    # Parse routes - look for lines starting with - / or * /
    # Route patterns: /, /path, /path/subpath, etc.
    # The route can be just "/" or "/something"
    route_pattern = r'^\s*[-*]\s*(/(?:\S*)?)'
    for line in section_content.split('\n'):
        route_match = re.match(route_pattern, line)
        if route_match:
            route = route_match.group(1)
            # Clean up any trailing description (e.g., "/editor - description")
            # But handle "/" specially - it has no content after the slash
            if route == '/':
                result['routes'].append(route)
            else:
                route = route.split()[0] if ' ' in route else route
                result['routes'].append(route)
        elif line.strip() and not line.strip().startswith('#'):
            # Non-empty, non-header line that's not a route = note
            # Remove leading - or *
            note = re.sub(r'^\s*[-*]\s*', '', line).strip()
            if note and not note.startswith('/'):
                result['notes'].append(note)

    # If no routes found but section exists, return empty result (not None)
    # This indicates section was present but no specific routes
    return result if result['routes'] or result['notes'] else {'routes': [], 'notes': []}


def capture_screenshots(routes, output_dir=None, skip_build=False):
    """Capture screenshots for the specified routes.

    Args:
        routes: List of route strings (e.g., ['/editor', '/repl'])
        output_dir: Output directory for screenshots (default: .tmp/screenshots)
        skip_build: Skip building the app if True

    Returns:
        Dict with 'success' (bool), 'output_dir' (str), 'screenshots' (list),
        and 'error' (str if failed).
    """
    if not routes:
        return {
            'success': False,
            'error': 'No routes specified',
            'screenshots': [],
        }

    repo_root = get_repo_root()
    if not repo_root:
        return {
            'success': False,
            'error': 'Not in a git repository',
            'screenshots': [],
        }

    npm_dir = repo_root / 'lua-learning-website'
    script_path = npm_dir / 'scripts' / 'capture-screenshots.js'

    if not script_path.exists():
        return {
            'success': False,
            'error': f'Screenshot script not found: {script_path}',
            'screenshots': [],
        }

    # Default output directory
    if output_dir is None:
        output_dir = get_temp_dir() / 'screenshots'

    # Build command
    cmd_parts = ['node', str(script_path)]

    if skip_build:
        cmd_parts.append('--no-build')

    cmd_parts.extend(['--output-dir', str(output_dir)])
    cmd_parts.extend(routes)

    cmd = ' '.join(cmd_parts)

    print(f"{BLUE}Capturing screenshots...{NC}")
    print(f"  Routes: {', '.join(routes)}")

    result = subprocess.run(
        cmd,
        shell=True,
        cwd=str(npm_dir),
        capture_output=True,
        text=True,
        timeout=SCREENSHOT_CAPTURE_TIMEOUT,
    )

    # Parse JSON output from the script
    output = result.stdout + result.stderr
    json_output = None

    # Extract JSON from output (between --- JSON OUTPUT --- and --- END JSON ---)
    json_match = re.search(r'--- JSON OUTPUT ---\n(.*?)\n--- END JSON ---', output, re.DOTALL)
    if json_match:
        try:
            json_output = json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    if result.returncode != 0:
        screenshots = json_output.get('screenshots', []) if json_output else []
        return {
            'success': False,
            'error': f'Screenshot capture failed with exit code {result.returncode}',
            'output_dir': str(output_dir),
            'screenshots': screenshots,
        }

    return {
        'success': True,
        'output_dir': str(output_dir),
        'screenshots': json_output.get('screenshots', []) if json_output else [],
    }


def upload_screenshots_to_pr(pr_number, screenshots, analysis=None):
    """Upload screenshots to a PR as comments.

    This function uploads each screenshot as an image in a PR comment.
    GitHub will host the images when uploaded via the API.

    Args:
        pr_number: The PR number to comment on
        screenshots: List of screenshot dicts with 'filepath', 'route', 'success'
        analysis: Optional analysis text to include in the comment

    Returns:
        Dict with 'success' (bool) and 'comment_url' (str if successful).
    """
    if not screenshots:
        return {
            'success': False,
            'error': 'No screenshots to upload',
        }

    successful_screenshots = [s for s in screenshots if s.get('success', False)]
    if not successful_screenshots:
        return {
            'success': False,
            'error': 'No successful screenshots to upload',
        }

    # Build comment body with screenshot paths
    # Note: For actual image embedding, we'd need to use GitHub's API to upload
    # assets. For now, we'll reference the local paths and note they need manual upload.
    lines = ['## Visual Verification Screenshots', '']

    if analysis:
        lines.append('### Analysis')
        lines.append(analysis)
        lines.append('')

    lines.append('### Captured Screenshots')
    lines.append('')

    for screenshot in successful_screenshots:
        route = screenshot.get('route', 'unknown')
        filepath = screenshot.get('filepath', '')
        filename = screenshot.get('filename', Path(filepath).name if filepath else 'screenshot.png')
        lines.append(f'**Route: `{route}`**')
        lines.append(f'- File: `{filename}`')
        lines.append('')

    lines.append('---')
    lines.append('*Screenshots captured during PR review. '
                 'Attach images manually if visual verification is needed.*')

    comment_body = '\n'.join(lines)

    # Write comment body to temp file
    temp_dir = get_temp_dir()
    if temp_dir:
        comment_file = temp_dir / f'pr-{pr_number}-screenshots.txt'
        comment_file.write_text(comment_body, encoding='utf-8')

        # Post comment using gh
        cmd = f'gh pr comment {pr_number} --body-file "{comment_file}"'
        output, err = run(cmd, check=False)

        if output is None and err:
            return {
                'success': False,
                'error': f'Failed to post comment: {err}',
            }

        return {
            'success': True,
            'comment_body': comment_body,
        }

    return {
        'success': False,
        'error': 'Could not create temp file for comment',
    }


def run_visual_verification(issue_number, pr_number=None, skip_build=False):
    """Run the full visual verification workflow.

    1. Fetch issue body
    2. Parse Visual Verification section
    3. Capture screenshots
    4. Optionally upload to PR

    Args:
        issue_number: The issue number to get Visual Verification from
        pr_number: Optional PR number to upload screenshots to
        skip_build: Skip building the app if True

    Returns:
        Dict with workflow results.
    """
    print(f"{BLUE}Running visual verification for issue #{issue_number}...{NC}")

    # Fetch issue body
    output, err = run(f'gh issue view {issue_number} --json body', check=False)
    if not output:
        print(f"{YELLOW}Could not fetch issue #{issue_number}{NC}")
        return {
            'success': False,
            'error': f'Could not fetch issue: {err}',
            'skipped': True,
        }

    try:
        issue_data = json.loads(output)
        body = issue_data.get('body', '')
    except json.JSONDecodeError:
        return {
            'success': False,
            'error': 'Invalid JSON from GitHub',
            'skipped': True,
        }

    # Parse Visual Verification section
    verification = parse_visual_verification(body)

    if verification is None:
        print(f"{YELLOW}No Visual Verification section found in issue #{issue_number}{NC}")
        return {
            'success': True,
            'skipped': True,
            'reason': 'No Visual Verification section in issue',
        }

    routes = verification.get('routes', [])
    if not routes:
        print(f"{YELLOW}No routes specified in Visual Verification section{NC}")
        return {
            'success': True,
            'skipped': True,
            'reason': 'No routes specified in Visual Verification section',
        }

    print(f"  Found {len(routes)} route(s) to capture")

    # Capture screenshots
    capture_result = capture_screenshots(routes, skip_build=skip_build)

    if not capture_result.get('success'):
        print(f"{RED}Screenshot capture failed: {capture_result.get('error')}{NC}")
        # Continue anyway - this is non-blocking
        return {
            'success': True,  # Don't block PR creation
            'capture_failed': True,
            'error': capture_result.get('error'),
            'screenshots': capture_result.get('screenshots', []),
        }

    screenshots = capture_result.get('screenshots', [])
    successful = [s for s in screenshots if s.get('success')]

    print(f"{GREEN}Captured {len(successful)}/{len(screenshots)} screenshot(s){NC}")

    result = {
        'success': True,
        'output_dir': capture_result.get('output_dir'),
        'screenshots': screenshots,
        'routes': routes,
        'notes': verification.get('notes', []),
    }

    # Upload to PR if specified
    if pr_number and successful:
        print(f"{BLUE}Uploading screenshots to PR #{pr_number}...{NC}")
        upload_result = upload_screenshots_to_pr(pr_number, screenshots)
        result['upload'] = upload_result

    return result
