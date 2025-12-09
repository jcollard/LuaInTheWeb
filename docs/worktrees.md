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
# From the main LuaInTheWeb directory
git worktree add ../LuaInTheWeb-issue-42 -b 42-feature-name

# Or use the slash command
/worktree create 42
```

### List Active Worktrees

```bash
git worktree list

# Or use the slash command
/worktree list
```

### Remove a Worktree When Done

```bash
git worktree remove ../LuaInTheWeb-issue-42

# Or use the slash command
/worktree remove 42
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
