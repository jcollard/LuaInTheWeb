# Issue Review

Run code review and create a pull request for the issue.

**Invoked by**: `/issue <number> review`

**Input**: Issue number from `$ARGUMENTS`

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

```bash
python scripts/issue-review.py <number> --summary "<summary>" --test-plan "<test-plan>"
```

**Parameters:**
- `<number>`: The issue number (required)
- `--summary`: Brief summary of changes for PR body (optional)
- `--test-plan`: How changes were tested for PR body (optional)
- `--skip-checks`: Skip test/lint/build validation (not recommended)
- `--dry-run`: Show what would happen without executing

**Safety features:**
- Will NOT run on main/master branch
- Will NOT commit if tests fail
- Branch must match pattern `<number>-*`
- Uses standardized commit message format

---

## Step 3: Output Results

After the script completes successfully, output:

```
## PR Created for Issue #<number>

**PR URL**: <pr-url>

The PR is linked to issue #<number> and will auto-close it when merged.

**Next steps:**
- Run `/pr-review <number>` for code review
- Address any feedback
- Merge when approved
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
