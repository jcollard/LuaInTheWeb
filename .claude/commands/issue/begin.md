# Issue Begin

Start working on an issue with the Plan → Approve → Execute flow.

**Invoked by**: `/issue <number> begin`

**Input**: Issue number from `$ARGUMENTS`

---

## Overview

The begin command follows a **Plan → Approve → Execute** flow:

1. Generate implementation plan based on complexity
2. **Wait for human approval** before proceeding
3. On approval: create worktree and start work

---

## Step 1: Check Worktree Context

**FIRST**, determine if we're in a worktree:

```bash
# Get current worktree path
git rev-parse --show-toplevel

# List all worktrees to determine context
git worktree list
```

**Worktree Detection Logic:**

1. **In issue-specific worktree** (path contains `issue-<n>`):
   - If `<n>` matches the requested issue: **Proceed to Step 2** (generate plan)
   - If `<n>` doesn't match: Warn and STOP

2. **In main worktree** (primary repo, path does NOT contain `issue-`):
   - **Proceed to Step 2** (generate plan first, worktree created after approval)

**If in wrong worktree:**

```
## Wrong Worktree

You're in the worktree for issue #<current>, but trying to work on issue #<requested>.

**Options:**
- Open a new Claude Code session in the correct worktree:
  ```bash
  cd <path-to-correct-worktree>
  claude
  ```
- Or switch to main first: `cd ../LuaInTheWeb`
```

Then STOP - do not proceed further.

---

## Step 2: Generate Implementation Plan

Analyze the issue and generate an implementation plan:

```
## Implementation Plan for Issue #<number>

**Issue**: <title>
**Complexity**: <Simple|Medium|Complex>
**Estimated Tasks**: <count>

### Approach
<Brief description of how to solve this - 2-3 sentences>

### Implementation Steps
1. [ ] <Step 1 - test first>
2. [ ] <Step 2>
3. [ ] <Step 3>
...

### Files to Modify/Create
- `<file1>` - <what changes>
- `<file2>` - <what changes>

### Edge Cases to Handle
- <edge case 1>
- <edge case 2>

### Testing Strategy
- **Unit tests**: <what to test>
- **E2E tests**: <what user flows, if applicable>
```

**Plan Depth by Complexity:**

| Complexity | Tasks | Plan Includes |
|------------|-------|---------------|
| Simple | 1-5 | Brief approach, files, basic tests |
| Medium | 6-10 | Detailed steps, edge cases, full test strategy |
| Complex | 10+ | Recommend splitting into sub-issues |

For **Complex** issues (10+ tasks), output:

```
## Complex Issue Detected

This issue has <N> estimated tasks, which is too large for a single implementation cycle.

**Recommendation**: Split into sub-issues (epic pattern)

### Suggested Sub-Issues
1. <sub-issue 1 title> - <scope>
2. <sub-issue 2 title> - <scope>
3. <sub-issue 3 title> - <scope>

**Options:**
- Type "split" to create these sub-issues and link them to a parent epic
- Type "proceed" to implement as a single large issue (not recommended)
- Type "cancel" to abort
```

Then STOP and wait for user decision.

---

## Step 3: Wait for Approval

After outputting the plan, **STOP and wait for user approval**:

```
---

**Ready to proceed?**
- Type "approve" or "yes" to create worktree and begin implementation
- Type "revise" to request changes to the plan
- Type "cancel" to abort

Waiting for approval...
```

**IMPORTANT**: Do NOT proceed until the user explicitly approves. This is a checkpoint.

---

## Step 4: On Approval - Create Worktree (if in main)

After user approves, if in main worktree, create the issue worktree using the Python script.

**Delegate to Python script:**

```bash
python scripts/worktree-create.py <number>
```

The script handles:
1. Checking if worktree already exists (reports path if so)
2. Fetching issue title from GitHub
3. Creating slugified branch name (`<number>-<title-slug>`)
4. Creating worktree at `../LuaInTheWeb-issue-<number>`
5. Installing npm dependencies
6. Seeding mutation test cache from main
7. Updating issue status to "In Progress" in GitHub Project

After the script completes, output:

```
### Implementation Plan Approved ✓

<repeat the plan summary>

### Next Steps

Open a new Claude Code session in the worktree:
```bash
cd <worktree-path>
claude
```

Then run:
```bash
/issue <number> begin
```

**Note**: The worktree is ready with all dependencies. Open a new session there to begin work.
```

Then STOP - the user must open a new session in the worktree.

---

## Step 5: Continue in Worktree (After Approval)

**IMPORTANT**: This step only executes if already in the correct issue-specific worktree AND plan was approved.

### 5.1. Create Branch from Issue

Create and checkout a branch linked to the issue:

```bash
gh issue develop <number> --checkout
```

