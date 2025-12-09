# Git Worktrees for Parallel Development

This project supports git worktrees for running multiple Claude Code agents on separate issues simultaneously.

## What are Worktrees?

Git worktrees allow you to have multiple working directories attached to a single repository, each checked out to a different branch. This enables:

- **Parallel development**: Multiple agents working on different issues simultaneously
- **No context switching**: No need to stash/commit/checkout when switching tasks
- **Isolation**: Each worktree is independent, preventing conflicts
- **Shared git state**: All worktrees share the same `.git` directory

## Directory Structure

```
C:\Users\User\git\jcollard\
├── LuaInTheWeb/                    # Main worktree (main branch)
│   ├── .git/                       # Shared git directory
│   ├── lua-learning-website/
│   └── ...
│
├── LuaInTheWeb-issue-42/           # Worktree for issue #42
│   ├── lua-learning-website/
│   └── ...
│
└── LuaInTheWeb-issue-15/           # Worktree for issue #15
    ├── lua-learning-website/
    └── ...
```

## Quick Start

### Create a Worktree for an Issue

```bash
# Recommended: Use the Python script (handles everything automatically)
python scripts/worktree-create.py 42

# Or use the slash command in Claude Code
/worktree create 42

# Or manually with git
git worktree add ../LuaInTheWeb-issue-42 -b 42-feature-name
```

The Python script automatically:
- Fetches the issue title from GitHub
- Creates a properly named branch (`42-feature-name-slug`)
- Installs npm dependencies
- Seeds the mutation test cache from main

### List Active Worktrees

```bash
git worktree list

# Or use the slash command
/worktree list
```

### Remove a Worktree When Done

```bash
# Recommended: Use the Python script
python scripts/worktree-remove.py 42

# Keep the branch (don't delete it)
python scripts/worktree-remove.py 42 --keep-branch

# Or use the slash command in Claude Code
/worktree remove 42

# Or manually with git
git worktree remove ../LuaInTheWeb-issue-42
```

## Workflow for Multiple Agents

### Starting an Agent on an Issue

1. **Create a worktree** for the issue:
   ```bash
   /worktree create <issue-number>
   ```

2. **Open a new Claude Code session** in the worktree directory:
   ```bash
   cd ../LuaInTheWeb-issue-<number>
   claude
   ```

3. **Work on the issue** using standard commands:
   ```bash
   /issue <number> begin
   ```

### Parallel Agent Example

```
Agent 1 (Main worktree):
  Working directory: LuaInTheWeb/
  Branch: main
  Task: Reviewing PRs, managing project

Agent 2 (Issue 42 worktree):
  Working directory: LuaInTheWeb-issue-42/
  Branch: 42-add-dark-mode
  Task: Implementing dark mode feature

Agent 3 (Issue 15 worktree):
  Working directory: LuaInTheWeb-issue-15/
  Branch: 15-fix-repl-bug
  Task: Fixing REPL bug
```

## Important Considerations

### Node Modules

Each worktree needs its own `node_modules`:

```bash
cd ../LuaInTheWeb-issue-42/lua-learning-website
npm install
```

This adds ~200MB per worktree but ensures complete isolation.

### Build Artifacts

Each worktree maintains its own build artifacts (`dist/`, `.vite/`, etc.), which:
- **Pro**: Ensures builds don't interfere
- **Con**: Uses additional disk space

### Disk Space

Approximate space per worktree:
- Source files: ~50MB
- node_modules: ~200MB
- Build artifacts: ~50MB
- **Total**: ~300MB per worktree

### Branch Naming Convention

Worktrees follow the issue branch naming convention:
- Worktree directory: `LuaInTheWeb-issue-<number>`
- Branch name: `<number>-<issue-title-slug>`

## Commands Reference

| Command | Description |
|---------|-------------|
| `/worktree list` | List all active worktrees |
| `/worktree create <n>` | Create worktree for issue #n |
| `/worktree remove <n>` | Remove worktree for issue #n |
| `/worktree status` | Show status of all worktrees |

## Integration with Issue Workflow

The `/issue` command is worktree-aware:

### In Main Worktree
```bash
/issue 42 begin
# Suggests creating a worktree OR creates branch in current worktree
```

### In Issue Worktree
```bash
/issue 42 begin
# Works as normal - you're already in the right worktree
```

### Checking Status
```bash
/status
# Shows current worktree context and other active worktrees
```

## Best Practices

1. **One issue per worktree**: Keep each worktree focused on a single issue
2. **Clean up when done**: Remove worktrees after PRs are merged
3. **Regular syncs**: Periodically sync worktrees with main to avoid conflicts
4. **Don't share node_modules**: Each worktree should have its own dependencies

## Troubleshooting

### "fatal: is already checked out"

The branch is checked out in another worktree. Either:
- Use a different branch name
- Remove the existing worktree first

### Worktree directory exists but not listed

The worktree may be in a broken state. Run:
```bash
git worktree prune
```

### Merge conflicts across worktrees

Each worktree is independent. Resolve conflicts in each worktree separately, or sync with main first:
```bash
git fetch origin
git rebase origin/main
```

## Python Scripts Reference

The `scripts/` directory contains Python scripts for worktree management:

### worktree-create.py

Creates a worktree with full setup for an issue.

```bash
python scripts/worktree-create.py <issue-number>
```

**What it does:**
1. Fetches issue title from GitHub
2. Creates a slug from the title (e.g., `6-file-explorer-improve-mutation-test`)
3. Creates branch `<number>-<slug>`
4. Creates worktree at `../LuaInTheWeb-issue-<number>`
5. Runs `npm install` in the worktree
6. Copies mutation test cache from main worktree
7. Updates issue status to "In Progress" in GitHub Project

### worktree-remove.py

Removes a worktree and optionally its branch.

```bash
python scripts/worktree-remove.py <issue-number> [--keep-branch]
```

**Options:**
- `--keep-branch`: Don't delete the branch after removing the worktree

**What it does:**
1. Finds the worktree for the issue
2. Removes the worktree directory
3. Deletes the branch (unless `--keep-branch` is specified)
4. If branch isn't merged, prompts for confirmation before force-deleting
