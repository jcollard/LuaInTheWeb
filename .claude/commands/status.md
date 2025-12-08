# Project Status

Use this command to get an overview of the project state and suggested next actions.

## 1. Git Status

Run these commands to understand the current git state:

```bash
# Current branch and status
git rev-parse --abbrev-ref HEAD
git status --short

# Commits ahead/behind main
git rev-list --left-right --count main...HEAD 2>/dev/null || echo "0	0"
```

Report:
- **Branch**: `<branch-name>`
- **Status**: Clean / X files modified
- **vs Main**: X commits ahead, Y behind

## 2. Roadmap Status

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

## 3. Build Status Report

Output a formatted status block:

```
## Project Status

### Git
- **Branch**: <branch>
- **State**: <clean/dirty>
- **vs Main**: <ahead/behind>

### Active Epic: <epic-name>
- **Status**: <status>
- **Progress**: <X/Y phases complete> (<percentage>%)
- **Current Phase**: <phase-name> (<phase-status>)

### Pending Reviews
- <review-file>: <timestamp> (<fresh/stale>)

### Recent Tech Debt
- #<issue>: <title>
```

## 4. Suggest Next Action

Based on the state, suggest ONE clear next action:

| State | Suggestion |
|-------|------------|
| Pending review exists (fresh) | "Run `/accept-review` to mark phases complete" |
| Pending review exists (stale) | "Review is stale. Run `/code-review` to re-review current state" |
| Phase status = "Approved" | "Run `/begin` to start implementing <phase-name>" |
| Phase status = "In Progress" | "Continue working on <phase-name>. Run `/code-review` when ready" |
| All phases complete | "Epic complete! Consider planning next epic or addressing tech debt" |
| Dirty working tree | "You have uncommitted changes. Review and commit or stash" |
| Behind main | "Your branch is behind main. Consider rebasing" |

## 5. Optional: Show Open Tech Debt

```bash
# List open tech debt issues (limit 5)
gh issue list --label "tech-debt" --limit 5 --json number,title
```

---

## Example Output

```
## Project Status

### Git
- **Branch**: main
- **State**: Clean
- **vs Main**: Up to date

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

Phase 5 (Explorer UX Polish) is **Approved** and ready to implement.

Run `/begin` to create a task list and start implementation.
```
