# PR Review Command

Review a GitHub pull request for code quality, testing, and adherence to project standards.

## Usage

```
/pr-review <number>                    # Review PR by number
/pr-review <url>                       # Review PR by URL
/pr-review <number> accept             # Merge PR, cleanup, create tech debt issues
/pr-review <number> reject "feedback"  # Create rework tasks from feedback
```

## Arguments

- `$ARGUMENTS` contains the PR number/URL and optional subcommand with feedback

Parse the arguments:
- First token: PR number OR URL
- Second token (optional): "accept" or "reject" subcommand
- Remaining tokens (for reject): feedback text in quotes
- If URL: extract PR number from URL (e.g., `https://github.com/jcollard/LuaInTheWeb/pull/27` → `27`)
- If subcommand is "accept": jump to **Step 8: Accept and Merge PR**
- If subcommand is "reject": jump to **Step 9: Reject PR and Create Rework Tasks**

---

## Step 0: Pre-Review Confirmation (Required)

> **IMPORTANT:** Before starting the review, you MUST display the review criteria and get user confirmation.

Output this confirmation message:

```
## Review Criteria Checklist

I will review PR #<number> against the following criteria:

**Code Quality:**
- [ ] Read ALL changed files thoroughly
- [ ] Verify tests perform real testing (not just coverage)
- [ ] Check best practices are followed
- [ ] Identify DRY violations (duplicate code)
- [ ] Identify SOLID principle violations

**Architecture:**
- [ ] UI components are pure (no business logic)
- [ ] All logic extracted into custom hooks
- [ ] Proper separation of concerns

**TypeScript:**
- [ ] No `any` types
- [ ] Explicit return types on public functions
- [ ] Props interfaces defined

**Testing:**
- [ ] Tests accompany code changes
- [ ] AAA pattern used (Arrange-Act-Assert)
- [ ] Edge cases and error cases covered
- [ ] Tests are colocated with components
- [ ] Mutation score >= 80% on changed code

**Security:**
- [ ] No user input rendered as HTML without sanitization
- [ ] No secrets in code
- [ ] Input validation present at boundaries

**Additional Checks:**
- [ ] Error handling is explicit with user-friendly messages
- [ ] Performance considerations (unnecessary re-renders, memory leaks)
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Naming is clear and intention-revealing

Shall I proceed with the review?
```

**Wait for user confirmation before continuing to Step 1.**

If user says no or wants to modify criteria, discuss and adjust as needed.

---

## Step 1: Fetch PR Details

```bash
gh pr view <number> --json number,title,body,state,author,baseRefName,headRefName,files,additions,deletions,changedFiles,commits,reviews,url
```

If the PR doesn't exist, report the error and stop.

---

## Step 2: Display PR Summary

Output the PR information:

```
## PR #<number>: <title>

**Author**: <author>
**State**: <state>
**Base**: <baseRefName> ← <headRefName>
**Changes**: +<additions> -<deletions> in <changedFiles> files

### Description
<body - first 500 chars>

### Files Changed
<list of files>
```

---

## Step 3: Fetch the Diff

Get the full diff for review:

```bash
gh pr diff <number>
```

---

## Step 4: Review Against Coding Standards

Review the diff against the project's coding standards. Check each category:

### Architecture
- [ ] UI components contain NO business logic
- [ ] All logic is extracted into custom hooks
- [ ] Components are pure (props in, JSX out)
- [ ] Related files are co-located in component folders
- [ ] Proper separation of concerns

### TypeScript
- [ ] No `any` types used
- [ ] Explicit return types on public functions
- [ ] Props interfaces defined for all components
- [ ] Interfaces preferred over type aliases for objects

### CSS & Styling
- [ ] CSS modules used (not inline styles or global CSS)
- [ ] Existing styles reused where possible
- [ ] CSS variables used for theming values

### Testing
- [ ] Tests accompany code changes
- [ ] AAA pattern used (Arrange-Act-Assert)
- [ ] Descriptive test names (behavior, not implementation)
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Tests colocated with components

