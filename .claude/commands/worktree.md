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

## Step 1: Determine Repository Root

Find the main repository root (where `.git` directory lives):

```bash
git rev-parse --show-toplevel
```

This gives us the base path for creating worktrees. The parent directory is where worktrees will be created.

---

## Step 2: Handle Subcommands

### Subcommand: list

List all active worktrees:

```bash
git worktree list
```

Output:

```
## Active Worktrees

| Path | Branch | Status |
|------|--------|--------|
| <path1> | <branch1> | <main/worktree> |
| <path2> | <branch2> | <main/worktree> |
...

**Total**: <count> worktrees
```

### Subcommand: status

Show detailed status of all worktrees including git state:

```bash
# Get worktree list
git worktree list --porcelain
```

For each worktree, check:
- Current branch
- Dirty/clean state
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
- **Issue**: #<n> - <title>

...

**Summary**: <count> active worktrees, <count> with uncommitted changes
```

### Subcommand: create <n>

Create a new worktree for issue #n:

#### Step 2a: Validate Issue Exists

```bash
gh issue view <n> --json number,title,state
```

If issue doesn't exist or is closed, report error and stop.

#### Step 2b: Generate Paths

```bash
# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
PARENT_DIR=$(dirname "$REPO_ROOT")
WORKTREE_PATH="$PARENT_DIR/${REPO_NAME}-issue-<n>"
```

#### Step 2c: Check if Worktree Exists

```bash
git worktree list | grep "issue-<n>"
```

If exists, report:

```
## Worktree Already Exists

A worktree for issue #<n> already exists at:
<path>

**Options:**
- Open a Claude Code session in that directory
- Remove it first with `/worktree remove <n>`
```

#### Step 2d: Create Worktree with Branch

```bash
# Create worktree and branch linked to issue
git worktree add "<worktree-path>" -b <n>-<issue-title-slug>
```

If the branch already exists:
```bash
# Use existing branch
git worktree add "<worktree-path>" <branch-name>
```

#### Step 2e: Install Dependencies

```bash
cd "<worktree-path>/lua-learning-website" && npm install
```

#### Step 2f: Output Success

```
## Worktree Created for Issue #<n>

**Issue**: #<n> - <title>
**Path**: <worktree-path>
**Branch**: <branch-name>

### Next Steps

1. Open a new terminal/Claude Code session in the worktree:
   ```bash
   cd <worktree-path>
   claude
   ```

2. Start working on the issue:
   ```bash
   /issue <n> begin
   ```

**Note**: Dependencies have been installed in the worktree.
```

### Subcommand: remove <n>

Remove the worktree for issue #n:

#### Step 3a: Find Worktree

```bash
git worktree list | grep "issue-<n>"
```

If not found:

```
## Worktree Not Found

No worktree found for issue #<n>.

Run `/worktree list` to see all active worktrees.
```

#### Step 3b: Check for Uncommitted Changes

Navigate to the worktree and check status:

```bash
cd "<worktree-path>" && git status --porcelain
```

If there are uncommitted changes:

```
## Warning: Uncommitted Changes

The worktree for issue #<n> has uncommitted changes:

<list of changed files>

**Options:**
- Commit or stash changes first
- Force remove with: `git worktree remove --force <path>`
```

Then STOP unless user confirms.

#### Step 3c: Check if Branch is Merged

```bash
git branch --merged main | grep "<branch-name>"
```

If not merged, warn:

```
## Warning: Unmerged Branch

The branch `<branch-name>` has not been merged to main.

**Options:**
- Merge or create PR first
- Force remove anyway (branch will remain)
```

#### Step 3d: Remove Worktree

```bash
git worktree remove "<worktree-path>"
```

#### Step 3e: Optional: Delete Branch

If branch was merged:

```bash
git branch -d <branch-name>
```

Output:

```
## Worktree Removed

**Issue**: #<n>
**Path**: <worktree-path> (removed)
**Branch**: <branch-name> <deleted/kept>

Active worktrees remaining: <count>
```

---

## Error Handling

| Error | Response |
|-------|----------|
| No subcommand | "Usage: `/worktree list\|create\|remove\|status [issue-number]`" |
| Missing issue number | "Issue number required. Usage: `/worktree create <n>`" |
| Issue not found | "Issue #<n> not found. Check the issue number." |
| Worktree exists | "Worktree for issue #<n> already exists at <path>" |
| Worktree not found | "No worktree found for issue #<n>" |
| Git error | Report the git error message |

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

## Creating Worktree for Issue #42

**Issue**: #42 - Add dark mode toggle
**Path**: C:\Users\User\git\jcollard\LuaInTheWeb-issue-42
**Branch**: 42-add-dark-mode-toggle

Creating worktree...
Installing dependencies...

## Worktree Created for Issue #42

### Next Steps

1. Open a new terminal/Claude Code session in the worktree:
   ```bash
   cd C:\Users\User\git\jcollard\LuaInTheWeb-issue-42
   claude
   ```

2. Start working on the issue:
   ```bash
   /issue 42 begin
   ```

**Note**: Dependencies have been installed in the worktree.
```

### Check Status

```
/worktree status

## Worktree Status

### Main: C:\Users\User\git\jcollard\LuaInTheWeb
- **Branch**: main
- **State**: Clean
- **Status**: Primary worktree

### Issue #42: C:\Users\User\git\jcollard\LuaInTheWeb-issue-42
- **Branch**: 42-add-dark-mode-toggle
- **State**: 3 files modified
- **vs Main**: 5 commits ahead, 0 behind
- **Issue**: #42 - Add dark mode toggle

### Issue #15: C:\Users\User\git\jcollard\LuaInTheWeb-issue-15
- **Branch**: 15-fix-repl-bug
- **State**: Clean
- **vs Main**: 2 commits ahead, 0 behind
- **Issue**: #15 - Fix REPL bug

**Summary**: 3 active worktrees, 1 with uncommitted changes
```

### Remove Worktree

```
/worktree remove 42

## Removing Worktree for Issue #42

Checking for uncommitted changes... Clean
Checking if branch is merged... Yes

Removing worktree...
Deleting merged branch...

## Worktree Removed

**Issue**: #42
**Path**: C:\Users\User\git\jcollard\LuaInTheWeb-issue-42 (removed)
**Branch**: 42-add-dark-mode-toggle (deleted)

Active worktrees remaining: 2
```

---

## Notes

- Worktrees share the same `.git` directory, so all branches and history are available
- Each worktree needs its own `npm install` (~200MB)
- Use `/status` in any worktree to see overall project state
- The main worktree should generally stay on `main` for coordination
