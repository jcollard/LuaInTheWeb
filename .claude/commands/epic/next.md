# Epic Next

Find and start the next sub-issue in the epic, with epic context injected.

**Invoked by**: `/epic <number> next`

**Input**: Epic issue number from `$ARGUMENTS`

---

## Overview

The next command:
1. Reads EPIC-<n>.md for context and progress
2. Finds the next incomplete sub-issue
3. Delegates to `/issue <sub> begin` with epic context
4. Sub-issue branches from `epic-<n>` (not main)

---

## Step 1: Verify Epic Context

**Must be in epic worktree:**

```bash
git rev-parse --show-toplevel
```

If path does NOT contain `epic-<number>`:

```
## Wrong Context

The `/epic next` command must be run from the epic worktree.

**Current location**: <current-path>
**Expected**: .claude/worktrees/epic-<number>

<If epic worktree exists:>
Switch to the epic worktree using `EnterWorktree` with name `epic-<number>`.

<If epic not started:>
Start the epic first:
```bash
/epic <number> begin
```
```

Then STOP.

---

## Step 1.5: Merge Main into Epic Branch

Before starting a new sub-issue, ensure the epic branch is current with main to prevent merge conflicts later.

**Fetch and merge main:**

```bash
# Ensure we're on the epic branch
git checkout epic-<number>

# Fetch latest changes from origin
git fetch origin main

# Merge main into epic branch
git merge origin/main --no-edit
```

**Handle merge result:**

**If merge succeeds (no conflicts):**

```
### Main Integrated ✓

Merged `origin/main` into `epic-<number>` successfully.
- <commit-count> new commits integrated
- Epic branch is now current with main

Continuing to next sub-issue...
```

If already up-to-date:
```
### Main Integrated ✓

Epic branch `epic-<number>` is already up-to-date with main.

Continuing to next sub-issue...
```

Then proceed to Step 2.

**If merge has conflicts:**

```
## Merge Conflicts Detected

Conflicts occurred while merging `origin/main` into `epic-<number>`.

**Conflicting files:**
<list of conflicting files from `git diff --name-only --diff-filter=U`>

**To resolve:**
1. Open the conflicting files and resolve the conflicts
2. Stage the resolved files: `git add <file>`
3. Complete the merge: `git commit`
4. Run `/epic <number> next` again

**To abort the merge:**
```bash
git merge --abort
```
```

Then STOP - do not proceed until conflicts are resolved.

**Update EPIC-<n>.md progress log:**

After successful merge, add an entry to the Progress Log section:

```markdown
### <current-date>
- Integrated main into epic branch (<commit-count> commits)
```

---

## Step 2: Read EPIC-<n>.md Context

Read the EPIC-<n>.md file for:
- Current progress
- Architecture decisions made
- Any blockers
- Open questions

```bash
cat EPIC-<n>.md
```

This context will be injected when starting the sub-issue.

---

## Step 3: Identify Next Sub-Issue

Parse EPIC-<n>.md sub-issues table and cross-reference with GitHub:

```bash
# Get all sub-issue numbers from EPIC-<n>.md
# For each, check current state
gh issue view <sub-number> --json state,title,number
```

**Selection criteria (in order):**
1. State is OPEN (not CLOSED)
2. No active worktree/branch exists
3. First in list order (respects intended sequence)

**Check for active worktrees:**
```bash
git worktree list | grep "issue-<sub-number>"
```

---

## Step 4: Handle Edge Cases

**If all sub-issues are complete:**

```
## All Sub-Issues Complete!

Epic #<number> has all <count> sub-issues completed.

**Ready to create PR to main.**

Run:
```bash
/epic <number> review
```
```

Then STOP.

**If a sub-issue is already in progress:**

```
## Sub-Issue In Progress

There's already an active sub-issue: #<sub> - <title>

**Options:**
1. Continue working on #<sub> (switch to its worktree at `.claude/worktrees/issue-<sub>`)

2. If #<sub> is complete, close it first:
   ```bash
   /issue <sub> review
   ```

Then run `/epic <number> next` again.
```

Then STOP.

---

## Step 5: Inject Epic Context

Before starting the sub-issue, prepare epic context to inject:

```
### Epic Context

**Parent Epic**: #<number> - <epic-title>
**Epic Branch**: epic-<number>
**Progress**: <complete>/<total> sub-issues complete

**Architecture Decisions Made:**
<from EPIC-<n>.md, or "None yet">

**Open Questions:**
<from EPIC-<n>.md, or "None">

**Key Files So Far:**
<from EPIC-<n>.md, or "None yet">

---

**IMPORTANT**: This sub-issue branches from `epic-<number>`, NOT main.
All PRs for this sub-issue should target `epic-<number>`.
```

---

## Step 6: Start Sub-Issue

Output the next sub-issue and delegate:

```
## Next Sub-Issue: #<sub-number>

**Title**: <sub-title>
**Epic**: #<number> - <epic-title>
**Target Branch**: epic-<number>

---

<epic context from Step 5>

---

Now delegating to `/issue <sub-number> begin` with epic context...
```

Then read and execute `.claude/commands/issue/begin.md` with:
- Issue number: `<sub-number>`
- Epic context flag: The sub-issue begin flow will detect epic context

**Note**: The modified `/issue begin` flow (Step 7 of this implementation plan) will:
- Detect the sub-issue is part of an epic
- Branch from `epic-<number>` instead of main
- Include the epic context in the work plan

---

## Step 7: Update EPIC-<n>.md

After starting the sub-issue, update EPIC-<n>.md:

**Update the sub-issue row:**
```
| #<sub> | <title> | 🔄 In Progress | <sub>-<slug> | Started <date> |
```

**Add progress log entry:**
```markdown
### <date>
- Started work on #<sub>: <title>
```

**Update Last Updated:**
```
**Last Updated:** <current-date>
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Not in epic worktree | Show correct path and how to switch |
| EPIC-<n>.md not found | "EPIC-<n>.md missing. Run `/epic <number> begin` to initialize." |
| All sub-issues complete | Prompt to run `/epic <number> review` |
| Sub-issue already in progress | Show path to existing worktree |
| No sub-issues defined | "No sub-issues found. Add them to the epic issue body." |
| Sub-issue not found | "Sub-issue #<sub> not found. Check the epic issue body." |
