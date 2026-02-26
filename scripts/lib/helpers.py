"""Shared helper functions for Python scripts.

This module contains common utilities used across multiple scripts:
- Shell command execution
- Git operations
- File operations
- Build/test runners
"""

import re
import subprocess
from pathlib import Path

# ANSI colors
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color


def run(cmd, capture=True, check=True, cwd=None):
    """Run a shell command and return output.

    Args:
        cmd: The shell command to run
        capture: Whether to capture output (default True)
        check: Whether to check return code (default True)
        cwd: Working directory for the command

    Returns:
        Tuple of (stdout, stderr). If check=True and command fails,
        returns (None, stderr).
    """
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
        return None, result.stderr
    return result.stdout.strip() if capture else "", result.stderr


def get_repo_root():
    """Get the repository root directory.

    Returns:
        Path object for repo root, or None if not in a git repo.
    """
    output, _ = run('git rev-parse --show-toplevel')
    return Path(output) if output else None


def get_temp_dir():
    """Get a temp directory within the repo (gitignored).

    Returns:
        Path object for .tmp directory, or None if not in a repo.
    """
    repo_root = get_repo_root()
    if not repo_root:
        return None
    temp_dir = repo_root / ".tmp"
    temp_dir.mkdir(exist_ok=True)
    return temp_dir


def get_current_branch():
    """Get the current branch name.

    Returns:
        Current branch name as string.
    """
    output, _ = run('git rev-parse --abbrev-ref HEAD')
    return output


def get_staged_files():
    """Get list of staged files.

    Returns:
        List of staged file paths.
    """
    output, _ = run('git diff --cached --name-only')
    return output.split('\n') if output else []


def get_unstaged_changes():
    """Get list of files with unstaged changes.

    Returns:
        List of file paths with unstaged changes.
    """
    output, _ = run('git diff --name-only')
    return output.split('\n') if output else []


def get_untracked_files():
    """Get list of untracked files.

    Returns:
        List of untracked file paths.
    """
    output, _ = run('git ls-files --others --exclude-standard')
    return output.split('\n') if output else []


def get_changed_files(base_branch='main'):
    """Get list of files changed between base branch and HEAD.

    Args:
        base_branch: The base branch to compare against (default: main)

    Returns:
        List of file paths that have changed.
    """
    output, _ = run(f'git diff --name-only {base_branch}...HEAD', check=False)
    if not output:
        return []
    return output.split('\n')


def read_file_content(file_path):
    """Read content from a file, returning None if file doesn't exist or is empty.

    Args:
        file_path: Path to the file to read

    Returns:
        File content as string, or None if file doesn't exist or is empty.
    """
    if not file_path:
        return None
    try:
        path = Path(file_path)
        if not path.exists():
            print(f"{YELLOW}Warning: File not found: {file_path}{NC}")
            return None
        content = path.read_text(encoding='utf-8').strip()
        return content if content else None
    except Exception as e:
        print(f"{YELLOW}Warning: Could not read file {file_path}: {e}{NC}")
        return None


def run_tests(npm_dir):
    """Run the test suite.

    Args:
        npm_dir: Path to directory containing package.json

    Returns:
        Tuple of (success, output) where success is bool.
    """
    print(f"{BLUE}Running tests...{NC}")
    result = subprocess.run(
        'npm run test',
        shell=True,
        cwd=str(npm_dir),
        capture_output=True,
        text=True
    )
    return result.returncode == 0, result.stdout + result.stderr


def run_lint(npm_dir):
    """Run linting.

    Args:
        npm_dir: Path to directory containing package.json

    Returns:
        Tuple of (success, output) where success is bool.
    """
    print(f"{BLUE}Running lint...{NC}")
    result = subprocess.run(
        'npm run lint',
        shell=True,
        cwd=str(npm_dir),
        capture_output=True,
        text=True
    )
    return result.returncode == 0, result.stdout + result.stderr


def run_build(npm_dir):
    """Run the build.

    Args:
        npm_dir: Path to directory containing package.json

    Returns:
        Tuple of (success, output) where success is bool.
    """
    print(f"{BLUE}Running build...{NC}")
    result = subprocess.run(
        'npm run build',
        shell=True,
        cwd=str(npm_dir),
        capture_output=True,
        text=True
    )
    return result.returncode == 0, result.stdout + result.stderr


def slugify(title):
    """Convert an issue title to a URL-friendly slug for branch names.

    Removes common prefixes like [Tech Debt], [BUG], etc.
    Truncates to 50 characters.
    """
    clean = re.sub(r'^\[(Tech Debt|Roadmap|BUG)\]\s*', '', title, flags=re.IGNORECASE)
    slug = clean.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug[:50]


def find_worktree_for_issue(issue_number):
    """Find worktree path and branch for an issue number.

    Args:
        issue_number: Issue number as string

    Returns:
        Tuple of (worktree_path, branch_name). Both None if not found.
    """
    worktree_list, _ = run('git worktree list --porcelain')
    if not worktree_list:
        return None, None

    lines = worktree_list.split('\n')
    current_path = None
    current_branch = None

    for line in lines:
        if line.startswith('worktree '):
            current_path = line[9:]
        elif line.startswith('branch '):
            current_branch = line[7:]
            if (f"issue-{issue_number}" in current_path or
                    re.match(rf'refs/heads/{issue_number}-', current_branch)):
                branch_name = current_branch.replace('refs/heads/', '')
                return current_path, branch_name
            current_path = None
            current_branch = None

    return None, None


def stage_all_changes():
    """Stage all changes for commit.

    Returns:
        True if successful, False otherwise.
    """
    output, err = run('git add -A')
    return err == "" or err is None


def push_branch(branch):
    """Push branch to remote.

    Args:
        branch: Branch name to push

    Returns:
        True if successful, False otherwise.
    """
    print(f"{BLUE}Pushing to origin/{branch}...{NC}")
    output, err = run(f'git push -u origin {branch}')
    return output is not None or err == ""