### File Organization
- [ ] Component folder structure followed
- [ ] types.ts for component-specific types
- [ ] index.ts with barrel exports
- [ ] Hooks in separate files with tests

### Error Handling
- [ ] Errors handled explicitly
- [ ] Error states returned from hooks
- [ ] User-friendly error messages

### Security
- [ ] No user input rendered as HTML without sanitization
- [ ] No secrets in code
- [ ] External URLs validated
- [ ] Input validation present

---

## Step 5: Check CI Status (if available)

```bash
gh pr checks <number> --json name,state,conclusion
```

Report the status of CI checks if available.

---

## Step 6: Generate Review Report

Output a structured review report:

```
## PR Review: #<number>

**PR**: <title>
**URL**: <url>
**Author**: <author>
**Branch**: <headRefName> → <baseRefName>

---

### Summary
<Brief summary of what the PR does based on the diff>

### Files Reviewed
| File | Changes | Assessment |
|------|---------|------------|
| <file> | +X -Y | ✅/⚠️/❌ |

---

### Findings

#### Blocking Issues (must fix before merge)
<List of blocking issues, or "None found">

#### Suggestions (non-blocking improvements)
<List of suggestions, or "None">

#### Positive Observations
<What the PR does well>

---

### Checklist Results

| Category | Status | Notes |
|----------|--------|-------|
| Architecture | ✅/⚠️/❌ | <notes> |
| TypeScript | ✅/⚠️/❌ | <notes> |
| CSS & Styling | ✅/⚠️/❌ | <notes> |
| Testing | ✅/⚠️/❌ | <notes> |
| File Organization | ✅/⚠️/❌ | <notes> |
| Error Handling | ✅/⚠️/❌ | <notes> |
| Security | ✅/⚠️/❌ | <notes> |

---

### CI Status
| Check | Status |
|-------|--------|
| <check-name> | ✅/❌/⏳ |

---

### Recommendation

**<APPROVE | REQUEST_CHANGES | COMMENT>**

<Reasoning for the recommendation>

---

### Next Steps
- If APPROVE: Ready to merge
- If REQUEST_CHANGES: Address blocking issues and request re-review
- If COMMENT: Consider suggestions, merge at author's discretion
```

---

## Step 7: Optionally Submit Review to GitHub

After generating the report, ask if the user wants to submit the review to GitHub:

```
Would you like me to submit this review to GitHub?
- Type "approve" to approve the PR
- Type "request changes" to request changes
- Type "comment" to leave as a comment
- Press Enter to skip
```

If user provides input, submit the review:

```bash
# For approve
gh pr review <number> --approve --body "<summary>"

# For request changes
gh pr review <number> --request-changes --body "<summary>"

# For comment only
gh pr review <number> --comment --body "<summary>"
```

---

## Step 8: Accept and Merge PR (Accept Mode)

If subcommand is "accept" (`/pr-review 27 accept`):

### 8a. Fetch PR Details and Validate

```bash
gh pr view <number> --json number,title,body,state,headRefName,baseRefName,mergeable,url
```

**Validation checks:**
- PR must be in OPEN state (not already merged or closed)
- PR must be mergeable (no conflicts)

If validation fails:
```
## Cannot Accept PR #<number>

**Reason**: <PR is already merged | PR is closed | PR has merge conflicts>

<If conflicts:>
Please resolve conflicts first:
1. `git checkout <headRefName>`
2. `git merge <baseRefName>`
3. Resolve conflicts and commit
4. `git push`
```

### 8a.5. Detect Epic Context

**Check if this PR targets an epic branch** (not main):

If `baseRefName` matches pattern `epic-<n>`:
- This is a sub-issue PR being merged to an epic
- Store the epic number for later EPIC.md update
- Set `is_epic_subissue = true`

If `baseRefName` is `main`:
- This is a regular PR
- Set `is_epic_subissue = false`

### 8b. Extract Linked Issues

Parse the PR body to find linked issues using common patterns:
- `Fixes #<number>`
- `Closes #<number>`
- `Resolves #<number>`
- `Fix #<number>`
- `Close #<number>`
- `Resolve #<number>`

