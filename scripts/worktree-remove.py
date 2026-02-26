#!/usr/bin/env python3
"""
Remove a git worktree for a GitHub issue.

Usage: python3 scripts/worktree-remove.py <issue-number> [--keep-branch] [--headless] [--orphan]

This script:
1. Finds the worktree for the given issue number
2. Removes the worktree directory
3. Prunes the worktree from git
4. Optionally deletes the associated branch (default: deletes it)

Options:
    --keep-branch    Keep the branch after removing the worktree
    --headless       Run without interactive prompts (force-deletes unmerged branches)
    --orphan         Remove orphaned directory even if not registered as a worktree
"""

import sys
import os
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scripts.lib.helpers import run, find_worktree_for_issue, RED, GREEN, YELLOW, BLUE, NC


def find_orphan_directory(issue_number):
    """Find orphaned worktree directory that isn't registered with git."""
    # Get the parent directory of the current repo
    current_dir = Path.cwd()
    repo_name = current_dir.name.split('-issue-')[0] if '-issue-' in current_dir.name else current_dir.name
    parent_dir = current_dir.parent

    # Look for directory matching pattern: RepoName-issue-N
    orphan_path = parent_dir / f"{repo_name}-issue-{issue_number}"
    if orphan_path.exists():
        return orphan_path

    return None


def main():
    # Parse arguments
    keep_branch = '--keep-branch' in sys.argv
    headless = '--headless' in sys.argv
    orphan_mode = '--orphan' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]

    if len(args) < 1:
        print(f"{RED}Error: Issue number required{NC}")
        print(f"Usage: python3 {sys.argv[0]} <issue-number> [--keep-branch] [--headless] [--orphan]")
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
        print(f"  {BLUE}python3 scripts/worktree-remove.py {issue_number}{NC}")
        sys.exit(1)

    # Find the worktree
    worktree_path, branch_name = find_worktree_for_issue(issue_number)

    if not worktree_path:
        # Check for orphaned directory if --orphan flag is set
        if orphan_mode:
            orphan_dir = find_orphan_directory(issue_number)
            if orphan_dir:
                print(f"{YELLOW}Found orphaned directory (not registered as worktree):{NC}")
                print(f"  {GREEN}{orphan_dir}{NC}")
                print(f"{BLUE}Removing orphaned directory...{NC}")
                try:
                    shutil.rmtree(orphan_dir)
                    print(f"  {GREEN}Directory deleted successfully{NC}")
                    sys.exit(0)
                except Exception as e:
                    print(f"  {RED}Failed to delete directory: {e}{NC}")
                    sys.exit(1)
            else:
                print(f"{YELLOW}No orphaned directory found for issue #{issue_number}{NC}")
                sys.exit(0)

        print(f"{YELLOW}No worktree found for issue #{issue_number}{NC}")
        # Check if orphan directory exists and suggest using --orphan
        orphan_dir = find_orphan_directory(issue_number)
        if orphan_dir:
            print(f"\n{YELLOW}Found orphaned directory: {orphan_dir}{NC}")
            print(f"Use {BLUE}--orphan{NC} flag to remove it:")
            print(f"  {BLUE}python3 scripts/worktree-remove.py {issue_number} --orphan{NC}")
        else:
            # List available worktrees
            worktree_list, _ = run('git worktree list')
            if worktree_list:
                print("\nAvailable worktrees:")
                for line in worktree_list.split('\n'):
                    print(f"  {line}")
        sys.exit(0)

    print(f"  Worktree: {GREEN}{worktree_path}{NC}")
    print(f"  Branch: {GREEN}{branch_name}{NC}")

    # Remove the worktree
    print(f"{BLUE}Removing worktree...{NC}")
    result, _ = run(f'git worktree remove "{worktree_path}" --force', check=False)

    if result is None:
        # Try pruning if remove failed
        print(f"{YELLOW}Worktree remove failed, trying to prune...{NC}")
        run('git worktree prune')

    # Clean up directory if it still exists
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
        merged_branches, _ = run('git branch --merged main', check=False)
        is_merged = merged_branches and branch_name in [b.strip() for b in merged_branches.split('\n')]

        if is_merged:
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
    remaining, _ = run('git worktree list')
    if remaining:
        print("Remaining worktrees:")
        for line in remaining.split('\n'):
            print(f"  {line}")


if __name__ == '__main__':
    main()
