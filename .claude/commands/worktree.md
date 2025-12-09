# Worktree Management

Manage git worktrees for parallel development with multiple Claude Code agents.

## Usage

```
/worktree list              # List all active worktrees
/worktree create <n>        # Create worktree for issue #n
/worktree remove <n>        # Remove worktree for issue #n
/worktree status            # Show status of all worktrees with git state
```

## Arguments

The command accepts a subcommand and optional issue number:
- `$ARGUMENTS` contains the full argument string (e.g., "list", "create 42", "remove 15")

Parse the arguments:
- First token: Subcommand (list, create, remove, status)
- Second token: Issue number (required for create/remove)

---

## Subcommand: list

List all active worktrees:

```bash
git worktree list
```

Output as a formatted table:

```
## Active Worktrees

| Path | Branch | Status |
|------|--------|--------|
| <path1> | <branch1> | <main/worktree> |
| <path2> | <branch2> | <main/worktree> |
...

**Total**: <count> worktrees
```

---

## Subcommand: status

Show detailed status of all worktrees including git state:

```bash
git worktree list --porcelain
```

For each worktree, check:
- Current branch
- Dirty/clean state (run `git status --porcelain` in each)
- Commits ahead/behind main

Output:

```
## Worktree Status

### Main: <main-path>
- **Branch**: main
- **State**: Clean
- **Status**: Primary worktree

### Issue #<n>: <worktree-path>
- **Branch**: <branch-name>
- **State**: <clean/dirty>
- **vs Main**: <commits ahead/behind>

...

**Summary**: <count> active worktrees, <count> with uncommitted changes
```

---

## Subcommand: create <n>

**Delegate to Python script:**

```bash
python scripts/worktree-create.py <n>
```

The script handles:
1. Validating the issue exists
2. Fetching the issue title from GitHub
3. Creating a slugified branch name (`<n>-<title-slug>`)
4. Creating the worktree at `../LuaInTheWeb-issue-<n>`
5. Installing npm dependencies
6. Seeding mutation test cache from main

If the worktree already exists, the script reports where it is.

After the script completes, output:

```
### Next Steps

Open a new Claude Code session in the worktree:
```bash
cd <worktree-path>
claude
```

Then run:
```bash
/issue <n> begin
```
```

---

## Subcommand: remove <n>

**Delegate to Python script:**

```bash
python scripts/worktree-remove.py <n>
```

The script handles:
1. Finding the worktree for the issue
2. Removing the worktree directory
3. Deleting the branch (prompts if not merged)

To keep the branch after removing:

```bash
python scripts/worktree-remove.py <n> --keep-branch
```

---

## Error Handling

| Error | Response |
|-------|----------|
| No subcommand | "Usage: `/worktree list\|create\|remove\|status [issue-number]`" |
| Missing issue number | "Issue number required. Usage: `/worktree create <n>`" |
| Unknown subcommand | "Unknown subcommand. Available: list, create, remove, status" |
| Script not found | "Script not found. Ensure scripts/worktree-create.py exists." |

---

## Examples

### List Worktrees

```
/worktree list

## Active Worktrees

| Path | Branch | Status |
|------|--------|--------|
| C:\Users\User\git\jcollard\LuaInTheWeb | main | primary |
| C:\Users\User\git\jcollard\LuaInTheWeb-issue-42 | 42-add-dark-mode | worktree |
| C:\Users\User\git\jcollard\LuaInTheWeb-issue-15 | 15-fix-repl-bug | worktree |

**Total**: 3 worktrees
```

### Create Worktree

```
/worktree create 42

[Script output with colored status messages]

## Worktree Created for Issue #42

**Issue**: #42 - Add dark mode toggle
**Path**: C:\Users\User\git\jcollard\LuaInTheWeb-issue-42
**Branch**: 42-add-dark-mode-toggle

### Next Steps

Open a new Claude Code session in the worktree:
```bash
cd C:\Users\User\git\jcollard\LuaInTheWeb-issue-42
claude
```

Then run:
```bash
/issue 42 begin
```
```

### Remove Worktree

```
/worktree remove 42

[Script output with status messages]

## Worktree Removed

Active worktrees remaining: 2
```

---

## Notes

- Worktrees share the same `.git` directory, so all branches and history are available
- Each worktree needs its own `npm install` (~200MB)
- **Mutation cache is copied from main** to speed up `npm run test:mutation:scope`
- Use `/status` in any worktree to see overall project state
- The main worktree should generally stay on `main` for coordination
