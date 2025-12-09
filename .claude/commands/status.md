# Project Status

Use this command to get an overview of the project state and suggested next actions.

## 1. Git Status & Worktree Context

Run these commands to understand the current git state and worktree context:

```bash
# Current branch and status
git rev-parse --abbrev-ref HEAD
git status --short

# Commits ahead/behind main
git rev-list --left-right --count main...HEAD 2>/dev/null || echo "0	0"

# Check if in a worktree
git rev-parse --show-toplevel
git worktree list
```

**Worktree Detection:**
- If path contains `issue-<n>`, this is an issue-specific worktree
- Otherwise, this is the main worktree

Report:
- **Worktree**: Main / Issue #<n>
- **Path**: `<worktree-path>`
- **Branch**: `<branch-name>`
- **Status**: Clean / X files modified
- **vs Main**: X commits ahead, Y behind

## 2. GitHub Project Status

### Fetch Project Items

```bash
# Get all project items with their fields
gh project item-list 3 --owner jcollard --format json
```

Parse and report:
- **Total Items**: Count of items in project
- **By Status**: Count items in each status (Todo, In Progress, Done)
- **By Priority**: Count items by priority (P0, P1, P2, P3)
- **In Progress Items**: List items currently being worked on

### Project Board Link

Always include: [📋 View Project Board](https://github.com/users/jcollard/projects/3)

## 3. Roadmap Status (if applicable)

### Find Active Epic(s)

```bash
# List epic directories
ls -d roadmap/*/epic.md 2>/dev/null
```

For each epic, read and report:
- Epic name and overall status
- Current active phase (status = "Approved" or "In Progress")
- Completion percentage (completed phases / total phases)

### Check for Pending Reviews

```bash
# Find any review files
ls roadmap/*/reviews/*.json 2>/dev/null
```

If review files exist:
- Report review timestamp and branch
- Check if stale (compare commits)
- Suggest `/accept-review` if valid

## 4. Build Status Report

Output a formatted status block:

```
## Project Status

### Current Worktree
- **Type**: Main / Issue #<n>
- **Path**: <worktree-path>
- **Branch**: <branch>
- **State**: <clean/dirty>
- **vs Main**: <ahead/behind>

### Other Active Worktrees
| Path | Branch | Issue | State |
|------|--------|-------|-------|
| <path> | <branch> | #<n> | <clean/dirty> |
...
(or "No other worktrees active")

### 📋 GitHub Project Board
[View Board](https://github.com/users/jcollard/projects/3)

| Status | Count |
|--------|-------|
| Todo | X |
| In Progress | Y |
| Done | Z |

**In Progress:**
- #<issue>: <title> (Priority: <P0-P3>, Effort: <XS-XL>)

**High Priority (P0-P1):**
- #<issue>: <title>

### Active Roadmap (if applicable)
- **Epic**: <epic-name>
- **Current Phase**: <phase-name> (<status>)

### Recent Tech Debt
- #<issue>: <title>
```

## 5. Suggest Next Action

Based on the state, suggest ONE clear next action:

| State | Suggestion |
|-------|------------|
| In issue worktree, issue in progress | "Continue working on #<issue>. Run `/issue <n> review` when ready" |
| In main worktree, items "In Progress" | "Issue #<n> is in progress. Switch to its worktree or continue here" |
| High priority items in Todo | "High priority item needs attention: #<issue>. Run `/worktree create <n>` for parallel work or `/issue <n> begin`" |
| Pending review exists (fresh) | "Run `/accept-review` to mark phases complete" |
| Phase status = "Approved" | "Run `/begin` to start implementing <phase-name>" |
| No work in progress | "Pick next item from project board. Run `/issue next` for auto-select or `/worktree create <n>`" |
| Dirty working tree | "You have uncommitted changes. Review and commit or stash" |
| Behind main | "Your branch is behind main. Consider rebasing" |
| Multiple worktrees active | "You have <n> active worktrees. Run `/worktree status` to see their state" |

## 6. Optional: Show Open Tech Debt

```bash
# List open tech debt issues (limit 5)
gh issue list --label "tech-debt" --limit 5 --json number,title
```

---

## Example Output

```
## Project Status

### Current Worktree
- **Type**: Main
- **Path**: C:\Users\User\git\jcollard\LuaInTheWeb
- **Branch**: main
- **State**: Clean
- **vs Main**: Up to date

### Other Active Worktrees
| Path | Branch | Issue | State |
|------|--------|-------|-------|
| LuaInTheWeb-issue-42 | 42-add-dark-mode | #42 | 2 files modified |
| LuaInTheWeb-issue-15 | 15-fix-repl-bug | #15 | Clean |

### Active Epic: IDE-Style Code Editor
- **Status**: In Progress
- **Progress**: 5/6 phases complete (83%)
- **Current Phase**: Phase 5 - Explorer UX Polish (Approved)

### Pending Reviews
None

### Open Tech Debt (5 most recent)
- #8: BashTerminal.tsx - Add unit tests
- #9: LuaRepl.tsx - Add unit tests
- #10: Missing tests for custom hooks
- #11: useToast.ts - Fix ref cleanup warning
- #12: CSS modules migration

---

## Suggested Next Action

You have 2 active worktrees. Phase 5 (Explorer UX Polish) is **Approved** and ready to implement.

Run `/begin` to create a task list and start implementation, or `/worktree status` to check active worktrees.
```