```bash
# Example: extract issue numbers from PR body
# Look for patterns like "Fixes #7" or "Closes #123"
```

### 8c. Run Pre-Merge Checks

Before merging, verify the branch is ready:

```bash
# Check if local branch is up to date
git fetch origin

# Verify tests pass (quick check)
cd lua-learning-website && npm run test 2>&1 | tail -5
```

If tests fail:
```
## Cannot Accept PR #<number>

**Reason**: Tests are failing

Run `/code-review` to see full test results and fix issues before merging.
```

### 8d. Merge the PR

Merge the PR using regular merge (preserves commit history for better conflict detection):

```bash
gh pr merge <number> --merge --delete-branch
```

**Merge options:**
- `--merge`: Creates a merge commit preserving commit history (better conflict detection)
- `--delete-branch`: Removes the feature branch after merge

### 8d.5. Update EPIC.md (Sub-Issues Only)

**If `is_epic_subissue` is true**, update EPIC.md in the epic worktree:

1. Navigate to epic worktree:
   ```bash
   cd ../LuaInTheWeb-epic-<epic-number>
   ```

2. Update the sub-issue row in EPIC.md to mark as complete:
   ```
   | #<issue-number> | <title> | ✅ Complete | <branch> | Merged in PR #<pr-number> |
   ```

3. Add progress log entry:
   ```markdown
   ### <date>
   - Completed #<issue-number>: <title>
   - Merged PR #<pr-number> to epic-<epic-number>
   ```

4. Update status line progress count:
   ```
   **Status:** In Progress (<new-complete>/<total> complete)
   ```

5. Update "Last Updated" timestamp

6. Commit and push the EPIC.md update:
   ```bash
   git add EPIC.md
   git commit -m "docs: Update EPIC.md - completed #<issue-number>"
   git push origin epic-<epic-number>
   ```

7. **Check if all sub-issues are complete:**
   - Count completed vs total sub-issues
   - If all complete, output:
     ```
     ### All Sub-Issues Complete!

     Epic #<epic-number> has all <count> sub-issues completed.

     **Ready to create PR to main:**
     ```bash
     /epic <epic-number> review
     ```
     ```

### 8e. Update Local Repository

After merge, update local branch:

**For regular PRs:**
```bash
git checkout main
git pull origin main
```

**For sub-issue PRs (merged to epic):**
```bash
git checkout epic-<epic-number>
git pull origin epic-<epic-number>
```

### 8f. Prompt for Tech Debt Issues (Before Issue Closure)

If tech debt was identified during code review (from `/code-review` or `/issue <n> review`), prompt:

```
### Tech Debt Identified

The following tech debt items were noted during code review:

1. <tech debt item 1>
2. <tech debt item 2>
...

**Create GitHub issues for these items?**
- Type "yes" or "all" to create issues for all items
- Type numbers (e.g., "1,3") to create issues for specific items
- Type "no" or "skip" to skip issue creation
```

If user confirms, create issues and add them to the project board:

**Step 1: Create the GitHub issue**
```bash
gh issue create --title "[Tech Debt] <brief description>" \
  --label "tech-debt" \
  --project "LuaInTheWeb" \
  --body "<!-- tech-debt-id: <unique-id> -->

## Description
<what needs to be fixed>

## Location
- [file.tsx:line](src/path/file.tsx#Lline)

## Found In
PR #<pr-number> - <pr-title>

## Priority
<High|Medium|Low> - <reason>"
```

**Step 2: Add issue to project board**
```bash
# Add the newly created issue to the project board
gh project item-add 3 --owner jcollard --url "https://github.com/jcollard/LuaInTheWeb/issues/<new-issue-number>"
```

**Step 3: Set project fields (Priority and Effort)**
```bash
# Get project field IDs
gh project field-list 3 --owner jcollard --format json

# Get the item ID for the newly added issue
gh project item-list 3 --owner jcollard --format json | # find item by issue URL

# Set Priority field (P2-Medium for most tech debt, P1-High for coding standards violations)
gh project item-edit --project-id <project-id> --id <item-id> --field-id <priority-field-id> --single-select-option-id <priority-option-id>

# Set Effort field (estimate based on description)
gh project item-edit --project-id <project-id> --id <item-id> --field-id <effort-field-id> --single-select-option-id <effort-option-id>
```

