#!/usr/bin/env python3
"""
Initialize git submodules inside a worktree.

Git worktrees do NOT auto-populate submodules. Worse, running `npm install`
in the worktree creates placeholder directories inside submodule paths (via
workspace resolution) that then block `git submodule update --init` with
"destination path already exists and is not an empty directory".

This script:
  1. Parses .gitmodules to discover submodule paths.
  2. For each submodule path inside the worktree, checks whether it is a
     real git checkout (has a .git file/dir at its root).
  3. Removes any broken placeholder directories.
  4. Runs `git submodule update --init --recursive` in the worktree.

Safety: refuses to operate outside .claude/worktrees/. The internal rmtree
is scoped to directories listed in .gitmodules, so the script can be safely
whitelisted (via the existing `Bash(python3 scripts/:*)` allow rule) without
granting general rm -rf permission.

Usage:
    python3 scripts/init-worktree-submodules.py                  # current dir
    python3 scripts/init-worktree-submodules.py /path/to/worktree

Run this BEFORE `npm install` in a fresh worktree to avoid the placeholder
problem, or AFTER if you have already hit the "destination path already
exists" error.
"""

import configparser
import os
import shutil
import subprocess
import sys


def parse_submodule_paths(gitmodules_path: str) -> list[str]:
    """Parse .gitmodules and return the list of submodule `path` entries."""
    if not os.path.exists(gitmodules_path):
        return []
    cfg = configparser.ConfigParser()
    cfg.read(gitmodules_path)
    paths: list[str] = []
    for section in cfg.sections():
        if cfg.has_option(section, "path"):
            paths.append(cfg.get(section, "path"))
    return paths


def is_git_checkout(submodule_path: str) -> bool:
    """A populated submodule has a `.git` file (or dir) at its root."""
    return os.path.exists(os.path.join(submodule_path, ".git"))


def main() -> int:
    worktree_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    worktree_path = os.path.realpath(worktree_path)

    # Safety: only operate inside .claude/worktrees/
    if ".claude/worktrees/" not in worktree_path:
        print(f"Error: {worktree_path} is not inside .claude/worktrees/")
        print("This script only operates on worktree directories for safety.")
        return 1

    gitmodules = os.path.join(worktree_path, ".gitmodules")
    submodule_paths = parse_submodule_paths(gitmodules)

    if not submodule_paths:
        print("No submodules declared in .gitmodules — nothing to do.")
        return 0

    removed_any = False
    for rel in submodule_paths:
        full = os.path.join(worktree_path, rel)
        if os.path.exists(full) and not is_git_checkout(full):
            print(f"Removing placeholder at {rel} (not a git checkout)")
            shutil.rmtree(full)
            removed_any = True

    if not removed_any:
        # Still run submodule update to populate anything that is truly missing.
        print("No placeholders to remove; ensuring submodules are populated.")

    print("Running: git submodule update --init --recursive")
    result = subprocess.run(
        ["git", "-C", worktree_path, "submodule", "update", "--init", "--recursive"],
        timeout=300,
    )
    if result.returncode != 0:
        print(f"git submodule update exited with code {result.returncode}")
        return result.returncode

    print("Done. Submodules are populated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
