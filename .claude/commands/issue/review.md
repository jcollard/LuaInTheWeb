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
3. After PR is created, EPIC.md will be updated

**Determine target branch:**
- **Regular issue**: Target `main`
- **Sub-issue of epic**: Target `epic-<epic-number>`

Store this information for Step 2.

---

## Step 1: Gather PR Details

Before running the review script, gather a brief summary and test plan from the work completed.

Based on the completed TodoWrite tasks and implementation work, prepare:

1. **Summary**: 1-3 bullet points describing what was implemented
2. **Test plan**: How the changes were verified (tests added, manual testing done)

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
python scripts/issue-review.py <number> --summary "<summary>" --test-plan "<test-plan>"
```

**For sub-issues (target epic branch):**
```bash
python scripts/issue-review.py <number> --summary "<summary>" --test-plan "<test-plan>" --base epic-<epic-number>
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

## Step 2.5: Update EPIC.md (Sub-Issues Only)

**If this is a sub-issue**, after the PR is created, update EPIC.md in the epic worktree:

1. Navigate to epic worktree (if not already there):
   ```bash
   cd ../LuaInTheWeb-epic-<epic-number>
   ```

2. Update the sub-issue row in EPIC.md:
   ```
   | #<number> | <title> | 🔄 PR Created | <branch> | PR #<pr-number> |
   ```

3. Add progress log entry:
   ```markdown
   ### <date>
   - PR created for #<number>: <title> (PR #<pr-number>)
   ```

4. Update "Last Updated" timestamp

5. Commit and push the EPIC.md update:
   ```bash
   git add EPIC.md
   git commit -m "docs: Update EPIC.md - PR created for #<number>"
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

**EPIC.md Updated:**
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

python scripts/issue-review.py 13 --summary "- Added unit tests for useContextMenu hook\n- Added tests for useTabBar hook" --test-plan "- All new tests pass\n- Mutation score > 80%"

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
