#!/usr/bin/env python3
"""
Remove and reinstall node_modules in a worktree.

Worktrees created by EnterWorktree start without node_modules. If the first
npm install fails partway (e.g. Electron postinstall errors), the tree can
end up with incomplete packages (missing .mjs files, etc.). The only reliable
fix is a clean reinstall.

Usage:
    python3 scripts/clean-worktree-modules.py [worktree-path]

If no path is given, uses the current working directory. The script will:
  1. Verify the target is inside .claude/worktrees/ (safety check)
  2. Remove node_modules/
  3. Run npm install
"""

import os
import shutil
import subprocess
import sys


def main() -> int:
    worktree_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    worktree_path = os.path.realpath(worktree_path)

    # Safety: only operate inside .claude/worktrees/
    if ".claude/worktrees/" not in worktree_path:
        print(f"Error: {worktree_path} is not inside .claude/worktrees/")
        print("This script only operates on worktree directories for safety.")
        return 1

    node_modules = os.path.join(worktree_path, "node_modules")

    if os.path.exists(node_modules):
        print(f"Removing {node_modules} ...")
        shutil.rmtree(node_modules)
        print("Removed.")
    else:
        print("No node_modules found, proceeding to install.")

    print("Running npm install ...")
    result = subprocess.run(
        ["npm", "install"],
        cwd=worktree_path,
        timeout=300,
    )

    if result.returncode != 0:
        print(f"npm install exited with code {result.returncode}")
        return result.returncode

    print("Done. node_modules is ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
