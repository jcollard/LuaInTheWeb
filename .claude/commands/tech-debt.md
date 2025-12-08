# Tech Debt Management

This command helps you view and manage technical debt tracked in GitHub issues.

## View Current Tech Debt

List all open tech debt issues:
```bash
gh issue list --label "tech-debt" --state open --json number,title,url,labels
```

## Prioritization

Issues are tagged with priority in their body:
- **High**: Fix before next release (coding standards, security)
- **Medium**: Fix when working in related area (warnings, performance)
- **Low**: Fix during dedicated cleanup sprints (nice-to-haves)

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
