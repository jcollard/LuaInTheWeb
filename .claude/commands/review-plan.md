# Review Current Roadmap Plan

Review the current roadmap plan for compliance and readiness.

## Pass/Fail Criteria

A plan is **READY** if ALL of the following are true:
- Every REQUIRED checkbox in the checklist below is satisfied
- No BLOCKING issues exist (issues that would prevent implementation)

A plan **DOES NOT NEED** to be perfect. Minor suggestions for improvement are NOT blockers.

**IMPORTANT**: Do not invent new requirements beyond the checklist below. Only flag issues that violate specific checklist items.

## Instructions

1. **Find the current plan**: Check `roadmap/README.md` for the plan with status "Approved" or "In Progress"

2. **Read the plan**: Load the full plan document.

3. **Review against guidelines**: Check the plan against:
   - `/tdd` - TDD guidelines (red-green-refactor cycles, test quality, edge cases)
   - `/new-feature` - New feature guidelines (file structure, component architecture, CSS modules)

4. **Check against codebase**: Verify the plan aligns with:
   - Existing code patterns in `src/`
   - Current project structure
   - Existing similar implementations to reuse

5. **Report findings**: Create a summary table of:
   - Compliance issues found
   - Missing elements
   - Recommendations for updates

6. **Ask before updating**: If issues are found, ask the user if they want the plan updated

## Checklist to Verify

Mark each item as ✅ PASS, ❌ FAIL, or ⏭️ N/A (not applicable to this plan).

### TDD Compliance (REQUIRED)
- [ ] Tests written BEFORE implementation specified
- [ ] Edge cases mentioned (empty inputs, errors, boundaries)

### TDD Compliance (OPTIONAL - do not block on these)
- [ ] AAA pattern mentioned in test examples
- [ ] One assertion per concept noted
- [ ] Descriptive test name examples provided

### New Feature Compliance (REQUIRED)
- [ ] Component folder structure specified
- [ ] UI components are pure (logic in hooks)

### New Feature Compliance (OPTIONAL - do not block on these)
- [ ] CSS modules mentioned
- [ ] types.ts file mentioned
- [ ] index.ts barrel exports mentioned

### Codebase Alignment (REQUIRED)
- [ ] TypeScript strict mode compatible (no `any` types)

### Codebase Alignment (OPTIONAL - do not block on these)
- [ ] Notes about reusing existing utilities
- [ ] References existing patterns

## Output Format

After reviewing, output exactly one of:

**If all REQUIRED items pass:**
```
✅ PLAN READY FOR IMPLEMENTATION

All required criteria satisfied. Optional suggestions (if any):
- [list optional improvements, or "None"]
```

**If any REQUIRED items fail:**
```
❌ PLAN NEEDS UPDATES

Required fixes:
- [list only REQUIRED items that failed]
```

Do NOT begin implementation. Only review and report.
