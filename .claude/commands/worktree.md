# Worktree Management

Manage git worktrees for parallel development using Claude's built-in `EnterWorktree` tool.

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

**Use Claude's built-in `EnterWorktree` tool:**

1. **Fetch issue title** to confirm issue exists:
   ```bash
   gh issue view <n> --json title --jq ".title"
   ```

2. **Call `EnterWorktree`** with name `issue-<n>`:
   - This creates the worktree at `.claude/worktrees/issue-<n>/`
   - The current session's working directory automatically switches to the worktree
   - A new branch is created from HEAD

3. **Post-setup** (after EnterWorktree completes):

   a. Install npm dependencies if needed:
   ```bash
   npm --prefix lua-learning-website install --silent
   ```

   b. Seed mutation test cache from main:
   ```bash
   MAIN_CACHE="$(git rev-parse --path-format=absolute --git-common-dir)/../lua-learning-website/reports/mutation/.stryker-incremental.json"
   if [ -f "$MAIN_CACHE" ]; then
     mkdir -p lua-learning-website/reports/mutation
     cp "$MAIN_CACHE" lua-learning-website/reports/mutation/.stryker-incremental.json
   fi
   ```

   c. Update project board status:
   ```bash
   python3 -c "
   import sys; sys.path.insert(0, '.')
   from scripts.lib.project_board import update_project_status
   success, msg = update_project_status('<n>', 'In Progress')
   print(msg)
   "
   ```

4. **Output success:**

```
## Worktree Created for Issue #<n>

**Issue**: #<n> - <title>
**Path**: .claude/worktrees/issue-<n>
**Session**: Switched to worktree (same session continues)

### Ready to Work

You are now in the worktree. Run:
```bash
/issue <n> begin
```
```

If the worktree already exists (EnterWorktree reports it), inform the user.

---

## Subcommand: remove <n>

**Use direct git commands:**

1. **Find the worktree** for this issue:
   ```bash
   git worktree list | grep "issue-<n>"
   ```

   If not found, report "No worktree found for issue #<n>" and STOP.

2. **Check for uncommitted changes:**
   ```bash
   git -C "<worktree-path>" status --porcelain
   ```

   If uncommitted changes exist, warn the user and ask for confirmation before proceeding.

3. **Remove the worktree:**
   ```bash
   git worktree remove .claude/worktrees/issue-<n> --force
   git worktree prune
   ```

4. **Delete the branch** (if merged, use `-d`; if not merged, use `-D` with warning):
   ```bash
   # Check if branch is merged
   BRANCH=$(git worktree list --porcelain | grep -A2 "issue-<n>" | grep "branch" | sed 's|branch refs/heads/||')

   # Try safe delete first
   git branch -d "$BRANCH" 2>/dev/null || git branch -D "$BRANCH"
   ```

5. **Output result:**
   ```
   ## Worktree Removed

   - Worktree: .claude/worktrees/issue-<n> (removed)
   - Branch: <branch-name> (deleted)

   Active worktrees remaining: <count>
   ```

**Options:**
- To keep the branch: Skip step 4 (branch deletion)

---

## Error Handling

| Error | Response |
|-------|----------|
| No subcommand | "Usage: `/worktree list\|create\|remove\|status [issue-number]`" |
| Missing issue number | "Issue number required. Usage: `/worktree create <n>`" |
| Unknown subcommand | "Unknown subcommand. Available: list, create, remove, status" |
| Issue not found | "Issue #<n> not found on GitHub." |
| Cannot remove while inside | "Cannot remove worktree while inside it. Switch to main first." |

---

## Examples

### List Worktrees

```
/worktree list

## Active Worktrees

| Path | Branch | Status |
|------|--------|--------|
| /home/user/git/LuaInTheWeb | main | primary |
| /home/user/git/LuaInTheWeb/.claude/worktrees/issue-42 | 42-add-dark-mode | worktree |
| /home/user/git/LuaInTheWeb/.claude/worktrees/issue-15 | 15-fix-repl-bug | worktree |

**Total**: 3 worktrees
```

### Create Worktree

```
/worktree create 42

[EnterWorktree called with name "issue-42"]
[Session switches to .claude/worktrees/issue-42/]

## Worktree Created for Issue #42

**Issue**: #42 - Add dark mode toggle
**Path**: .claude/worktrees/issue-42
**Session**: Switched to worktree (same session continues)

### Ready to Work

You are now in the worktree. Run:
/issue 42 begin
```

### Remove Worktree

```
/worktree remove 42

## Worktree Removed

- Worktree: .claude/worktrees/issue-42 (removed)
- Branch: 42-add-dark-mode-toggle (deleted)

Active worktrees remaining: 2
```

---

## Notes

- Worktrees share the same `.git` directory, so all branches and history are available
- Each worktree needs its own `npm install` (~200MB)
- **Mutation cache is copied from main** to speed up `npm run test:mutation:scope`
- Use `/status` in any worktree to see overall project state
- The main worktree should generally stay on `main` for coordination
- Worktrees are created at `.claude/worktrees/` (gitignored) to keep the repo clean
