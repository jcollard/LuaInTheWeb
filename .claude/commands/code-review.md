# Code Review Checklist

Use this checklist when reviewing code changes.

## IMPORTANT: Start Mutation Tests First

**ALWAYS start mutation tests in the background BEFORE reviewing anything else.**

Mutation tests take the longest to run. Start them immediately, then do the rest of the review while they execute:

```bash
# Start mutation tests in background FIRST
npm run test:mutation &
```

Or use Bash tool with `run_in_background: true`.

After completing ALL other review steps, check if mutation tests finished:
- If still running, wait in 60-second intervals
- Only proceed to Final Checks after mutation tests complete

---

## Tech Debt Tracking

After completing the review, create GitHub issues for any non-blocking findings:

1. **Check for existing issues** before creating new ones:
   ```bash
   gh issue list --label "tech-debt" --search "<unique-identifier>" --json number
   ```

2. **Create issues** with deduplication IDs in the body:
   ```bash
   gh issue create --title "[Tech Debt] <file>: <brief description>" \
     --label "tech-debt" \
     --body "<!-- tech-debt-id: <unique-id> -->

   ## Description
   <what needs to be fixed>

   ## Location
   - [file.tsx:line](src/path/file.tsx#Lline)

   ## Suggested Fix
   <how to fix it>

   ## Priority
   High|Medium|Low - <reason>

   ## Found In
   Code review of \`<branch-name>\` branch"
   ```

3. **Unique ID format**: `<filename>-<issue-type>-<line-numbers>`
   - Example: `luarepl-any-types-26-93-101`
   - Example: `stryker-exclude-test-files`

4. **Priority levels**:
   - **High**: Violates coding standards, security issues
   - **Medium**: ESLint warnings, performance issues
   - **Low**: Nice-to-have improvements

## Architecture

- [ ] UI components contain NO business logic
- [ ] All logic is extracted into custom hooks
- [ ] Components are pure (props in, JSX out)
- [ ] Related files are co-located in component folders
- [ ] Proper separation of concerns

## TypeScript

- [ ] No `any` types used
- [ ] Explicit return types on public functions
- [ ] Props interfaces defined for all components
- [ ] Interfaces preferred over type aliases for objects
- [ ] Types exported from index.ts

## CSS & Styling

- [ ] CSS modules used (not inline styles or global CSS)
- [ ] Existing styles reused where possible
- [ ] CSS variables used for theming values
- [ ] No duplicate styles across modules

## Testing

- [ ] Tests written BEFORE implementation (TDD)
- [ ] AAA pattern used (Arrange-Act-Assert)
- [ ] Descriptive test names (behavior, not implementation)
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Mutation score > 80%
- [ ] Tests colocated with components

## E2E Testing (for user-facing features)

- [ ] E2E tests cover core user flows
- [ ] Test page created at `/test/<feature>` (dev only)
- [ ] Tests wait for async operations (Lua engine, Monaco)
- [ ] Clear assertions on user-visible outcomes

## File Organization

- [ ] Component folder structure followed
- [ ] types.ts for component-specific types
- [ ] index.ts with barrel exports
- [ ] Hooks in separate files with tests
- [ ] No orphaned files

## Error Handling

- [ ] Errors handled explicitly
- [ ] Error states returned from hooks
- [ ] Error boundaries used where appropriate
- [ ] User-friendly error messages

## Performance

- [ ] useMemo/useCallback used appropriately (not overused)
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized if needed
- [ ] Lazy loading for heavy components

## Accessibility

- [ ] Semantic HTML used
- [ ] Interactive elements keyboard accessible
- [ ] ARIA attributes added where needed
- [ ] Focus management handled

## Security

- [ ] No user input rendered as HTML without sanitization
- [ ] No secrets in code
- [ ] External URLs validated
- [ ] Input validation present

## Final Checks

### 1. Run These First (Quick)
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No console.log statements left in code

### 2. Check Mutation Tests (Started at Beginning)

Now check if mutation tests (started at the beginning) have completed:

```bash
# Check mutation test output
# If using background job, check its status
```

- If still running: Wait in **60-second intervals** using `BashOutput` with `wait_up_to: 60`
- Continue waiting until complete
- [ ] `npm run test:mutation` > 80%

### 3. E2E Tests (If User-Facing Features)
- [ ] `npm run test:e2e` passes

---

## Update Plan Checkboxes

Before generating the review record, update the active phase's plan file to mark completed items.

### 1. Find Active Phase

```bash
# Find the active phase file (status = "Approved" or "In Progress")
ls roadmap/*/[0-9]*.md 2>/dev/null
```

Read each phase file and identify the one with status "Approved" or "In Progress".

### 2. Mark Implementation Items Complete

If the code review passes (all tests, lint, build, mutation, e2e checks pass), update the plan file:

1. **Read the plan file** to find unchecked items (`- [ ]`)
2. **Mark all implementation items as complete** (`- [x]`)
3. Sections to update:
   - Functional Requirements
   - Non-Functional Requirements
   - Components Affected
   - Edge Cases to Handle
   - Implementation Plan (all steps and sub-items)
   - Integration Tests
   - Manual Testing Checklist
   - E2E Test Cases
   - Success Metrics

### 3. Update Plan Status

If all items are now complete:
- Change status from "Approved" to "In Progress" (if starting implementation)
- Or keep as "In Progress" (if continuing implementation)

**Note**: Status changes to "Completed" only happen via `/accept-review`.

---

## Review Record

After completing all checks, generate a review record:

### 1. Collect Review Metadata

Run these commands to gather review metadata:

```bash
# Get current timestamp
date -u +"%Y-%m-%dT%H:%M:%SZ"

# Get current branch name and commit
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD

# Get main branch commit
git rev-parse --short main
```

### 2. Identify Active Epic

Determine which epic this review covers by examining modified files:

```bash
# Check which roadmap phases were modified or are relevant
git diff --name-only main...HEAD | grep -E "^(src|roadmap)/"
```

### 3. Write Review Record

Create a JSON review file at `roadmap/{epic}/reviews/{date}_{main-sha}_{branch-sha}.json`:

```json
{
  "timestamp": "<ISO 8601 timestamp>",
  "branch": "<branch-name>",
  "branchCommit": "<branch-sha>",
  "mainCommit": "<main-sha>",
  "findings": {
    "blocking": [],
    "techDebt": ["<issue-numbers>"],
    "warnings": ["<descriptions>"]
  },
  "checks": {
    "tests": "pass|fail",
    "lint": "pass|fail",
    "build": "pass|fail",
    "mutationScore": "<percentage>",
    "e2e": "pass|fail|skipped"
  },
  "phasesReviewed": ["<phase-ids>"],
  "recommendation": "accept|reject|needs-work",
  "notes": "<summary of review findings>"
}
```

### 4. Output Review Summary

At the end of the review, output a summary block:

```
## Review Summary

**Timestamp**: <timestamp>
**Branch**: <branch> @ <sha>
**Main**: <main-sha>
**Epic**: <epic-name>
**Phases**: <phases reviewed>

### Checks
- Tests: ✅/❌
- Lint: ✅/❌
- Build: ✅/❌
- Mutation: <score>%
- E2E: ✅/❌/⏭️

### Findings
- Blocking: <count>
- Tech Debt Issues: <issue numbers>
- Warnings: <count>

### Recommendation
<accept|reject|needs-work>

**Next Step**: Run `/accept-review` to mark phases complete, or address findings first.
```

### 5. Staleness Warning

The review record enables `/accept-review` to detect stale reviews:
- If branch has new commits since review, warn user
- If main has new commits, suggest rebasing
- Review file serves as proof of review state