This creates a branch named `<number>-<issue-title-slug>` and checks it out.
The branch is automatically linked to the issue for tracking.

If the branch already exists, checkout the existing branch instead:
```bash
git checkout <number>-<issue-title-slug>
```

### 5.2. Update Project Status

Update the issue status to "In Progress" in the GitHub Project:

```bash
# Get the project item ID for this issue
gh project item-list 3 --owner jcollard --format json

# Find the item matching the issue number, then update its status
# Use gh project item-edit with the item ID and field ID
```

The project uses these Status values (field ID: `PVTSSF_lAHOADXapM4BKKH8zg6G6Vo`):
- `Concept` (id: f53885f8) - Needs more definition
- `Todo` (id: f75ad846) - Ready to work on
- `In Progress` (id: 47fc9ee4) - Actively being worked on
- `Needs Review` (id: 44687678) - PR created, awaiting review
- `Done` (id: 98236657) - Completed

**Note**: Project field updates require knowing the item ID. If the issue isn't in the project yet, add it first:
```bash
gh project item-add 3 --owner jcollard --url "https://github.com/jcollard/LuaInTheWeb/issues/<number>"
```

### 5.3. Inject Development Context

Run these commands to inject full development guidelines:

```
/tdd
```

This ensures the TDD cycle (Red-Green-Refactor-Mutate) guidelines are loaded.

### 5.4. Create Task List and Begin Implementation

Use the **approved plan** from Step 2 to create a TodoWrite task list:

```
## Starting Issue #<number>

**Plan Approved** ✓

### Implementation Tasks
```

Use TodoWrite to create tasks based on the approved implementation steps.

Then begin implementation following TDD:

### Development Practices (Always Apply)

**TDD Cycle (Red-Green-Refactor-Mutate):**
1. **RED**: Write a failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while tests pass
4. **MUTATE**: Run scoped mutation tests on changed files

**After each task:**
```bash
# Run scoped mutation tests
npm run test:mutation:scope "src/components/AffectedComponent/**"
```
- Mutation score must be >= 80% on new/modified files

**E2E Tests (if user-facing changes):**
- Add E2E tests for new user flows
- Run `npm run test:e2e` before completing

**Completion Checklist:**
- [ ] All unit tests pass: `npm run test`
- [ ] Scoped mutation tests pass (>= 80%)
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] E2E tests pass (if applicable): `npm run test:e2e`

---

## Step 6: Automatic Review on Completion

**IMPORTANT**: After completing ALL implementation tasks and passing the completion checklist above, **automatically run the review script**:

```bash
# Write summary and test plan to the local .tmp/ directory (gitignored)
# This directory is automatically created by the scripts if needed

# Recommended approach - use file-based inputs:
python scripts/issue-review.py <number> --summary-file .tmp/summary.txt --test-plan-file .tmp/test-plan.txt

# Or use inline arguments (may have shell escaping issues):
python scripts/issue-review.py <number> --summary "summary text" --test-plan "test plan"
```

**Note**: The `.tmp/` directory is gitignored, so temp files won't be committed.

This script is **auto-approved** and will:
1. Validate branch matches issue number
2. Run all checks (tests, lint, build)
3. Create standardized commit
4. Push to remote
5. Create PR with proper format
6. Update project status to "Needs Review"

**When to trigger automatic review:**
- All TodoWrite tasks are marked as completed
- All checklist items above pass
- No blocking issues or errors remain

**When NOT to trigger automatic review:**
- Tests are failing
- Build errors exist
- Mutation score is below 80%
- User explicitly requested to stop before review

If any blocking issues exist, report them and wait for user input instead of triggering review.

After PR is created, output the PR URL and suggest next steps:
- Run `/pr-review <number>` for code review
- Address any feedback
- Merge when approved

---

## Step 7: Updating an Existing PR (Rework)

If changes are requested after PR creation, use `update-pr.py` to add commits:

```bash
# Add additional commits to the PR (runs checks by default)
python scripts/update-pr.py <pr-number> commit --message "fix: Address review feedback"

# Or use file-based message (recommended for agents)
python scripts/update-pr.py <pr-number> commit --message-file .tmp/commit-msg.txt

# Skip checks if needed (not recommended)
python scripts/update-pr.py <pr-number> commit --message "fix: Quick typo fix" --skip-checks

# Update PR description
python scripts/update-pr.py <pr-number> update-body --body "Updated description"
python scripts/update-pr.py <pr-number> update-body --body-file .tmp/pr-body.txt

# Add a comment to the PR
python scripts/update-pr.py <pr-number> comment --body "Ready for re-review"
python scripts/update-pr.py <pr-number> comment --body-file .tmp/comment.txt
```

**Note**: Use the local `.tmp/` directory for file-based inputs (gitignored).
