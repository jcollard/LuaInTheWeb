# Issue Review

Run code review and create a pull request for the issue.

**Invoked by**: `/issue <number> review`

**Input**: Issue number from `$ARGUMENTS`

---

## Step 0: Epic Detection (Sub-Issue Check)

**Check if this issue is a sub-issue of an epic:**

```bash
gh issue view <number> --json body
```

**A sub-issue is detected if its body contains:**
- `Part of #<epic-number>`
- `Parent: #<epic-number>`
- `Epic: #<epic-number>`

**If this is a sub-issue:**

1. Extract the parent epic number
2. PR will target `epic-<epic-number>` instead of `main`
3. After PR is created, EPIC-<n>.md will be updated

**Determine target branch:**
- **Regular issue**: Target `main`
- **Sub-issue of epic**: Target `epic-<epic-number>`

Store this information for Step 2.

---

## Step 1: Gather PR Details

Before running the review script, gather a brief summary and test plan from the work completed.

Based on the completed tasks and implementation work, prepare:

1. **Summary**: 1-3 bullet points describing what was implemented
2. **Test plan**: How the changes were verified (tests added, manual testing done)

---

## Step 1.5: Test Value Analysis (BLOCKING)

Before creating the PR, analyze all new tests for value and quality.

### Identify New Test Files

Find all test files changed in this branch:

```bash
git diff --name-only main...HEAD | grep -E '\.(test|spec)\.(ts|tsx)$'
```

If no test files found, skip to Step 2.

### Analyze Each Test

For each test file, read the file and evaluate each test case against these criteria:

| Criterion | Check |
|-----------|-------|
| **AAA Pattern** | Clear Arrange-Act-Assert structure |
| **Meaningful Assertions** | Asserts specific values, not just `toBeDefined()` |
| **Tests Behavior** | Verifies outcomes, not just existence |
| **No Duplicates** | Not testing same thing as another test |
| **Test Names** | Describes behavior ("should X when Y") |
| **Edge Cases** | File covers error cases, boundaries |

### Classification

**Blocking Issues (MUST FIX):**
- Test has NO meaningful assertion (only `toBeDefined()`, `toBeTruthy()`, or none)
- Test is exact duplicate of another test
- Test name is non-descriptive ("test1", "works", "handles")

**Warnings (SHOULD REVIEW):**
- Assertion could be stronger
- Test name could be more descriptive
- Similar tests that might be consolidated

### Output Format

```
## Test Value Analysis

**Tests Analyzed**: <count>
**Blocking Issues**: <count>
**Warnings**: <count>

### Blocking Issues (must fix before PR)

1. `useFeature.test.ts:23` - **No meaningful assertion**
   ```typescript
   it('should work', () => {
     const result = useFeature()
     expect(result).toBeDefined()  // LOW VALUE
   })
   ```
   **Fix**: Assert specific properties:
   ```typescript
   expect(result.isActive).toBe(false)
   expect(result.data).toEqual([])
   ```

### Warnings

1. `useHook.test.ts:67` - Test name not descriptive
   **Suggestion**: "should update state when action dispatched"

---

**Action Required**: Fix blocking issues before creating PR.

To continue anyway (not recommended):
Type "continue without fixing tests"
```

### Blocking Logic

**If blocking issues found:**
- Display the analysis report
- Wait for user response
- Only proceed to Step 2 if user explicitly types "continue without fixing tests"
- If user wants to fix issues, STOP here - they will run `/issue <n> review` again after fixing

**If only warnings found:**
- Display warnings
- Ask: "Continue with PR creation? (y/n)"
- Proceed to Step 2 if user confirms

**If no issues found:**
- Display brief summary: "Test Value Analysis: All <count> tests pass quality checks."
- Continue to Step 2

---

## Step 2: Run the Review Script

Use the automated review script which handles:
- Validating branch matches issue number
- Running all checks (tests, lint, build)
- Creating standardized commit
- Pushing to remote
- Creating PR with proper format
- Updating project status to "Needs Review"

**For regular issues (target main):**
```bash
python3 scripts/issue-review.py <number> --summary "<summary>" --test-plan "<test-plan>"
```

