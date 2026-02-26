# Epic Review

Create the final PR to merge the completed epic branch into main.

**Invoked by**: `/epic <number> review`

**Input**: Epic issue number from `$ARGUMENTS`

---

## Overview

The review command:
1. Verifies all sub-issues are complete
2. Runs full test suite on epic branch
3. Creates PR from `epic-<n>` → `main`
4. Generates comprehensive PR description from EPIC-<n>.md
5. Updates project board status

---

## Step 1: Verify Epic Context

**Must be in epic worktree:**

```bash
git rev-parse --show-toplevel
```

If NOT in `epic-<number>` worktree:

```
## Wrong Context

The `/epic review` command must be run from the epic worktree.

**Current location**: <current-path>
**Expected**: .claude/worktrees/epic-<number>

Switch to the epic worktree using `EnterWorktree` with name `epic-<number>`.
```

Then STOP.

---

## Step 2: Verify All Sub-Issues Complete

```bash
# Get all sub-issues from EPIC-<n>.md or GitHub
gh issue view <number> --json body
```

For each sub-issue, verify state is CLOSED:

```bash
gh issue view <sub-number> --json state
```

**If any sub-issues are NOT complete:**

```
## Epic Not Ready for Review

The following sub-issues are not yet complete:

| # | Title | Status |
|---|-------|--------|
| #<sub1> | <title> | ⏳ Pending |
| #<sub2> | <title> | 🔄 In Progress |

**Complete all sub-issues first:**
```bash
/epic <number> next
```

Or check status:
```bash
/epic <number> status
```
```

Then STOP.

---

## Step 3: Ensure Epic Branch is Up to Date

```bash
# Make sure we're on the epic branch
git checkout epic-<number>

# Pull any remote changes
git pull origin epic-<number>

# Check if main has advanced since epic started
git fetch origin main
git log epic-<number>..origin/main --oneline
```

**If main has new commits:**

```
## Main Branch Has Advanced

Main has <count> new commits since the epic branch was created.

**Options:**

1. **Rebase epic onto main** (recommended for clean history):
   ```bash
   git rebase origin/main
   ```

2. **Merge main into epic** (preserves history):
   ```bash
   git merge origin/main
   ```

After resolving any conflicts, run `/epic <number> review` again.
```

Then STOP and wait for user to resolve.

---

## Step 4: Run Full Test Suite

```bash
# Run all tests
npm --prefix lua-learning-website run test

# Run linter
npm --prefix lua-learning-website run lint

# Run build
npm --prefix lua-learning-website run build

# Run E2E tests
npm --prefix lua-learning-website run test:e2e
```

**If any check fails:**

```
## Checks Failed

The following checks failed:

<check>: <error summary>

Fix the issues and run `/epic <number> review` again.
```

Then STOP.

---

## Step 5: Generate PR Description from EPIC-<n>.md

Read EPIC-<n>.md and extract:
- Overview
- Architecture decisions
- Key files
- Sub-issues completed

**PR Title:**
```
feat(epic-<number>): <epic-title>
```

**PR Body Template:**

```markdown
## Summary

<Overview from EPIC-<n>.md>

## Sub-Issues Completed

| # | Title | PR |
|---|-------|-----|
| #<sub1> | <title> | #<pr1> |
| #<sub2> | <title> | #<pr2> |
...

## Architecture Decisions

<From EPIC-<n>.md, or "No major architecture decisions">

## Key Changes

### Files Added
- `<file>` - <purpose>

### Files Modified
- `<file>` - <changes>

## Testing

- All unit tests pass
- All E2E tests pass
- Lint passes
- Build succeeds

## Manual Testing

<Generated checklist based on changed files - use generate_manual_testing_checklist() from scripts/lib/manual_testing.py>

**Categories to check:**
- **UI Changes**: Verify affected components render correctly
- **User Interactions**: Test hooks behavior in affected components
- **Visual Changes**: Check styling changes visually
- **Page Changes**: Navigate to affected pages and verify
- **Config Changes**: Verify dev server and build work

## Closes

Fixes #<epic-number>
<For each sub-issue:>
Fixes #<sub-number>

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Step 6: Create the PR

```bash
gh pr create \
  --base main \
  --head epic-<number> \
  --title "feat(epic-<number>): <title>" \
  --body "$(cat <<'EOF'
<generated PR body>
EOF
)"
```

---

## Step 7: Update Project Board

Update epic issue status to "Needs Review" using the shared Python module:

```bash
python3 -c "
import sys; sys.path.insert(0, '.')
from scripts.lib.project_board import update_project_status
success, msg = update_project_status('<epic-number>', 'Needs Review')
print(msg)
"
```

---

## Step 8: Update EPIC-<n>.md

Add final entry to progress log:

```markdown
### <date>
- Epic PR created: #<pr-number>
- All <count> sub-issues complete
- Ready for final review
```

Update status:
```
**Status:** Needs Review (<count>/<count> complete)
```

Commit and push:

```bash
git add EPIC-<number>.md
git commit -m "docs: Update EPIC-<number>.md with final PR status"
git push origin epic-<number>
```

---

## Step 9: Output Success

```
## Epic #<number> PR Created

**Title**: <epic-title>
**PR**: #<pr-number>
**URL**: <pr-url>
**Branch**: epic-<number> → main

### Summary
- <count> sub-issues completed
- All tests passing
- Ready for review

### Sub-Issues Included
| # | Title |
|---|-------|
| #<sub1> | <title> |
| #<sub2> | <title> |
...

### Next Steps

1. **Review the PR**: `/pr-review <pr-number>`
2. **If approved**: `/pr-review <pr-number> accept`

This will:
- Merge the epic to main
- Close all linked issues
- Clean up the epic worktree
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Not in epic worktree | Show correct path |
| Sub-issues incomplete | List incomplete issues, suggest `/epic next` |
| Tests failing | Show failures, suggest fixes |
| Main has diverged | Suggest rebase or merge |
| PR already exists | Show existing PR URL |
| No commits on epic | "Epic branch has no changes. Complete sub-issues first." |
