#!/usr/bin/env python
"""
Update an existing GitHub pull request.

Usage:
  python scripts/update-pr.py <pr-number> commit [options]     # Add commits to PR
  python scripts/update-pr.py <pr-number> update-body [options] # Update PR description
  python scripts/update-pr.py <pr-number> comment [options]     # Add comment to PR

Subcommands:
  commit       Stage all changes, create commit, and push to PR branch
  update-body  Update the PR title and/or body
  comment      Add a comment to the PR

Options for 'commit':
  --message "..."       Commit message (inline)
  --message-file PATH   Commit message from file (recommended for agents)
  --skip-checks         Skip tests, lint, and build checks
  --dry-run             Show what would happen without doing it

Options for 'update-body':
  --title "..."         New PR title
  --body "..."          New PR body (inline)
  --body-file PATH      New PR body from file (recommended for agents)
  --append              Append to existing body instead of replacing

Options for 'comment':
  --body "..."          Comment text (inline)
  --body-file PATH      Comment text from file (recommended for agents)

Note: File-based inputs take precedence over inline arguments and are
recommended for agent use to avoid shell escaping issues.

Safety features:
- Will NOT run on main/master branch
- Will NOT commit if tests fail (unless --skip-checks)
- Validates PR exists and is open before making changes
"""

import sys
import json
from pathlib import Path

from lib.helpers import (
    RED, GREEN, YELLOW, BLUE, NC,
    run, get_repo_root, get_temp_dir, get_current_branch,
    get_staged_files, get_unstaged_changes, get_untracked_files,
    read_file_content, run_tests, run_lint, run_build,
    stage_all_changes, push_branch,
)


def get_pr_info(pr_number):
    """Fetch PR information from GitHub."""
    output, err = run(
        f'gh pr view {pr_number} --json number,title,body,state,headRefName,baseRefName,url',
        check=False
    )
    if not output:
        return None, err
    try:
        return json.loads(output), None
    except json.JSONDecodeError:
        return None, "Invalid JSON from GitHub"


def create_commit(message):
    """Create a commit with the given message."""
    # Use local temp directory for the commit message to handle special characters
    temp_dir = get_temp_dir()
    temp_file = temp_dir / "commit-msg.txt"
    temp_file.write_text(message, encoding='utf-8')

    try:
        output, err = run(f'git commit -F "{temp_file}"')
        success = output is not None or (err and "nothing to commit" not in err.lower())
        return success, message
    finally:
        temp_file.unlink(missing_ok=True)


def update_pr_body(pr_number, title=None, body=None, append=False):
    """Update PR title and/or body."""
    args = []

    if title:
        args.append(f'--title "{title}"')

    if body:
        if append:
            # Get existing body first
            pr_info, _ = get_pr_info(pr_number)
            if pr_info and pr_info.get('body'):
                body = pr_info['body'] + "\n\n---\n\n" + body

        # Use local temp directory for body
        temp_dir = get_temp_dir()
        temp_file = temp_dir / f"pr-body-{pr_number}.txt"
        temp_file.write_text(body, encoding='utf-8')

        try:
            args.append(f'--body-file "{temp_file}"')
            cmd = f'gh pr edit {pr_number} {" ".join(args)}'
            output, err = run(cmd, check=False)
            return output is not None or err == "", err
        finally:
            temp_file.unlink(missing_ok=True)
    elif args:
        cmd = f'gh pr edit {pr_number} {" ".join(args)}'
        output, err = run(cmd, check=False)
        return output is not None or err == "", err

    return False, "No title or body provided"


def add_pr_comment(pr_number, body):
    """Add a comment to the PR."""
    # Use local temp directory for comment body
    temp_dir = get_temp_dir()
    temp_file = temp_dir / f"pr-comment-{pr_number}.txt"
    temp_file.write_text(body, encoding='utf-8')

    try:
        output, err = run(f'gh pr comment {pr_number} --body-file "{temp_file}"', check=False)
        return output is not None or err == "", err
    finally:
        temp_file.unlink(missing_ok=True)


