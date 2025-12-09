# PR Review Command

Review a GitHub pull request for code quality, testing, and adherence to project standards.

## Usage

```
/pr-review <number>           # Review PR by number
/pr-review <url>              # Review PR by URL
/pr-review <number> accept    # Merge PR to main and close linked issues
```

## Arguments

- `$ARGUMENTS` contains the PR number/URL and optional subcommand

Parse the arguments:
- First token: PR number OR URL
- Second token (optional): "accept" subcommand
- If URL: extract PR number from URL (e.g., `https://github.com/jcollard/LuaInTheWeb/pull/27` → `27`)
- If subcommand is "accept": jump to **Step 8: Accept and Merge PR**

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

Merge the PR using squash merge (combines all commits into one):

```bash
gh pr merge <number> --squash --delete-branch
```

**Merge options:**
- `--squash`: Combines all commits into a single commit (cleaner history)
- `--delete-branch`: Removes the feature branch after merge

### 8e. Update Local Repository

After merge, update local main branch:

```bash
git checkout main
git pull origin main
```

### 8f. Verify Issue Closure

GitHub automatically closes issues linked with "Fixes #X" syntax when the PR is merged.

Verify closure:
```bash
# Check each linked issue
gh issue view <linked-issue-number> --json state
```

### 8g. Update Project Board (if applicable)

If the project has automation enabled, issues will automatically move to "Done".

If not, manually update:
```bash
# Get project item ID and update status to Done
gh project item-list 3 --owner jcollard --format json | # find item
gh project item-edit --project-id <project-id> --id <item-id> --field-id <status-field-id> --single-select-option-id 98236657
```

### 8h. Output Success Summary

```
## PR #<number> Merged Successfully

**Title**: <title>
**Branch**: <headRefName> → <baseRefName>
**Merge Type**: Squash merge

### Linked Issues Closed
<For each linked issue:>
- #<issue-number>: <issue-title> ✅ Closed

### Local Repository
- ✅ Switched to main branch
- ✅ Pulled latest changes

### Next Steps
- Run `/status` to see project board
- Run `/issue next` to pick up next task
```

---

## Error Handling

| Error | Response |
|-------|----------|
| No PR number provided | "Usage: `/pr-review <number>`, `/pr-review <url>`, or `/pr-review <number> accept`" |
| PR not found | "PR #<number> not found. Check the PR number and try again." |
| PR is closed/merged | "PR #<number> is already <state>. Nothing to review." |
| PR has conflicts | "PR #<number> has merge conflicts. Resolve conflicts before accepting." |
| Tests failing | "Tests are failing. Run `/code-review` to diagnose." |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: accept" |
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
✅ PR #27 merged via squash merge
✅ Branch 7-tech-debt-flaky-e2e-test deleted

---

## PR #27 Merged Successfully

**Title**: Fix flaky E2E test: EmbeddableEditor renders Monaco editor
**Branch**: 7-tech-debt-flaky-e2e-test → main
**Merge Type**: Squash merge

### Linked Issues Closed
- #7: [Tech Debt] Flaky E2E test: EmbeddableEditor renders Monaco editor ✅ Closed

### Local Repository
- ✅ Switched to main branch
- ✅ Pulled latest changes

### Next Steps
- Run `/status` to see project board
- Run `/issue next` to pick up next task
```