**Priority Assignment Guidelines:**
- **P1-High**: Security issues, coding standard violations, test failures
- **P2-Medium**: Missing tests, incomplete error handling, performance issues
- **P3-Low**: Documentation, code style suggestions, nice-to-haves

**Effort Assignment Guidelines:**
- **XS**: Simple fix, < 1 hour
- **S**: 1-2 hours
- **M**: 2-4 hours
- **L**: Half day (4-8 hours)

Repeat for each tech debt item the user confirmed.

### 8g. Verify Issue Closure

GitHub automatically closes issues linked with "Fixes #X" syntax when the PR is merged.

Verify closure:
```bash
# Check each linked issue
gh issue view <linked-issue-number> --json state
```

### 8h. Update Project Board Status to "Done"

Update the linked issue's status to "Done" in the GitHub Project:

```bash
# Get the project item ID for the linked issue
gh project item-list 3 --owner jcollard --format json --limit 100
```

Find the item matching the linked issue number, then update its status:

```bash
# Project configuration
# - Status field ID: PVTSSF_lAHOADXapM4BKKH8zg6G6Vo
# - "Done" option ID: 98236657

gh project item-edit --project-id <project-id> --id <item-id> \
  --field-id PVTSSF_lAHOADXapM4BKKH8zg6G6Vo \
  --single-select-option-id 98236657
```

**Note**: If the project has GitHub automation enabled with "Item closed" → "Done", this may happen automatically.

### 8i. Close Linked Issue (if not auto-closed)

If the linked issue wasn't automatically closed (e.g., no "Fixes #X" in PR body), close it manually:

```bash
gh issue close <linked-issue-number> --reason completed
```

### 8j. Clean Up Worktree

Find and remove the worktree associated with this PR using the Python script:

```bash
# Extract issue number from PR branch name (e.g., "13-fix-repl-ux" → 13)
# Or from linked issues found in step 8b

# Remove the worktree using Python script with headless mode
python scripts/worktree-remove.py <issue-number> --headless
```

The script handles:
- Finding the worktree for the issue
- Removing the worktree directory
- Deleting the branch (auto-force-deletes in headless mode)

Output:
```
### Worktree Cleanup
- ✅ Removed worktree: <worktree-path>
- ✅ Branch deleted
```

If no worktree found, the script reports this and exits cleanly.

### 8k. Output Success Summary

**For regular PRs (merged to main):**
```
## PR #<number> Merged Successfully

**Title**: <title>
**Branch**: <headRefName> → main
**Merge Type**: Regular merge

### Tech Debt Issues Created & Added to Project Board
<If any:>
- #<new-issue>: <title>
  - Added to project board ✅
  - Priority: <P1-High|P2-Medium|P3-Low>
  - Effort: <XS|S|M|L>
<Or:>
- None (no tech debt identified or skipped)

### Linked Issues Closed
<For each linked issue:>
- #<issue-number>: <issue-title> ✅ Closed

### Cleanup
- ✅ Switched to main branch
- ✅ Pulled latest changes
- ✅ Worktree removed (if applicable)

### Next Steps
- Run `/status` to see project board
- Run `/issue next` to pick up next task
```

**For sub-issue PRs (merged to epic branch):**
```
## Sub-Issue PR #<number> Merged to Epic

**Title**: <title>
**Branch**: <headRefName> → epic-<epic-number>
**Merge Type**: Regular merge

### Epic Progress
**Epic #<epic-number>**: <epic-title>
**Progress**: <complete>/<total> sub-issues complete (<percentage>%)

### EPIC.md Updated
- ✅ Sub-issue #<issue-number> marked as complete
- ✅ Progress log updated

### Linked Issues Closed
- #<issue-number>: <issue-title> ✅ Closed

### Cleanup
- ✅ Switched to epic branch
- ✅ Pulled latest changes
- ✅ Sub-issue worktree removed (if applicable)

<If all sub-issues complete:>
### All Sub-Issues Complete!

Ready to create PR to main:
```bash
/epic <epic-number> review
```

<Otherwise:>
### Next Steps
- Run `/epic <epic-number>` to see epic progress
- Run `/epic <epic-number> next` to start next sub-issue
```

