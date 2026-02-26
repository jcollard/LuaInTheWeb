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
- Switch to main and create the correct worktree
- Or if the correct worktree exists, switch to it
```

Then STOP - do not proceed further.

---

## Step 1.5: Epic Detection (Sub-Issue Check)

**Check if this issue is a sub-issue of an epic:**

```bash
gh issue view <number> --json body
```

**A sub-issue is detected if its body contains:**
```markdown
## Parent Issue
Part of #<epic-number>
```

Or similar patterns like:
- `Part of #58`
- `Parent: #58`
- `Epic: #58`

**If this is a sub-issue:**

1. Extract the parent epic number
2. Check if we're in the epic worktree:
   ```bash
   git rev-parse --show-toplevel | grep "epic-<epic-number>"
   ```

**If in epic worktree (correct context):**
- Continue to Step 2 with epic context flag set
- The sub-issue will branch from `epic-<n>` instead of main

**If in main worktree:**
- Check if epic worktree exists:
  ```bash
  git worktree list | grep "epic-<epic-number>"
  ```

**If epic worktree exists but we're not in it:**
```
## Sub-Issue of Epic #<epic-number>

This issue is part of epic #<epic-number>: <epic-title>

The epic worktree already exists at `.claude/worktrees/epic-<epic-number>`.

Switch to the epic worktree using `EnterWorktree` with name `epic-<epic-number>`, then run:
```bash
/epic <epic-number> next
```

Or directly:
```bash
/issue <number> begin
```
```

Then STOP.

**If epic not started:**
```
## Sub-Issue of Epic #<epic-number>

This issue is part of epic #<epic-number>: <epic-title>

**The epic has not been started yet.**

Start the epic first to set up the shared workspace:
```bash
/epic <epic-number> begin
```

This will create the epic branch and worktree, then you can work on sub-issues.
```

Then STOP.

**If NOT a sub-issue:**
- Continue to Step 2 normally (regular issue flow)

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
N. [ ] Write E2E tests for affected user flows (if user-facing - see E2E Requirements)

### Files to Modify/Create
- `<file1>` - <what changes>
- `<file2>` - <what changes>

### Edge Cases to Handle
- <edge case 1>
- <edge case 2>

### Testing Strategy
- **Unit tests**: <what to test>
- **E2E tests**: <what user flows to test> (REQUIRED if user-facing, N/A otherwise)
```

**Plan Depth by Complexity:**

| Complexity | Tasks | Plan Includes |
|------------|-------|---------------|
| Simple | 1-5 | Brief approach, files, basic tests |
| Medium | 6-10 | Detailed steps, edge cases, full test strategy |
| Complex | 10+ | Recommend splitting into sub-issues |

**E2E Test Requirements:**

Determine if E2E tests are required based on the issue type:

| Issue Type | E2E Required | Examples |
|------------|--------------|----------|
| Feature adding/modifying UI | **Yes** | New button, form, panel, dialog |
| Bug fix affecting user interaction | **Yes** | Click handler broken, display issue |
| Internal refactoring (no UI changes) | No | Code cleanup, reorganization |
| Pure utility/helper functions | No | Date formatting, string utils |
| Build/config changes | No | Vite config, ESLint rules |
| Documentation-only changes | No | README updates, comments |

**When E2E is required**, add it as an explicit numbered step in the Implementation Steps:
```
N. [ ] Write E2E tests for affected user flows
```

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

After user approves, if in main worktree, create the issue worktree using Claude's built-in `EnterWorktree` tool.

**4a. Call `EnterWorktree`** with name `issue-<number>`:
- This creates the worktree at `.claude/worktrees/issue-<number>/`
- The current session's working directory automatically switches to the worktree
- A new branch is created from HEAD

**4b. Post-setup** (after EnterWorktree completes, now inside the worktree):

1. Install npm dependencies:
   ```bash
   npm --prefix lua-learning-website install --silent
   ```

2. Seed mutation test cache from main:
   ```bash
   MAIN_CACHE="$(git rev-parse --path-format=absolute --git-common-dir)/../lua-learning-website/reports/mutation/.stryker-incremental.json"
   if [ -f "$MAIN_CACHE" ]; then
     mkdir -p lua-learning-website/reports/mutation
     cp "$MAIN_CACHE" lua-learning-website/reports/mutation/.stryker-incremental.json
   fi
   ```

**4c. Continue directly to Step 5** - the session is now in the worktree, so work begins immediately. No need for the user to open a new session.

---

## Step 5: Continue in Worktree (After Approval)

**IMPORTANT**: This step only executes if already in the correct issue-specific worktree AND plan was approved.

### 5.1. Create Branch from Issue

**Determine the base branch:**

- **Regular issue** (not a sub-issue): Branch from `main`
- **Sub-issue of epic**: Branch from `epic-<epic-number>`

**For regular issues:**

```bash
gh issue develop <number> --checkout
```

This creates a branch named `<number>-<issue-title-slug>` and checks it out.
The branch is automatically linked to the issue for tracking.

**For sub-issues (when in epic worktree):**

```bash
# Ensure we're on the epic branch
git checkout epic-<epic-number>