def parse_args():
    """Parse command line arguments."""
    args = {
        'pr_number': None,
        'subcommand': None,
        'message': None,
        'message_file': None,
        'title': None,
        'body': None,
        'body_file': None,
        'append': False,
        'skip_checks': False,
        'dry_run': False
    }

    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]

        if arg == '--message' and i + 1 < len(sys.argv):
            args['message'] = sys.argv[i + 1]
            i += 2
        elif arg == '--message-file' and i + 1 < len(sys.argv):
            args['message_file'] = sys.argv[i + 1]
            i += 2
        elif arg == '--title' and i + 1 < len(sys.argv):
            args['title'] = sys.argv[i + 1]
            i += 2
        elif arg == '--body' and i + 1 < len(sys.argv):
            args['body'] = sys.argv[i + 1]
            i += 2
        elif arg == '--body-file' and i + 1 < len(sys.argv):
            args['body_file'] = sys.argv[i + 1]
            i += 2
        elif arg == '--append':
            args['append'] = True
            i += 1
        elif arg == '--skip-checks':
            args['skip_checks'] = True
            i += 1
        elif arg == '--dry-run':
            args['dry_run'] = True
            i += 1
        elif arg.isdigit() and args['pr_number'] is None:
            args['pr_number'] = arg
            i += 1
        elif arg in ['commit', 'update-body', 'comment'] and args['subcommand'] is None:
            args['subcommand'] = arg
            i += 1
        else:
            i += 1

    # File-based inputs take precedence
    if args['message_file']:
        file_content = read_file_content(args['message_file'])
        if file_content:
            args['message'] = file_content

    if args['body_file']:
        file_content = read_file_content(args['body_file'])
        if file_content:
            args['body'] = file_content

    return args


def print_usage():
    """Print usage information."""
    print(f"Usage: python {sys.argv[0]} <pr-number> <subcommand> [options]")
    print()
    print("Subcommands:")
    print("  commit       Stage changes, create commit, push to PR")
    print("  update-body  Update PR title and/or description")
    print("  comment      Add a comment to the PR")
    print()
    print("Options for 'commit':")
    print("  --message \"...\"       Commit message (inline)")
    print("  --message-file PATH   Commit message from file (recommended)")
    print("  --skip-checks         Skip tests, lint, and build checks")
    print("  --dry-run             Show what would happen without doing it")
    print()
    print("Options for 'update-body':")
    print("  --title \"...\"         New PR title")
    print("  --body \"...\"          New PR body (inline)")
    print("  --body-file PATH      New PR body from file (recommended)")
    print("  --append              Append to existing body instead of replacing")
    print()
    print("Options for 'comment':")
    print("  --body \"...\"          Comment text (inline)")
    print("  --body-file PATH      Comment text from file (recommended)")


def cmd_commit(args, pr_info):
    """Handle the commit subcommand."""
    repo_root = get_repo_root()
    if not repo_root:
        print(f"{RED}Error: Not in a git repository{NC}")
        return 1

    npm_dir = repo_root / "lua-learning-website"

    # Check current branch matches PR branch
    branch = get_current_branch()
    pr_branch = pr_info['headRefName']

    if branch != pr_branch:
        print(f"{RED}Error: Current branch '{branch}' doesn't match PR branch '{pr_branch}'{NC}")
        print(f"Checkout the PR branch first: git checkout {pr_branch}")
        return 1

    # Safety: Never run on main/master
    if branch in ['main', 'master']:
        print(f"{RED}Error: Cannot run on {branch} branch{NC}")
        return 1

    # Check for changes
    unstaged = get_unstaged_changes()
    untracked = get_untracked_files()
    staged = get_staged_files()

    has_changes = any([
        unstaged and unstaged != [''],
        untracked and untracked != [''],
        staged and staged != ['']
    ])

    if not has_changes:
        print(f"{YELLOW}No changes to commit{NC}")
        return 0

    # Get commit message
    message = args['message']
    if not message:
        print(f"{RED}Error: Commit message required{NC}")
        print("Use --message \"...\" or --message-file PATH")
        return 1

    # Append standard footer (ASCII-safe, no emoji for Windows compatibility)
    if "Generated with [Claude Code]" not in message:
        message += "\n\nGenerated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

    # Run checks (unless skipped)
    if not args['skip_checks'] and npm_dir.exists():
        print(f"{BLUE}Running validation checks...{NC}")
        print()

        tests_pass, test_output = run_tests(npm_dir)
        if tests_pass:
            print(f"  Tests: {GREEN}[PASS]{NC}")
        else:
            print(f"  Tests: {RED}[FAIL]{NC}")
            print(f"\n{test_output}")
            print(f"\n{RED}Error: Tests must pass before committing{NC}")
            return 1

        lint_pass, lint_output = run_lint(npm_dir)
        if lint_pass:
            print(f"  Lint: {GREEN}[PASS]{NC}")
        else:
            print(f"  Lint: {RED}[FAIL]{NC}")
            print(f"\n{lint_output}")
            print(f"\n{RED}Error: Lint must pass before committing{NC}")
            return 1

        build_pass, build_output = run_build(npm_dir)
        if build_pass:
            print(f"  Build: {GREEN}[PASS]{NC}")
        else:
            print(f"  Build: {RED}[FAIL]{NC}")
            print(f"\n{build_output}")
            print(f"\n{RED}Error: Build must pass before committing{NC}")
            return 1

        print()
    elif args['skip_checks']:
        print(f"{YELLOW}Skipping validation checks (--skip-checks){NC}")
        print()

    # Dry run
    if args['dry_run']:
        print(f"{YELLOW}Dry run mode - would perform:{NC}")
        print(f"  - Stage all changes")
        print(f"  - Create commit with message:")
        for line in message.split('\n')[:3]:
            print(f"      {line}")
        print(f"  - Push to origin/{branch}")
        return 0

    # Stage and commit
    print(f"{BLUE}Staging changes...{NC}")
    if not stage_all_changes():
        print(f"{RED}Error: Failed to stage changes{NC}")
        return 1

    print(f"{BLUE}Creating commit...{NC}")
    success, _ = create_commit(message)
    if not success:
        print(f"{RED}Error: Failed to create commit{NC}")
        return 1

    print(f"  {GREEN}[OK] Commit created{NC}")

    # Push
    print()
    if not push_branch(branch):
        print(f"{RED}Error: Failed to push to remote{NC}")
        return 1

    print(f"  {GREEN}[OK] Pushed to origin/{branch}{NC}")

    # Success
    print()
    print(f"{GREEN}{'='*50}{NC}")
    print(f"{GREEN}PR #{args['pr_number']} updated successfully!{NC}")
    print(f"{GREEN}{'='*50}{NC}")
    print()
    print(f"  PR:     {GREEN}{pr_info['url']}{NC}")
    print(f"  Branch: {GREEN}{branch}{NC}")

    return 0