---

## Step 9: Reject PR and Create Rework Tasks (Reject Mode)

If subcommand is "reject" (`/pr-review 27 reject "feedback text"`):

### 9a. Parse Feedback

Extract the feedback text from the arguments (everything after "reject").

If no feedback provided:
```
## Missing Feedback

The reject command requires feedback explaining what needs to be changed.

**Usage**: `/pr-review <number> reject "Your feedback here"`

**Example**: `/pr-review 27 reject "Tests are missing for the edge case. Also fix the linting error on line 42."`
```

Then STOP.

### 9b. Fetch PR and Branch Info

```bash
gh pr view <number> --json number,title,headRefName,body
```

Extract:
- PR title
- Branch name
- Linked issue number (from "Fixes #X" in body)

### 9c. Parse Feedback into Rework Tasks

Analyze the feedback text and create actionable tasks:

**Parsing rules:**
- Split on periods, semicolons, or "also"/"and then"
- Look for action verbs: "fix", "add", "remove", "update", "change", "rewrite"
- Identify specific files, lines, or components mentioned
- Group related items

Example feedback:
> "Tests are missing for the edge case when input is empty. Also fix the linting error on line 42 of LuaRepl.tsx. The error message should be more user-friendly."

Parsed tasks:
1. Add tests for edge case: empty input
2. Fix linting error in LuaRepl.tsx:42
3. Improve error message for user-friendliness

### 9d. Create Rework Task List

Use TodoWrite to create a task list:

```
## PR #<number> Rejected - Rework Required

**PR**: <title>
**Branch**: <headRefName>
**Linked Issue**: #<issue-number>

### Reviewer Feedback
<original feedback text>

### Rework Tasks

[TodoWrite creates:]
1. [ ] <parsed task 1>
2. [ ] <parsed task 2>
3. [ ] <parsed task 3>
...
N. [ ] Run `/issue <n> review` when rework is complete

### Files Likely Affected
- <file 1 from feedback>
- <file 2 from feedback>
```

### 9e. Inject TDD Context

```
/tdd
```

Ensure TDD guidelines are loaded for the rework.

### 9f. Output Next Steps

```
---

## Ready to Begin Rework

The task list above has been created based on the reviewer feedback.

**Workflow:**
1. Work through each task following TDD
2. Run scoped mutation tests after changes
3. When all tasks complete, run `/issue <issue-number> review` to update the PR

**Note**: The PR remains open. Your new commits will be added to the existing PR.

Starting with task 1...
```

Then begin working on the first rework task.

---

## Error Handling

| Error | Response |
|-------|----------|
| No PR number provided | "Usage: `/pr-review <number>`, `/pr-review <number> accept`, or `/pr-review <number> reject \"feedback\"`" |
| PR not found | "PR #<number> not found. Check the PR number and try again." |
| PR is closed/merged | "PR #<number> is already <state>. Nothing to review." |
| PR has conflicts | "PR #<number> has merge conflicts. Resolve conflicts before accepting." |
| Tests failing | "Tests are failing. Run `/code-review` to diagnose." |
| Reject without feedback | "The reject command requires feedback. Usage: `/pr-review <number> reject \"feedback\"`" |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: accept, reject" |
| GitHub CLI not available | "GitHub CLI (gh) is required. Install from https://cli.github.com" |

---

## Examples

### Example: Review a PR

