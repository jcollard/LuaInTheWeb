# Accept Review

Use this command to accept a code review and mark phases as complete.

## Prerequisites

A code review must have been completed with `/code-review`, which creates a review record file at `roadmap/{epic}/reviews/{date}_{main-sha}_{branch-sha}.json`.

## Process

### 1. Find Latest Review

Look for the most recent review file in the relevant epic's reviews directory:

```bash
# List review files (most recent first by filename)
ls -1 roadmap/*/reviews/*.json 2>/dev/null | sort -r | head -1
```

If no review file exists, inform the user they need to run `/code-review` first.

### 2. Read Review Record

Parse the review JSON to get:
- `branchCommit`: The commit SHA when review was performed
- `mainCommit`: Main branch SHA when review was performed
- `recommendation`: Whether review passed
- `phasesReviewed`: Which phases were covered

### 3. Check for Staleness

Compare current git state to review state:

```bash
# Get current commits
CURRENT_BRANCH_COMMIT=$(git rev-parse --short HEAD)
CURRENT_MAIN_COMMIT=$(git rev-parse --short main)

# Compare to review record
# If different, review is stale
```

**Staleness conditions:**

| Condition | Severity | Action |
|-----------|----------|--------|
| Branch has new commits | Warning | Show diff count, suggest re-review |
| Main has new commits | Warning | Suggest rebasing before accept |
| Review is > 24h old | Info | Just inform, not blocking |
| Recommendation is "reject" | Blocking | Cannot accept, must re-review |
| Recommendation is "needs-work" | Warning | List findings, ask for confirmation |

### 4. Handle Staleness

If review is stale:

```
## Stale Review Detected

The codebase has changed since this review was performed.

**Review performed**: <timestamp>
**Branch then**: <review-sha> → **now**: <current-sha> (<N> new commits)
**Main then**: <review-main-sha> → **now**: <current-main-sha> (<M> new commits)

### Options:
1. Run `/code-review` again to review current state
2. Use `/accept-review --force` to accept anyway (not recommended)
```

If `--force` is provided, proceed with warning logged.

### 5. Update Roadmap (On Accept)

For each phase in `phasesReviewed`:

1. Update the phase file status from "Approved"/"In Progress" to "Completed"
2. Add completion date
3. Update epic.md progress tracking
4. Update README.md completed plans table

### 6. Clean Up

After successful acceptance:
- Delete the review file (it served its purpose)
- Output confirmation

```
## Review Accepted

**Phases marked complete:**
- Phase 5: Explorer UX Polish

**Roadmap updated:**
- roadmap/ide-editor/005-explorer-polish.md: Status → Completed
- roadmap/ide-editor/epic.md: Progress tracking updated
- roadmap/README.md: Moved to Completed Plans

**Review record deleted**: roadmap/ide-editor/reviews/2025-12-08_abc123_def456.json

Next steps:
- Commit the roadmap updates
- Merge to main (if on feature branch)
```

## Arguments

| Argument | Description |
|----------|-------------|
| `--force` | Accept despite staleness warnings |
| `--epic <name>` | Specify epic if multiple have reviews (optional) |

## Error Cases

| Error | Response |
|-------|----------|
| No review file found | "No review record found. Run `/code-review` first." |
| Review recommendation is "reject" | "Cannot accept a rejected review. Address blocking issues and run `/code-review` again." |
| Multiple epics have reviews | "Multiple review files found. Specify epic with `--epic <name>`." |
