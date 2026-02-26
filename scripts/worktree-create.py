#!/usr/bin/env python3
"""
Create a git worktree for a GitHub issue.

Usage: python3 scripts/worktree-create.py <issue-number>

This script:
1. Fetches the issue title from GitHub
2. Creates a branch named <number>-<title-slug>
3. Creates a worktree at ../LuaInTheWeb-issue-<number>
4. Installs npm dependencies
5. Seeds mutation test cache from main worktree
6. Updates issue status to "In Progress" in GitHub Project
"""

import sys
import os
import shutil
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scripts.lib.helpers import run, slugify, RED, GREEN, YELLOW, BLUE, NC
from scripts.lib.project_board import update_project_status as _update_status


def update_project_status(issue_number):
    """Update issue status to 'In Progress' in GitHub Project."""
    return _update_status(issue_number, "In Progress")


def main():
    if len(sys.argv) < 2:
        print(f"{RED}Error: Issue number required{NC}")
        print(f"Usage: python {sys.argv[0]} <issue-number>")
        sys.exit(1)

    issue_number = sys.argv[1]

    # Validate issue number is numeric
    if not issue_number.isdigit():
        print(f"{RED}Error: Issue number must be numeric{NC}")
        sys.exit(1)

    print(f"{BLUE}Creating worktree for issue #{issue_number}...{NC}")

    # Get repository root
    repo_root, _ = run('git rev-parse --show-toplevel')
    if not repo_root:
        print(f"{RED}Error: Not in a git repository{NC}")
        sys.exit(1)

    repo_root = Path(repo_root)
    repo_name = repo_root.name
    parent_dir = repo_root.parent
    worktree_path = parent_dir / f"{repo_name}-issue-{issue_number}"

    # Check if worktree already exists
    worktree_list, _ = run('git worktree list')
    if worktree_list and f"issue-{issue_number}" in worktree_list:
        for line in worktree_list.split('\n'):
            if f"issue-{issue_number}" in line:
                existing_path = line.split()[0]
                print(f"{YELLOW}Worktree already exists at: {existing_path}{NC}")
                print()
                print("To use it, run:")
                print(f"{GREEN}  cd {existing_path}{NC}")
                sys.exit(0)

    # Fetch issue title from GitHub
    print(f"{BLUE}Fetching issue title from GitHub...{NC}")
    issue_title, _ = run(f'gh issue view {issue_number} --json title --jq ".title"', check=False)

    if not issue_title:
        print(f"{RED}Error: Could not fetch issue #{issue_number}. Does it exist?{NC}")
        sys.exit(1)

    print(f"  Issue: {GREEN}#{issue_number} - {issue_title}{NC}")

    # Create branch name slug from title
    title_slug = slugify(issue_title)
    branch_name = f"{issue_number}-{title_slug}"

    print(f"  Branch: {GREEN}{branch_name}{NC}")
    print(f"  Path: {GREEN}{worktree_path}{NC}")

    # Check if branch already exists
    branch_check, _ = run(f'git show-ref --verify "refs/heads/{branch_name}"', check=False)

    if branch_check:
        print(f"{YELLOW}Branch '{branch_name}' already exists, using it...{NC}")
        result, _ = run(f'git worktree add "{worktree_path}" "{branch_name}"', check=False)
    else:
        print(f"{BLUE}Creating new branch and worktree...{NC}")
        result, _ = run(f'git worktree add "{worktree_path}" -b "{branch_name}"', check=False)

    if result is None:
        print(f"{RED}Error: Failed to create worktree{NC}")
        sys.exit(1)

    # Install dependencies (skip if node_modules exists and lockfile matches)
    npm_dir = worktree_path / "lua-learning-website"
    main_lockfile = repo_root / "lua-learning-website" / "package-lock.json"
    wt_lockfile = npm_dir / "package-lock.json"
    wt_node_modules = npm_dir / "node_modules"

    needs_install = True
    if wt_node_modules.exists() and wt_lockfile.exists() and main_lockfile.exists():
        if wt_lockfile.read_bytes() == main_lockfile.read_bytes():
            needs_install = False

    if needs_install:
        print(f"{BLUE}Installing npm dependencies...{NC}")
        run('npm install --silent', capture=False, cwd=str(npm_dir))
    else:
        print(f"  {GREEN}npm dependencies up to date (skipped install){NC}")

    # Seed mutation test cache
    print(f"{BLUE}Seeding mutation test cache...{NC}")
    mutation_dir = npm_dir / "reports" / "mutation"
    mutation_dir.mkdir(parents=True, exist_ok=True)

    source_cache = repo_root / "lua-learning-website" / "reports" / "mutation" / ".stryker-incremental.json"
    if source_cache.exists():
        shutil.copy(source_cache, mutation_dir / ".stryker-incremental.json")
        print(f"  {GREEN}Cache seeded from main worktree{NC}")
    else:
        print(f"  {YELLOW}No mutation cache found in main worktree{NC}")

    # Update project status to "In Progress"
    print(f"{BLUE}Updating project status...{NC}")
    success, message = update_project_status(issue_number)
    if success:
        print(f"  {GREEN}Issue moved to In Progress{NC}")
    else:
        print(f"  {YELLOW}Could not update status: {message}{NC}")

    # Success message
    print()
    print(f"{GREEN}Worktree created successfully!{NC}")
    print()
    print(f"Issue:  {GREEN}#{issue_number} - {issue_title}{NC}")
    print(f"Path:   {GREEN}{worktree_path}{NC}")
    print(f"Branch: {GREEN}{branch_name}{NC}")
    print()
    print("Next steps:")
    print(f"  {BLUE}cd {worktree_path}{NC}")
    print(f"  {BLUE}claude{NC}")
    print()
    print("Then run:")
    print(f"  {BLUE}/issue {issue_number} begin{NC}")


if __name__ == '__main__':
    main()
