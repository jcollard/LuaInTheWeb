# Code Review Checklist

Use this checklist when reviewing code changes.

## Review Mode Detection

This command adapts based on whether there's an active roadmap phase:

```bash
# Check for active phase (status = "Approved" or "In Progress")
ls roadmap/*/[0-9]*.md 2>/dev/null
```

Read each phase file and check for `**Status**: Approved` or `**Status**: In Progress`.

| Mode | Condition | Behavior |
|------|-----------|----------|
| **Roadmap Mode** | Active phase exists | Full workflow: update plan checkboxes, generate review record, `/accept-review` available |
| **Issue Mode** | No active phase | Lightweight: run checks only, output results, no record generation |

Report the detected mode at the start of the review.

---

## Pre-Review Confirmation (Required)

> **IMPORTANT:** Before starting the review, you MUST display the review criteria and get user confirmation.

Output this confirmation message:

```
## Review Criteria Checklist

I will review this code against the following criteria:

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

**Wait for user confirmation before continuing.**

If user says no or wants to modify criteria, discuss and adjust as needed.

---

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

**IMPORTANT**: Tech debt issues are **identified but NOT created** during code review. They are created later during `/pr-review <n> accept` when the PR is approved. This prevents:
- Creating issues for things fixed before PR merge
- Creating issues for rejected PRs
- Noise from premature issue creation

### Identifying Tech Debt

During review, track tech debt findings for later creation:

1. **Record findings** with enough detail to create issues later:
   - File and line number
   - Brief description of the issue
   - Suggested fix
   - Priority level

2. **Priority levels**:
   - **High**: Violates coding standards, security issues
   - **Medium**: ESLint warnings, performance issues
   - **Low**: Nice-to-have improvements

3. **Unique ID format** (for deduplication): `<filename>-<issue-type>-<line-numbers>`
   - Example: `luarepl-any-types-26-93-101`
   - Example: `stryker-exclude-test-files`

### Output Format for Tech Debt

In the review summary, list tech debt items in a format that can be used by `/pr-review accept`:

```
### Tech Debt Identified

| # | File | Issue | Priority |
|---|------|-------|----------|
| 1 | LuaRepl.tsx:42 | Uses `any` type for callback | High |
| 2 | utils.ts:15-20 | Duplicate code with parser.ts | Medium |
| 3 | styles.css | Unused CSS class `.oldHeader` | Low |

**Note**: These will be converted to GitHub issues when the PR is accepted via `/pr-review <n> accept`.
```

### Tech Debt Issue Creation (Deferred to /pr-review accept)

When `/pr-review <n> accept` is run, it will prompt to create issues for any tech debt items identified:

```bash
gh issue create --title "[Tech Debt] <file>: <brief description>" \
  --label "tech-debt" \
  --project "LuaInTheWeb" \
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
PR #<pr-number> - <pr-title>"
```

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

## Update Plan Checkboxes (Roadmap Mode Only)

> **Skip this section if in Issue Mode** (no active roadmap phase detected)

Before generating the review record, update the active phase's plan file to mark completed items.

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

## Review Record (Roadmap Mode Only)

> **Skip this section if in Issue Mode** (no active roadmap phase detected)

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

---

## Issue Mode Summary (Issue Mode Only)

> **Use this section if in Issue Mode** (no active roadmap phase detected)

When reviewing issue-based work (no roadmap phase), output a simple summary:

```
## Code Review Summary (Issue Mode)

**Branch**: <branch> @ <sha>
**Issue**: #<issue-number> (if applicable)

### Checks
| Check | Status | Details |
|-------|--------|---------|
| Tests | ✅/❌ | X passed, Y failed |
| Lint | ✅/❌ | X errors, Y warnings |
| Build | ✅/❌ | Succeeded/Failed |
| Mutation | ✅/❌ | X% (threshold: 80%) |
| E2E | ✅/❌/⏭️ | X passed, Y failed |

### Result
<PASS|FAIL>

### Next Steps
- If PASS: Ready to merge
- If FAIL: Address issues and re-run `/code-review`
```

**Note**: No review record is generated in Issue Mode. The branch can be merged directly after passing checks.
