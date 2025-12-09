# Epic Next

Find and start the next sub-issue in the epic, with epic context injected.

**Invoked by**: `/epic <number> next`

**Input**: Epic issue number from `$ARGUMENTS`

---

## Overview

The next command:
1. Reads EPIC.md for context and progress
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
**Expected**: ../LuaInTheWeb-epic-<number>

<If epic worktree exists:>
Switch to the epic worktree:
```bash
cd ../LuaInTheWeb-epic-<number>
claude
```

<If epic not started:>
Start the epic first:
```bash
cd ../LuaInTheWeb
/epic <number> begin
```
```

Then STOP.

---

## Step 2: Read EPIC.md Context

Read the EPIC.md file for:
- Current progress
- Architecture decisions made
- Any blockers
- Open questions

```bash
cat EPIC.md
```

This context will be injected when starting the sub-issue.

---

## Step 3: Identify Next Sub-Issue

Parse EPIC.md sub-issues table and cross-reference with GitHub:

```bash
# Get all sub-issue numbers from EPIC.md
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
1. Continue working on #<sub>:
   ```bash
   cd ../LuaInTheWeb-issue-<sub>
   claude
   ```

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
<from EPIC.md, or "None yet">

**Open Questions:**
<from EPIC.md, or "None">

**Key Files So Far:**
<from EPIC.md, or "None yet">

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

## Step 7: Update EPIC.md

After starting the sub-issue, update EPIC.md:

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
| EPIC.md not found | "EPIC.md missing. Run `/epic <number> begin` to initialize." |
| All sub-issues complete | Prompt to run `/epic <number> review` |
| Sub-issue already in progress | Show path to existing worktree |
| No sub-issues defined | "No sub-issues found. Add them to the epic issue body." |
| Sub-issue not found | "Sub-issue #<sub> not found. Check the epic issue body." |