**For sub-issues (target epic branch):**
```bash
python3 scripts/issue-review.py <number> --summary "<summary>" --test-plan "<test-plan>" --base epic-<epic-number>
```

**Parameters:**
- `<number>`: The issue number (required)
- `--summary`: Brief summary of changes for PR body (optional)
- `--test-plan`: How changes were tested for PR body (optional)
- `--base`: Target branch for PR (default: main, use `epic-<n>` for sub-issues)
- `--skip-checks`: Skip test/lint/build validation (not recommended)
- `--dry-run`: Show what would happen without executing

**Safety features:**
- Will NOT run on main/master branch
- Will NOT commit if tests fail
- Branch must match pattern `<number>-*`
- Uses standardized commit message format

**Visual Verification (automatic):**

The review script automatically checks for a Visual Verification section in the issue body. If present, it will:

1. Capture screenshots of specified routes using Playwright
2. Post the screenshots as a comment on the PR
3. Report any visual concerns (non-blocking)

This is completely automatic and non-blocking - if screenshot capture fails or no Visual Verification section exists, the PR creation continues normally.

To enable visual verification for an issue, add a section like:

```markdown
## Visual Verification
- /editor - Editor page with welcome screen
- /repl - REPL with prompt visible
```

See the workflow documentation for more details on the Visual Verification format.

---

## Step 2.5: Update EPIC-<n>.md (Sub-Issues Only)

**If this is a sub-issue**, after the PR is created, update EPIC-<n>.md in the epic worktree:

1. Navigate to epic worktree (if not already there):
   ```bash
   # Epic worktree is at .claude/worktrees/epic-<epic-number>
   ```

2. Update the sub-issue row in EPIC-<n>.md:
   ```
   | #<number> | <title> | 🔄 PR Created | <branch> | PR #<pr-number> |
   ```

3. Add progress log entry:
   ```markdown
   ### <date>
   - PR created for #<number>: <title> (PR #<pr-number>)
   ```

4. Update "Last Updated" timestamp

5. Commit and push the EPIC-<n>.md update:
   ```bash
   git add EPIC-<epic-number>.md
   git commit -m "docs: Update EPIC-<epic-number>.md - PR created for #<number>"
   git push origin epic-<epic-number>
   ```

---

## Step 3: Output Results

After the script completes successfully, output:

**For regular issues:**
```
## PR Created for Issue #<number>

**PR URL**: <pr-url>
**Target**: main

The PR is linked to issue #<number> and will auto-close it when merged.

**Next steps:**
- Run `/pr-review <pr-number>` for code review
- Address any feedback
- Merge when approved
```

**For sub-issues:**
```
## PR Created for Sub-Issue #<number>

**PR URL**: <pr-url>
**Target**: epic-<epic-number>
**Epic**: #<epic-number> - <epic-title>

The PR targets the epic branch and will be merged there (not main).

**EPIC-<epic-number>.md Updated:**
- Sub-issue status: 🔄 PR Created
- Progress log entry added

**Next steps:**
- Run `/pr-review <pr-number>` for code review
- After merge, run `/epic <epic-number>` to check progress
- When all sub-issues complete, run `/epic <epic-number> review`
```

If the script fails, report the error and suggest fixes.

---

## Example

```
/issue 13 review

## Creating PR for Issue #13

Gathering summary from completed tasks...

python3 scripts/issue-review.py 13 --summary "- Added unit tests for useContextMenu hook\n- Added tests for useTabBar hook" --test-plan "- All new tests pass\n- Mutation score > 80%"

[Script output showing validation, commit, push, PR creation]

## PR Created for Issue #13

**PR URL**: https://github.com/jcollard/LuaInTheWeb/pull/16

The PR is linked to issue #13 and will auto-close it when merged.

**Next steps:**
- Run `/pr-review 13` for code review
- Address any feedback
- Merge when approved
```

---

## Error Handling

| Error | Solution |
|-------|----------|
| "Cannot run on main branch" | Switch to feature branch first |
| "Branch does not match issue" | Ensure branch starts with `<number>-` |
| "Tests must pass" | Fix failing tests before review |
| "Lint must pass" | Fix lint errors before review |
| "Build must pass" | Fix build errors before review |
| "PR already exists" | Script reports existing PR URL |
