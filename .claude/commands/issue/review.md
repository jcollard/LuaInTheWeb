# Issue Review

Run code review and create a pull request for the issue.

**Invoked by**: `/issue <number> review`

**Input**: Issue number from `$ARGUMENTS`

---

## Step 1: Run Code Review

First, run the code review checklist:

```
/code-review
```

This validates all tests pass, lint passes, and build succeeds.

---

## Step 2: Create Pull Request

After code review passes, create a PR linked to the issue:

```bash
gh pr create --title "<Issue Title>" --body "$(cat <<'EOF'
## Summary
<Brief summary of changes - 1-3 bullet points>

## Test plan
<How to verify the changes work>

Fixes #<number>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The `Fixes #<number>` syntax automatically closes the issue when the PR is merged.

---

## Step 3: Update Project Status to "Needs Review"

After creating the PR, update the issue status in the GitHub Project:

```bash
# Get the project item ID for this issue
gh project item-list 3 --owner jcollard --format json --limit 100
```

Find the item matching issue number `<number>`, then update its status:

```bash
# Project configuration
# - Project ID: Get from `gh project list --owner jcollard --format json`
# - Status field ID: PVTSSF_lAHOADXapM4BKKH8zg6G6Vo
# - "Needs Review" option ID: 44687678

gh project item-edit --project-id <project-id> --id <item-id> \
  --field-id PVTSSF_lAHOADXapM4BKKH8zg6G6Vo \
  --single-select-option-id 44687678
```

If the update fails, warn but continue (the PR was still created successfully).

---

## Step 4: Output PR URL

After PR creation, output:

```
## PR Created for Issue #<number>

**PR URL**: <pr-url>

The PR is linked to issue #<number> and will auto-close it when merged.

**Next steps:**
- Review the PR on GitHub
- Request reviews if needed
- Merge when approved
```

---

## Example

```
/issue 13 review

## Code Review for Issue #13

Running /code-review...
✓ All 634 tests pass
✓ Lint passes
✓ Build succeeds
✓ E2E tests pass

## Creating PR for Issue #13

Creating pull request...

## Updating Project Status

Moving issue #13 to "Needs Review"...
✓ Status updated

## PR Created for Issue #13

**PR URL**: https://github.com/jcollard/LuaInTheWeb/pull/16

The PR is linked to issue #13 and will auto-close it when merged.

**Next steps:**
- Review the PR on GitHub
- Request reviews if needed
- Merge when approved
```
