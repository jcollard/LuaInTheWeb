# Epic Begin

Start working on an epic by creating the epic branch, worktree, and EPIC.md tracking file.

**Invoked by**: `/epic <number> begin`

**Input**: Epic issue number from `$ARGUMENTS`

---

## Overview

The begin command sets up the epic workspace:

1. Create `epic-<n>` branch from main
2. Create worktree `LuaInTheWeb-epic-<n>`
3. Generate `EPIC.md` with overview, sub-issues, and tracking sections
4. Update GitHub project board status to "In Progress"

---

## Step 1: Check Current Context

**FIRST**, determine if we're in a worktree:

```bash
# Get current worktree path
git rev-parse --show-toplevel

# List all worktrees
git worktree list
```

**Context Detection:**

1. **In epic worktree** (path contains `epic-<n>`):
   - If `<n>` matches the requested epic: Already started, show status
   - If `<n>` doesn't match: Warn and STOP

2. **In issue worktree** (path contains `issue-<n>`):
   - Warn: "You're in an issue worktree. Switch to main to start an epic."
   - Then STOP

3. **In main worktree** (primary repo):
   - **Proceed to Step 2** (create epic workspace)

---

## Step 2: Fetch Epic Details

Get the epic issue information:

```bash
gh issue view <number> --json title,body,number,state,labels
```

**Extract from body:**
- Description/overview text (before `## Sub-Issues`)
- Sub-issues list (from `## Sub-Issues` section)

**Parse sub-issues:**
Look for patterns like:
- `- #60` or `- #60 - Title`
- `* #61` or `* #61: Description`
- `#62` on its own line

For each sub-issue number found, fetch its title:
```bash
gh issue view <sub-number> --json title,state --jq '.title + " (" + .state + ")"'
```

---

## Step 3: Check for Existing Epic Worktree

```bash
git worktree list | grep "epic-<number>"
```

**If worktree exists:**

```
## Epic #<number> Already Started

The epic worktree already exists at: <path>

**To continue working:**
```bash
cd <path>
claude
```

Then run `/epic <number>` to see status.
```

Then STOP.

---

## Step 4: Create Epic Branch and Worktree

**4a. Ensure we're on main and up to date:**

```bash
git checkout main
git pull origin main
```

**4b. Create the epic branch:**

```bash
git checkout -b epic-<number>
```

**4c. Create the worktree:**

```bash
# Create worktree directory
git worktree add ../LuaInTheWeb-epic-<number> epic-<number>
```

**4d. Set up the worktree:**

```bash
cd ../LuaInTheWeb-epic-<number>

# Install dependencies
cd lua-learning-website && npm install && cd ..

# Seed mutation cache if it exists in main
if [ -d "../LuaInTheWeb/lua-learning-website/.stryker-cache" ]; then
  cp -r ../LuaInTheWeb/lua-learning-website/.stryker-cache lua-learning-website/
fi
```

---

## Step 5: Generate EPIC.md

Create the `EPIC.md` file in the epic worktree root:

```bash
# Get current date
date +"%Y-%m-%d"
```

**EPIC.md Template:**

```markdown
# Epic #<number>: <title>

**Status:** In Progress (0/<total> complete)
**Branch:** epic-<number>
**Created:** <current-date>
**Last Updated:** <current-date>

## Overview

<description from epic issue body - text before ## Sub-Issues>

## Architecture Decisions

<!-- Document key decisions as work progresses -->

(none yet)

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #<sub1> | <title1> | <state-emoji> <state> | - | - |
| #<sub2> | <title2> | <state-emoji> <state> | - | - |
...

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Progress Log

<!-- Updated after each sub-issue completion -->

### <current-date>
- Epic started

## Key Files

<!-- Populated as files are created/modified -->

(none yet)

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
```

**State emoji mapping:**
- `OPEN` → ⏳ Pending
- `CLOSED` → ✅ Complete

Write the file:
```bash
# Write EPIC.md to the epic worktree
```

---

## Step 6: Update Project Board Status

Update the epic issue status to "In Progress" in the GitHub Project:

```bash
# Get the project item ID for this epic
gh project item-list 3 --owner jcollard --format json --limit 100
```

Find the item matching the epic issue number, then update:

```bash
# Project configuration
# - Status field ID: PVTSSF_lAHOADXapM4BKKH8zg6G6Vo
# - "In Progress" option ID: 47fc9ee4

gh project item-edit --project-id PVT_kwHOADXapM4BKKH8 --id <item-id> \
  --field-id PVTSSF_lAHOADXapM4BKKH8zg6G6Vo \
  --single-select-option-id 47fc9ee4
```

---

## Step 7: Return to Main and Output Success

```bash
cd ../LuaInTheWeb  # Return to main worktree
```

Output:

```
## Epic #<number> Started

**Title**: <title>
**Branch**: epic-<number>
**Worktree**: ../LuaInTheWeb-epic-<number>
**Sub-Issues**: <count> issues

### Sub-Issues Overview
| # | Title | Status |
|---|-------|--------|
| #<sub1> | <title1> | ⏳ Pending |
| #<sub2> | <title2> | ⏳ Pending |
...

### EPIC.md Created
The tracking file has been created with:
- Overview from epic description
- Sub-issue table with current status
- Sections for architecture decisions, progress log, and blockers

### Next Steps

Open a new Claude Code session in the epic worktree:
```bash
cd ../LuaInTheWeb-epic-<number>
claude
```

Then run:
```bash
/epic <number> next
```

This will identify and start the first sub-issue.
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Not in main worktree | "Switch to main worktree first: `cd ../LuaInTheWeb`" |
| Epic already started | Show worktree path, suggest `/epic <n>` for status |
| No sub-issues found | "No sub-issues found in epic body. Add a `## Sub-Issues` section with issue references." |
| Branch already exists | Check if worktree exists; if not, create worktree from existing branch |
| Worktree creation fails | Report git error and suggest manual fix |