# Create sub-issue branch from epic branch
git checkout -b <number>-<issue-title-slug>

# Link branch to issue (for tracking)
gh issue develop <number> --branch <number>-<issue-title-slug>
```

If the branch already exists, checkout the existing branch instead:
```bash
git checkout <number>-<issue-title-slug>
```

**Note**: Sub-issue branches will be merged back to `epic-<n>` (not main) when complete.

### 5.2. Update Project Status

Update the issue status to "In Progress" using the shared Python module:

```bash
python3 -c "
import sys; sys.path.insert(0, '.')
from scripts.lib.project_board import update_project_status
success, msg = update_project_status('<number>', 'In Progress')
print(msg)
"
```

This handles finding/adding the project item and updating the status field.

### 5.3. Inject Development Context

Run these commands to inject full development guidelines:

```
/tdd
```

This ensures the TDD cycle (Red-Green-Refactor-Mutate) guidelines are loaded.

### 5.4. Create Task List and Begin Implementation

Use the **approved plan** from Step 2 to create a TaskCreate task list:

```
## Starting Issue #<number>

**Plan Approved** ✓

### Implementation Tasks
```

Use TaskCreate to create tasks based on the approved implementation steps.

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

**E2E Tests (REQUIRED for user-facing changes - see E2E Test Requirements in Step 2):**
- Add E2E tests for new/modified user flows
- Run `npm run test:e2e` before completing
- Skip only for internal-only changes (refactoring, utilities, config)

**Completion Checklist:**
- [ ] All unit tests pass: `npm run test`
- [ ] Scoped mutation tests pass (>= 80%)
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] E2E tests pass: `npm run test:e2e` (REQUIRED for user-facing changes, skip for internal-only)

---

## Step 6: Automatic Review on Completion

**IMPORTANT**: After completing ALL implementation tasks and passing the completion checklist above, **automatically run the review script**:

```bash
# Write summary and test plan to the local .tmp/ directory (gitignored)
# This directory is automatically created by the scripts if needed

# Recommended approach - use file-based inputs:
python3 scripts/issue-review.py <number> --summary-file .tmp/summary.txt --test-plan-file .tmp/test-plan.txt

# Or use inline arguments (may have shell escaping issues):
python3 scripts/issue-review.py <number> --summary "summary text" --test-plan "test plan"
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
- All tasks are marked as completed (via TaskUpdate)
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
python3 scripts/update-pr.py <pr-number> commit --message "fix: Address review feedback"

# Or use file-based message (recommended for agents)
python3 scripts/update-pr.py <pr-number> commit --message-file .tmp/commit-msg.txt

# Skip checks if needed (not recommended)
python3 scripts/update-pr.py <pr-number> commit --message "fix: Quick typo fix" --skip-checks

# Update PR description
python3 scripts/update-pr.py <pr-number> update-body --body "Updated description"
python3 scripts/update-pr.py <pr-number> update-body --body-file .tmp/pr-body.txt

# Add a comment to the PR
python3 scripts/update-pr.py <pr-number> comment --body "Ready for re-review"
python3 scripts/update-pr.py <pr-number> comment --body-file .tmp/comment.txt
```

**Note**: Use the local `.tmp/` directory for file-based inputs (gitignored).
