# Review Current Roadmap Plan

Review the current roadmap plan for compliance and readiness.

## Severity Levels

- **❌ BLOCKING**: Must fix before implementation can start. Missing these causes implementation to fail or waste effort.
- **⚠️ IMPORTANT**: Strong recommendations. Should fix but won't prevent implementation.
- **💡 SUGGESTION**: Nice to have. Mention once, don't block or loop on these.

## Iteration Guidelines

**Goal**: Iterate toward a good stopping point, not perfection.

**When to suggest revisions:**
- BLOCKING issues exist → Always suggest fixes
- IMPORTANT items missing → Suggest on first review, user decides whether to address
- SUGGESTIONS → Mention once, never re-raise

**When to stop iterating:**
- All BLOCKING criteria pass
- IMPORTANT items have been considered (addressed OR consciously deferred by user)
- Don't chase perfection - "good enough to implement" is the bar

**On RE-REVIEWS:**
- Focus on whether previous BLOCKING issues were fixed
- Don't invent new BLOCKING issues that weren't raised before (unless something changed)
- IMPORTANT items already mentioned don't need to be re-raised verbatim - just note if they were addressed

## Instructions

1. **Find the current plan**: Check `roadmap/README.md` for the plan with status "Approved" or "In Progress"

2. **Read the plan fully**: Load the complete plan document

3. **Review against actual codebase**: Before judging the plan, explore:
   - `src/components/` - existing component patterns and structure
   - `src/hooks/` - existing hooks to potentially reuse
   - `src/__tests__/` - existing test patterns
   - Any files the plan references or builds upon

   Ground your review in what actually exists, not assumptions.

4. **Check BLOCKING criteria**: Go through the blocking checklist below

5. **Check IMPORTANT items**: Note these but don't obsess over them

6. **Output your verdict**: Use the exact output format at the bottom

## Reviewer Humility

**You can be wrong.** When flagging issues:
- Use "appears to" or "may be missing" rather than definitive statements when uncertain
- If the plan references something unfamiliar, check the codebase before calling it wrong
- Invite pushback: "Let me know if I'm missing context here"
- If the user says an issue isn't actually a problem, trust them and move on

## BLOCKING Criteria (Must Fix)

These are concrete, verifiable issues that would cause implementation problems:

### Implementation Steps Have Test-First Structure
- [ ] Implementation steps include TEST items before code items
  - ✅ PASS: Steps show "TEST: [case]" before "Implement [feature]"
  - ❌ FAIL: Steps only list implementation tasks with no test items

### Testing Section Exists and Has Specifics
- [ ] Plan has a Testing Strategy/Testing section with actual test cases
  - ✅ PASS: Lists specific test scenarios (e.g., "renders children", "handles empty input")
  - ❌ FAIL: No testing section OR only says "add tests" without specifics

### Error/Edge Cases Identified
- [ ] Plan identifies at least 2-3 error or edge cases to handle
  - ✅ PASS: Has "Edge Cases" section OR testing section includes error scenarios
  - ❌ FAIL: No mention of what happens when things go wrong

### Files to Create Are Listed
- [ ] Plan specifies what files/components will be created
  - ✅ PASS: Lists file paths like `src/components/Foo/Foo.tsx`
  - ❌ FAIL: Vague "create component" without file structure

## IMPORTANT Items (Strong Recommendations)

Flag these once. Don't block approval, don't re-raise on subsequent reviews:

### Architecture Clarity
- [ ] Clear separation between UI components and logic (hooks vs components noted)
- [ ] TypeScript types/interfaces mentioned for new APIs

### Project Alignment
- [ ] References existing patterns or utilities to reuse
- [ ] CSS approach mentioned (CSS modules, existing styles)

### E2E Testing (for user-facing features)
- [ ] E2E test cases identified for core user flows

## SUGGESTIONS (Mention Once, Move On)

These are nice-to-have. List them in output but never block:
- AAA pattern in test examples
- Descriptive test name examples
- index.ts barrel exports mentioned
- types.ts file mentioned

## Output Format

After reviewing, output exactly ONE of these:

---

**If NO blocking issues:**
```
✅ PLAN READY FOR IMPLEMENTATION

BLOCKING: All 4 criteria satisfied

IMPORTANT items to consider (optional):
- [list any IMPORTANT items that weren't addressed, or "None"]

SUGGESTIONS:
- [list suggestions, or "None"]
```

---

**If ANY blocking issues exist:**
```
❌ PLAN NEEDS UPDATES

BLOCKING issues (must fix):
1. [specific issue and what needs to be added]
2. [etc.]

IMPORTANT items (can address now or later):
- [list IMPORTANT items, or "None"]
```

---

**If this is a RE-REVIEW:**
```
🔄 RE-REVIEW AFTER UPDATES

Previous BLOCKING issues:
- [issue]: ✅ Fixed / ❌ Still present

New status: [READY / STILL NEEDS UPDATES]
```

---

Do NOT begin implementation. Only review and report.
