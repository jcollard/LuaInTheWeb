#!/usr/bin/env python
"""
Remove a git worktree for a GitHub issue.

Usage: python scripts/worktree-remove.py <issue-number> [--keep-branch] [--headless]

This script:
1. Finds the worktree for the given issue number
2. Removes the worktree directory
3. Prunes the worktree from git
4. Optionally deletes the associated branch (default: deletes it)

Options:
    --keep-branch    Keep the branch after removing the worktree
    --headless       Run without interactive prompts (force-deletes unmerged branches)
"""

import subprocess
import sys
import re
import shutil
from pathlib import Path

# ANSI colors
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color


def run(cmd, capture=True, check=True):
    """Run a shell command and return output."""
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=capture,
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    if check and result.returncode != 0:
        if result.stderr:
            print(f"{RED}Error: {result.stderr}{NC}", file=sys.stderr)
        return None
    return result.stdout.strip() if capture else result.returncode


def find_worktree_for_issue(issue_number):
    """Find worktree path and branch for an issue number."""
    worktree_list = run('git worktree list --porcelain')
    if not worktree_list:
        return None, None

    lines = worktree_list.split('\n')
    current_path = None
    current_branch = None

    for line in lines:
        if line.startswith('worktree '):
            current_path = line[9:]  # Remove 'worktree ' prefix
        elif line.startswith('branch '):
            current_branch = line[7:]  # Remove 'branch ' prefix
            # Check if this is the issue we're looking for
            # Match patterns like: refs/heads/6-slug or issue-6 in path
            if (f"issue-{issue_number}" in current_path or
                    re.match(rf'refs/heads/{issue_number}-', current_branch)):
                # Extract just the branch name
                branch_name = current_branch.replace('refs/heads/', '')
                return current_path, branch_name
            current_path = None
            current_branch = None

    return None, None


def main():
    # Parse arguments
    keep_branch = '--keep-branch' in sys.argv
    headless = '--headless' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]

    if len(args) < 1:
        print(f"{RED}Error: Issue number required{NC}")
        print(f"Usage: python {sys.argv[0]} <issue-number> [--keep-branch] [--headless]")
        sys.exit(1)

    issue_number = args[0]

    # Validate issue number is numeric
    if not issue_number.isdigit():
        print(f"{RED}Error: Issue number must be numeric{NC}")
        sys.exit(1)

    print(f"{BLUE}Removing worktree for issue #{issue_number}...{NC}")

    # Check we're not in the worktree we're trying to remove
    current_dir = Path.cwd()
    if f"issue-{issue_number}" in str(current_dir):
        print(f"{RED}Error: Cannot remove worktree while inside it{NC}")
        print(f"Please run this command from the main repository:")
        print(f"  {BLUE}cd ../LuaInTheWeb{NC}")
        print(f"  {BLUE}python scripts/worktree-remove.py {issue_number}{NC}")
        sys.exit(1)

    # Find the worktree
    worktree_path, branch_name = find_worktree_for_issue(issue_number)

    if not worktree_path:
        print(f"{YELLOW}No worktree found for issue #{issue_number}{NC}")
        # List available worktrees
        worktree_list = run('git worktree list')
        if worktree_list:
            print("\nAvailable worktrees:")
            for line in worktree_list.split('\n'):
                print(f"  {line}")
        sys.exit(0)

    print(f"  Worktree: {GREEN}{worktree_path}{NC}")
    print(f"  Branch: {GREEN}{branch_name}{NC}")

    # Remove the worktree
    print(f"{BLUE}Removing worktree...{NC}")
    result = run(f'git worktree remove "{worktree_path}" --force', check=False)

    if result is None:
        # Try pruning if remove failed
        print(f"{YELLOW}Worktree remove failed, trying to prune...{NC}")
        run('git worktree prune')

    # Clean up directory if it still exists (Windows often leaves directories behind)
    worktree_dir = Path(worktree_path)
    if worktree_dir.exists():
        print(f"{YELLOW}Directory still exists, cleaning up...{NC}")
        try:
            shutil.rmtree(worktree_dir)
            print(f"  {GREEN}Directory deleted{NC}")
        except Exception as e:
            print(f"  {RED}Failed to delete directory: {e}{NC}")
            print(f"  {YELLOW}Please manually delete: {worktree_path}{NC}")

    # Delete the branch unless --keep-branch was specified
    if not keep_branch and branch_name:
        print(f"{BLUE}Deleting branch '{branch_name}'...{NC}")
        # Check if branch is merged
        merged_check = run(f'git branch --merged main | grep -q "^\\s*{branch_name}$"', check=False)

        if merged_check == 0:
            # Branch is merged, safe to delete
            run(f'git branch -d "{branch_name}"', check=False)
            print(f"  {GREEN}Branch deleted (was merged){NC}")
        else:
            # Branch not merged, force delete with warning
            print(f"  {YELLOW}Warning: Branch not merged to main{NC}")
            if headless:
                # In headless mode, automatically force delete
                run(f'git branch -D "{branch_name}"', check=False)
                print(f"  {GREEN}Branch force deleted (headless mode){NC}")
            else:
                response = input(f"  Force delete branch '{branch_name}'? [y/N] ").strip().lower()
                if response == 'y':
                    run(f'git branch -D "{branch_name}"', check=False)
                    print(f"  {GREEN}Branch force deleted{NC}")
                else:
                    print(f"  {YELLOW}Branch kept{NC}")
    elif keep_branch:
        print(f"  {YELLOW}Branch kept (--keep-branch specified){NC}")

    # Success message
    print()
    print(f"{GREEN}Worktree removed successfully!{NC}")
    print()

    # Show remaining worktrees
    remaining = run('git worktree list')
    if remaining:
        print("Remaining worktrees:")
        for line in remaining.split('\n'):
            print(f"  {line}")


if __name__ == '__main__':
    main()
