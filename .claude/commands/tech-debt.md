# Tech Debt Management

This command helps you view and manage technical debt tracked in GitHub issues.

## View Current Tech Debt

### From GitHub Project (Recommended)

View tech debt items with priority and effort from the project board:

```bash
# Get all project items
gh project item-list 3 --owner jcollard --format json
```

Filter for tech-debt items and display with project fields:
- **Priority**: P0-Critical, P1-High, P2-Medium, P3-Low
- **Effort**: XS, S, M, L, XL
- **Status**: Todo, In Progress, Done

📋 [View Tech Debt in Project Board](https://github.com/users/jcollard/projects/3?filterQuery=label%3Atech-debt)

### From Issues List

List all open tech debt issues:
```bash
gh issue list --label "tech-debt" --state open --json number,title,url,labels
```

## Prioritization

Issues are prioritized in the GitHub Project with the **Priority** field:
- **P0-Critical**: Blocking issues, security vulnerabilities - fix immediately
- **P1-High**: Fix before next release (coding standards, security)
- **P2-Medium**: Fix when working in related area (warnings, performance)
- **P3-Low**: Fix during dedicated cleanup sprints (nice-to-haves)

**Effort** estimates use t-shirt sizing:
- **XS**: < 1 hour
- **S**: 1-2 hours
- **M**: 2-4 hours
- **L**: 4-8 hours (half day)
- **XL**: 1+ days (consider breaking down)

## Working on Tech Debt

1. **Pick an issue** from the list above
2. **Assign yourself**: `gh issue edit <number> --add-assignee @me`
3. **Create a branch**: `git checkout -b fix/tech-debt-<issue-number>`
4. **Fix the issue** following TDD practices
5. **Close with PR**: Reference `Fixes #<number>` in commit message

## Deduplication

Before creating new tech debt issues, always check if one exists:
```bash
gh issue list --label "tech-debt" --search "<keyword>" --json number,title
```

Each issue contains a hidden `<!-- tech-debt-id: ... -->` comment for exact matching:
```bash
gh issue list --search "tech-debt-id: <id>" --json number
```

## Quick Actions

Close an issue as resolved:
```bash
gh issue close <number> --reason completed
```

Close as won't fix:
```bash
gh issue close <number> --reason "not planned" --comment "Reason: ..."
```

Add a comment with progress:
```bash
gh issue comment <number> --body "Update: ..."
```
