# Prepare Next Plan for Implementation

Promote the next draft plan to implementation-ready status by applying project standards.

## Prerequisites Check

Before preparing a plan, verify:

1. **No active plans exist**
   - Check `roadmap/README.md` for any "Approved" or "In Progress" plans
   - If found, STOP and report: "Cannot prepare new plan - [plan name] is currently [status]"

2. **Find next draft**
   - Look for draft plans with all dependencies completed
   - Select the next sequential phase (e.g., Phase 2 after Phase 1.5)

## Preparation Steps

### Step 1: Load Context

Load these guidelines (DO NOT output them, just use for reference):
- `/tdd` - TDD guidelines
- `/new-feature` - Component structure guidelines
- `/e2e` - E2E testing guidelines

### Step 2: Analyze the Draft

Read the draft plan and identify:
- What components/features will be created
- What user-facing functionality is added
- What edge cases and errors need handling

### Step 3: Rewrite Implementation Plan

Transform the implementation steps to follow TDD with scoped mutation testing:

```markdown
### Step N: [Feature Name]

**Tests First:**
1. [ ] **TEST**: [describe test case]
2. [ ] **TEST**: [describe edge case test]
3. [ ] **TEST**: [describe error case test]

**Implementation:**
4. [ ] Create component folder structure
5. [ ] Implement minimum code to pass tests
6. [ ] Refactor while tests pass

**Verification:**
7. [ ] All tests pass
8. [ ] **Scoped mutation tests: `npm run test:mutation:scope "path/to/new/files/**"`**
9. [ ] **Mutation score >= 80%**
10. [ ] Lint passes
```

### Step 3b: Identify E2E Milestones

Group related implementation steps into **MILESTONES** where user flows become testable:

```markdown
---
**MILESTONE: [User Flow Name]**
After completing Steps N-M, run `/milestone`:
- User can [describe complete user action]
- E2E test: `e2e/[feature-name].spec.ts`
- Test page: `/test/[feature-name]`
---
```

Place MILESTONE markers:
- After every 2-4 related implementation steps
- When a user-visible flow is complete
- Before moving to a different feature area

### Step 4: Add Component Structure

For each new component, specify the folder structure:

```markdown
### New Components

#### ComponentName
```
src/components/ComponentName/
├── ComponentName.tsx           # Pure UI component
├── ComponentName.module.css    # Scoped styles
├── ComponentName.test.tsx      # Component tests
├── useComponentName.ts         # Hook with logic (if needed)
├── useComponentName.test.ts    # Hook tests (if needed)
├── types.ts                    # Component types
└── index.ts                    # Barrel exports
```
```

### Step 5: Add E2E Testing Section (if user-facing)

For user-facing features, add E2E section with MILESTONE references:

```markdown
## E2E Testing

E2E tests are written at **MILESTONE** checkpoints, not after every item.

### Milestones in This Plan

| Milestone | After Steps | User Flow | E2E Test |
|-----------|-------------|-----------|----------|
| [Name 1] | Steps 1-3 | [User can...] | `e2e/feature-a.spec.ts` |
| [Name 2] | Steps 4-6 | [User can...] | `e2e/feature-b.spec.ts` |

### Test Pages
- `/test/[feature-a]` - Test page for Milestone 1
- `/test/[feature-b]` - Test page for Milestone 2

### E2E Test Cases (by Milestone)

**Milestone 1: [Name]**
- [ ] [Core user flow]
- [ ] [Error handling]

**Milestone 2: [Name]**
- [ ] [Core user flow]
- [ ] [Edge case handling]
```

### Step 6: Add Edge Cases Section

```markdown
## Edge Cases to Handle

- [ ] Empty/null inputs
- [ ] Boundary values (min/max)
- [ ] Error states
- [ ] Loading states
- [ ] [Feature-specific edge cases]
```

### Step 7: Update Plan Status

Change status from "Draft" to "Approved" and update the date.

## Output Format

After preparing the plan, output:

```
✅ PLAN PREPARED FOR IMPLEMENTATION

Plan: [Plan Name]
Status: Draft → Approved

Changes made:
- [List key changes]

Next step: Run `/review-plan` to verify, then `/begin` to start implementation.
```

## Important Notes

- DO NOT begin implementation - only prepare the plan
- Preserve the original intent and scope of the draft
- Add structure and process, don't change features
- Keep the plan focused - don't add scope creep