```
/pr-review 27

## PR #27: Fix flaky E2E test: EmbeddableEditor renders Monaco editor

**Author**: jcollard
**State**: OPEN
**Base**: main ← 7-tech-debt-flaky-e2e-test
**Changes**: +4 -4 in 1 file

### Description
Increased Monaco editor visibility timeout from 5000ms to 30000ms...

### Files Changed
- lua-learning-website/e2e/embeddable-editor.spec.ts

---

## PR Review: #27

### Summary
This PR fixes a flaky E2E test by increasing the timeout for Monaco editor visibility checks from the default 5000ms to 30000ms. This addresses intermittent CI failures.

### Files Reviewed
| File | Changes | Assessment |
|------|---------|------------|
| e2e/embeddable-editor.spec.ts | +4 -4 | ✅ |

### Findings

#### Blocking Issues
None found

#### Suggestions
- Consider adding a comment explaining why 30000ms was chosen

#### Positive Observations
- Targeted fix that addresses the root cause
- Applied consistently to both beforeEach and test assertion

### Checklist Results
| Category | Status | Notes |
|----------|--------|-------|
| Architecture | ✅ | N/A - test file only |
| TypeScript | ✅ | N/A - test file only |
| Testing | ✅ | Appropriate timeout adjustment |

### Recommendation
**APPROVE**

The fix appropriately addresses the flaky test issue by increasing the timeout for Monaco editor initialization. The change is minimal and targeted.
```

### Example: Accept and Merge a PR

```
/pr-review 27 accept

## Accepting PR #27

### Validating PR...
- State: OPEN ✓
- Mergeable: Yes ✓
- Conflicts: None ✓

### Linked Issues
Found: Fixes #7

### Pre-Merge Checks
- Tests: ✅ 635 passed
- Branch up to date: ✅

### Merging...
✅ PR #27 merged via regular merge
✅ Branch 7-tech-debt-flaky-e2e-test deleted

### Tech Debt Identified

The following tech debt items were noted during code review:

1. Consider adding a comment explaining why 30000ms timeout was chosen

**Create GitHub issues for these items?**

User types: `yes`

### Creating Tech Debt Issues...
✅ Created issue #32: [Tech Debt] Add comment explaining 30000ms timeout choice
✅ Added to project board
✅ Set Priority: P3-Low
✅ Set Effort: XS

### Linked Issue Closure
- #7: [Tech Debt] Flaky E2E test: EmbeddableEditor renders Monaco editor ✅ Closed

### Worktree Cleanup
✅ Removed worktree: C:\Users\User\git\jcollard\LuaInTheWeb-issue-7

---

## PR #27 Merged Successfully

**Title**: Fix flaky E2E test: EmbeddableEditor renders Monaco editor
**Branch**: 7-tech-debt-flaky-e2e-test → main
**Merge Type**: Regular merge

### Tech Debt Issues Created & Added to Project Board
- #32: [Tech Debt] Add comment explaining 30000ms timeout choice
  - Added to project board ✅
  - Priority: P3-Low
  - Effort: XS

### Linked Issues Closed
- #7: [Tech Debt] Flaky E2E test: EmbeddableEditor renders Monaco editor ✅ Closed

### Cleanup
- ✅ Switched to main branch
- ✅ Pulled latest changes
- ✅ Worktree removed

### Next Steps
- Run `/status` to see project board
- Run `/issue next` to pick up next task
```

### Example: Reject a PR with Feedback

```
/pr-review 28 reject "The error handling is incomplete - needs to handle the case when the file doesn't exist. Also add tests for the empty input edge case."

## Parsing Rejection Feedback...

### PR #28: Add file upload feature

**Branch**: 28-add-file-upload
**Linked Issue**: #28

### Reviewer Feedback
> The error handling is incomplete - needs to handle the case when the file doesn't exist. Also add tests for the empty input edge case.

### Rework Tasks

[TodoWrite creates:]
1. [ ] Add error handling for file not found case
2. [ ] Add tests for empty input edge case
3. [ ] Run scoped mutation tests on changes
4. [ ] Run `/issue 28 review` when rework complete

### Files Likely Affected
- src/components/FileUpload/FileUpload.tsx
- src/components/FileUpload/FileUpload.test.tsx

---

## Ready to Begin Rework

The task list above has been created based on the reviewer feedback.

**Workflow:**
1. Work through each task following TDD
2. Run scoped mutation tests after changes
3. When all tasks complete, run `/issue 28 review` to update the PR

**Note**: The PR remains open. Your new commits will be added to the existing PR.

Starting with task 1...
```
