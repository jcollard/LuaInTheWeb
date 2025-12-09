#!/usr/bin/env python
"""
Create a git worktree for a GitHub issue.

Usage: python scripts/worktree-create.py <issue-number>

This script:
1. Fetches the issue title from GitHub
2. Creates a branch named <number>-<title-slug>
3. Creates a worktree at ../LuaInTheWeb-issue-<number>
4. Installs npm dependencies
5. Seeds mutation test cache from main worktree
6. Updates issue status to "In Progress" in GitHub Project
"""

import subprocess
import sys
import os
import re
import shutil
import json
from pathlib import Path

# ANSI colors
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color


def run(cmd, capture=True, check=True, cwd=None):
    """Run a shell command and return output."""
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=capture,
        text=True,
        encoding='utf-8',
        errors='replace',
        cwd=cwd
    )
    if check and result.returncode != 0:
        if result.stderr:
            print(f"{RED}Error: {result.stderr}{NC}", file=sys.stderr)
        return None
    return result.stdout.strip() if capture else result.returncode


def slugify(title):
    """Convert title to a URL-friendly slug."""
    # Remove [Tech Debt], [Roadmap], [BUG] prefixes
    clean = re.sub(r'^\[(Tech Debt|Roadmap|BUG)\]\s*', '', title, flags=re.IGNORECASE)
    # Convert to lowercase
    slug = clean.lower()
    # Replace non-alphanumeric with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Truncate to 50 chars
    return slug[:50]


def update_project_status(issue_number):
    """Update issue status to 'In Progress' in GitHub Project."""
    # Project configuration
    PROJECT_NUMBER = 3
    PROJECT_OWNER = "jcollard"
    STATUS_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Vo"  # Status field
    IN_PROGRESS_OPTION_ID = "47fc9ee4"  # "In Progress" option

    # Get project items
    items_json = run(
        f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} --format json --limit 100',
        check=False
    )

    if not items_json:
        return False, "Could not fetch project items"

    try:
        data = json.loads(items_json)
        items = data.get('items', [])
    except json.JSONDecodeError:
        return False, "Invalid JSON from project"

    # Find the item for this issue
    item_id = None
    for item in items:
        content = item.get('content', {})
        if content.get('number') == int(issue_number):
            item_id = item.get('id')
            break

    if not item_id:
        # Issue not in project, try to add it first
        add_result = run(
            f'gh project item-add {PROJECT_NUMBER} --owner {PROJECT_OWNER} '
            f'--url "https://github.com/{PROJECT_OWNER}/LuaInTheWeb/issues/{issue_number}"',
            check=False
        )
        if add_result is None:
            return False, "Issue not in project and could not add it"

        # Fetch items again to get the new item ID
        items_json = run(
            f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} --format json --limit 100',
            check=False
        )
        if items_json:
            try:
                data = json.loads(items_json)
                for item in data.get('items', []):
                    if item.get('content', {}).get('number') == int(issue_number):
                        item_id = item.get('id')
                        break
            except json.JSONDecodeError:
                pass

    if not item_id:
        return False, "Could not find project item ID"

    # Update the status field
    # Get project ID first
    project_json = run(
        f'gh project list --owner {PROJECT_OWNER} --format json',
        check=False
    )

    project_id = None
    if project_json:
        try:
            projects = json.loads(project_json)
            for proj in projects.get('projects', []):
                if proj.get('number') == PROJECT_NUMBER:
                    project_id = proj.get('id')
                    break
        except json.JSONDecodeError:
            pass

    if not project_id:
        return False, "Could not find project ID"

    # Update the status
    update_result = run(
        f'gh project item-edit --project-id {project_id} --id {item_id} '
        f'--field-id {STATUS_FIELD_ID} --single-select-option-id {IN_PROGRESS_OPTION_ID}',
        check=False
    )

    if update_result is None:
        return False, "Failed to update status"

    return True, "Status updated to In Progress"


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
    repo_root = run('git rev-parse --show-toplevel')
    if not repo_root:
        print(f"{RED}Error: Not in a git repository{NC}")
        sys.exit(1)

    repo_root = Path(repo_root)
    repo_name = repo_root.name
    parent_dir = repo_root.parent
    worktree_path = parent_dir / f"{repo_name}-issue-{issue_number}"

    # Check if worktree already exists
    worktree_list = run('git worktree list')
    if f"issue-{issue_number}" in worktree_list:
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
    issue_title = run(f'gh issue view {issue_number} --json title --jq ".title"', check=False)

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
    branch_exists = run(f'git show-ref --verify --quiet "refs/heads/{branch_name}"', check=False)

    if branch_exists == 0:
        print(f"{YELLOW}Branch '{branch_name}' already exists, using it...{NC}")
        result = run(f'git worktree add "{worktree_path}" "{branch_name}"', check=False)
    else:
        print(f"{BLUE}Creating new branch and worktree...{NC}")
        result = run(f'git worktree add "{worktree_path}" -b "{branch_name}"', check=False)

    if result is None:
        print(f"{RED}Error: Failed to create worktree{NC}")
        sys.exit(1)

    # Install dependencies
    print(f"{BLUE}Installing npm dependencies...{NC}")
    npm_dir = worktree_path / "lua-learning-website"
    run('npm install --silent', capture=False, cwd=str(npm_dir))

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
