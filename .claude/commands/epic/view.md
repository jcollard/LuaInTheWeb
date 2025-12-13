# Epic View

Display epic overview and progress summary.

**Invoked by**: `/epic <number>` (no subcommand)

**Input**: Epic issue number from `$ARGUMENTS`

---

## Overview

The view command shows:
- Epic title and description
- Progress percentage (completed/total sub-issues)
- Current/next sub-issue to work on
- Any blockers

This is the quick status view. For detailed status with dependency graph, use `/epic <n> status`.

---

## Step 1: Check Epic Context

Determine if we're in the epic worktree:

```bash
git rev-parse --show-toplevel
```

**If in epic worktree** (path contains `epic-<n>` where `<n>` matches):
- Read EPIC-<n>.md for cached status
- Show live GitHub status alongside

**If in main or different worktree**:
- Fetch status from GitHub only
- Indicate if epic worktree exists

---

## Step 2: Fetch Epic Details from GitHub

```bash
gh issue view <number> --json title,body,state,labels
```

**Extract sub-issues from body** (same parsing as begin.md).

For each sub-issue, get current state:
```bash
gh issue view <sub-number> --json title,state,number
```

---

## Step 3: Check for EPIC-<n>.md (if in epic worktree)

If we're in the epic worktree, read EPIC-<n>.md:

```bash
cat EPIC-<n>.md
```

Extract:
- Last Updated date
- Architecture decisions count
- Progress log entries
- Any blockers listed

---

## Step 4: Calculate Progress

Count sub-issues by state:
- **Pending**: OPEN state, not in progress
- **In Progress**: Has "In Progress" in project board OR has active branch
- **Complete**: CLOSED state

```
Progress: <complete>/<total> (<percentage>%)
```

---

## Step 5: Identify Next Sub-Issue

Find the first sub-issue that is:
1. State is OPEN
2. Not currently in progress (no active branch/worktree)

If all are complete or in progress, indicate that.

---

## Step 6: Output Epic Overview

```
## Epic #<number>: <title>

**Progress**: <complete>/<total> complete (<percentage>%)
**Branch**: epic-<number>
**State**: <In Progress | Ready for Review | Complete>

### Progress Bar
[████████░░░░░░░░░░░░] 40% (2/5)

### Sub-Issues

| # | Title | Status |
|---|-------|--------|
| #<sub1> | <title1> | ✅ Complete |
| #<sub2> | <title2> | 🔄 In Progress |
| #<sub3> | <title3> | ⏳ Pending |
...

### Current Status

<If in progress:>
**Currently Working On**: #<current-sub> - <title>

<If next available:>
**Next Up**: #<next-sub> - <title>

<If all complete:>
**All sub-issues complete!** Run `/epic <number> review` to create PR to main.

<If blockers:>
### Blockers
- <blocker from EPIC-<n>.md>

### Quick Actions
- `/epic <number> next` - Start next sub-issue
- `/epic <number> status` - Detailed status with decisions
- `/epic <number> review` - Create PR to main (when complete)

<If not in epic worktree:>
### Worktree
<If exists:>
Epic worktree exists at: <path>
```bash
cd <path>
claude
```

<If not exists:>
Epic not started. Run `/epic <number> begin` to create worktree.
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Epic not found | "Issue #<number> not found. Check the issue number." |
| Not an epic | "Issue #<number> is not an epic. See `/epic` for requirements." |
| EPIC-<n>.md not found | "EPIC-<n>.md not found. Run `/epic <number> begin` to initialize." |
| No sub-issues | "Epic has no sub-issues defined. Add them to the issue body." |
