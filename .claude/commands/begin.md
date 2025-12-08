# Begin Task Execution

Use the **TodoWrite** tool to create a comprehensive task list for the task or request described above. Break down the work into clear, actionable items that can be tracked to completion.

After creating the task list, begin execution immediately.

## Task List Structure

For implementation plans, structure tasks following the **Red-Green-Refactor-Mutate** cycle:

```
For each implementation item:
- [ ] Write failing tests (RED)
- [ ] Implement minimum code (GREEN)
- [ ] Refactor safely (REFACTOR)
- [ ] Run scoped mutation tests (MUTATE)
- [ ] Fix surviving mutants if score < 80%

At each MILESTONE marker in the plan:
- [ ] Run /milestone for E2E checkpoint
- [ ] Create/update test page if needed
- [ ] Write E2E tests for completed user flow
- [ ] Run E2E tests
```

**IMPORTANT:** Do NOT batch mutation testing until the end. Run `npm run test:mutation:scope "path/to/files/**"` immediately after each item.

## Continuation Policy

Follow these rules throughout execution:

- **NEVER** stop to ask "Do you want to continue?" or "Should I proceed?"
- Work through the **ENTIRE** task list until completion
- If context gets full, auto-compact and continue working
- Only stop for actual blockers (missing info, errors, ambiguity)
- Avoid using bash commands that are not present in settings.local.json or .claude/settings.json
- When you finish the current task list, create another comprehensive ToDo task list with any remaining items and continue until there is nothing left to complete

## Task List Requirements

The ToDo list should:
- Cover all aspects of the requested work
- **Include scoped mutation testing after each implementation item**
- **Include E2E testing at MILESTONE checkpoints (not at the end)**
- Include verification steps (tests, linting, etc.) where applicable
- Be ordered by dependency (do prerequisites first)
- Be specific enough to track progress clearly

## Example Task List

```
- [ ] Step 1: Implement FeatureA
  - [ ] Write tests for FeatureA
  - [ ] Implement FeatureA
  - [ ] Run scoped mutation: npm run test:mutation:scope "src/components/FeatureA/**"
  - [ ] Fix surviving mutants if needed
- [ ] Step 2: Implement FeatureB
  - [ ] Write tests for FeatureB
  - [ ] Implement FeatureB
  - [ ] Run scoped mutation: npm run test:mutation:scope "src/components/FeatureB/**"
  - [ ] Fix surviving mutants if needed
- [ ] MILESTONE: User Flow A+B
  - [ ] Create test page /test/feature-ab
  - [ ] Write E2E tests for user flow
  - [ ] Run E2E tests
- [ ] Step 3: Implement FeatureC
  ...
- [ ] Final verification
  - [ ] Run full test suite
  - [ ] Run full mutation tests
  - [ ] Run all E2E tests
  - [ ] Lint passes
```

Begin now.