def cmd_update_body(args, pr_info):
    """Handle the update-body subcommand."""
    title = args['title']
    body = args['body']
    append = args['append']

    if not title and not body:
        print(f"{RED}Error: --title or --body required{NC}")
        return 1

    if args['dry_run']:
        print(f"{YELLOW}Dry run mode - would perform:{NC}")
        if title:
            print(f"  - Update PR title to: {title}")
        if body:
            if append:
                print(f"  - Append to PR body")
            else:
                print(f"  - Replace PR body")
        return 0

    print(f"{BLUE}Updating PR #{args['pr_number']}...{NC}")
    success, err = update_pr_body(args['pr_number'], title, body, append)

    if success:
        print(f"  {GREEN}[OK] PR updated{NC}")
        print()
        print(f"  PR: {GREEN}{pr_info['url']}{NC}")
        return 0
    else:
        print(f"  {RED}[FAIL] {err}{NC}")
        return 1


def cmd_comment(args, pr_info):
    """Handle the comment subcommand."""
    body = args['body']

    if not body:
        print(f"{RED}Error: --body required for comment{NC}")
        return 1

    if args['dry_run']:
        print(f"{YELLOW}Dry run mode - would perform:{NC}")
        print(f"  - Add comment to PR #{args['pr_number']}:")
        for line in body.split('\n')[:3]:
            print(f"      {line}")
        return 0

    print(f"{BLUE}Adding comment to PR #{args['pr_number']}...{NC}")
    success, err = add_pr_comment(args['pr_number'], body)

    if success:
        print(f"  {GREEN}[OK] Comment added{NC}")
        print()
        print(f"  PR: {GREEN}{pr_info['url']}{NC}")
        return 0
    else:
        print(f"  {RED}[FAIL] {err}{NC}")
        return 1


def main():
    args = parse_args()

    if not args['pr_number']:
        print(f"{RED}Error: PR number required{NC}")
        print_usage()
        sys.exit(1)

    if not args['subcommand']:
        print(f"{RED}Error: Subcommand required{NC}")
        print_usage()
        sys.exit(1)

    pr_number = args['pr_number']

    print(f"{BLUE}Fetching PR #{pr_number}...{NC}")
    pr_info, err = get_pr_info(pr_number)

    if not pr_info:
        print(f"{RED}Error: Could not fetch PR #{pr_number}{NC}")
        if err:
            print(f"  {err}")
        sys.exit(1)

    if pr_info['state'] != 'OPEN':
        print(f"{RED}Error: PR #{pr_number} is {pr_info['state']}, not OPEN{NC}")
        sys.exit(1)

    print(f"  PR: {GREEN}#{pr_number} - {pr_info['title']}{NC}")
    print(f"  Branch: {GREEN}{pr_info['headRefName']}{NC}")
    print()

    # Dispatch to subcommand
    if args['subcommand'] == 'commit':
        sys.exit(cmd_commit(args, pr_info))
    elif args['subcommand'] == 'update-body':
        sys.exit(cmd_update_body(args, pr_info))
    elif args['subcommand'] == 'comment':
        sys.exit(cmd_comment(args, pr_info))
    else:
        print(f"{RED}Error: Unknown subcommand '{args['subcommand']}'{NC}")
        print_usage()
        sys.exit(1)


if __name__ == '__main__':
    main()
