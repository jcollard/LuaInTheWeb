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

## 3. Epic Detection

### Find Active Epics (GitHub Issues)

Check for epic issues (issues with `## Sub-Issues` in body):

```bash
# Get all open issues and check for epics
gh issue list --state open --json number,title,body --limit 50
```

For each issue, check if body contains `## Sub-Issues`. If so, it's an epic.

**Report active epics:**
```
### Active Epics

| # | Title | Status | Sub-Issues |
|---|-------|--------|------------|
| #<n> | <title> | <In Progress/Todo> | <complete>/<total> |

**To work on an epic:** `/epic <n> begin` or `/epic <n> next`
```

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

### Recent Tech Debt
- #<issue>: <title>
```

## 5. Suggest Next Action

Based on the state, suggest ONE clear next action:

| State | Suggestion |
|-------|------------|
| In issue worktree, issue in progress | "Continue working on #<issue>. Run `/issue <n> review` when ready" |
| In epic worktree | "Continue epic work. Run `/epic <n> next` for next sub-issue or `/epic <n> status` for progress" |
| In main worktree, items "In Progress" | "Issue #<n> is in progress. Switch to its worktree or continue here" |
| Active epic exists, not started | "Epic #<n> is available. Run `/epic <n> begin` to start" |
| High priority items in Todo | "High priority item needs attention: #<issue>. Run `/issue <n> begin`" |
| High priority epic in Todo | "Epic #<n> is high priority. Run `/epic <n> begin` to start" |
| No work in progress | "Pick next item from project board. Run `/issue next` for auto-select" |
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

### Active Epics
| # | Title | Status | Sub-Issues |
|---|-------|--------|------------|
| #58 | Add light/dark mode theme switcher | Todo | 0/5 |

**To work on an epic:** `/epic 58 begin` or `/epic 58 next`

### Open Tech Debt (5 most recent)
- #8: BashTerminal.tsx - Add unit tests
- #9: LuaRepl.tsx - Add unit tests
- #10: Missing tests for custom hooks
- #11: useToast.ts - Fix ref cleanup warning
- #12: CSS modules migration

---

## Suggested Next Action

Epic #58 is available. Run `/epic 58 begin` to start, or `/worktree status` to check active worktrees.
```
