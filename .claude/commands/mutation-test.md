# Mutation Testing Guidelines

Mutation testing verifies that your tests actually catch bugs by introducing small changes (mutations) to your code and checking if tests fail.

## Running Mutation Tests

### Scoped Mutation Testing (Recommended - Per Item)

**Run immediately after each implementation item** - do NOT wait until the end:

```bash
# Scope to specific files/folders you just implemented
npm run test:mutation:scope "src/components/NewFeature/**/*.ts"
npm run test:mutation:scope "src/hooks/useNewHook.ts"

# Multiple files
npm run test:mutation:scope "src/components/Button/**/*.ts,src/hooks/useButton.ts"
```

Benefits of scoped testing:
- **Fast feedback** - seconds instead of minutes
- **Fresh context** - fix issues while code is still in your head
- **Incremental quality** - don't accumulate test debt

### Full Mutation Testing (Final Verification)

Run at the end of a plan for full coverage:

```bash
npm run test:mutation
```

## Understanding Results

| Status | Meaning |
|--------|---------|
| **Killed** | Test caught the mutation (good!) |
| **Survived** | Mutation wasn't caught (need better tests) |
| **Timeout** | Mutation caused infinite loop |
| **No Coverage** | Code not covered by tests |

## Target: 80%+ Mutation Score

Focus on killing surviving mutants by:
1. Adding missing assertions
2. Testing edge cases
3. Testing boundary conditions

## Common Surviving Mutations and Fixes

| Mutation | How to Fix |
|----------|------------|
| `>` changed to `>=` | Add boundary test for exact value |
| `&&` changed to `\|\|` | Test both conditions independently |
| Removed function call | Assert on side effects |
| Changed return value | Assert the return value explicitly |
| `+` changed to `-` | Test with values where sign matters |
| `true` changed to `false` | Test both boolean branches |

## Example: Killing a Surviving Mutant

If this mutation survives (changing `>` to `>=`):

```typescript
// Original
if (count > 0) { ... }

// Mutation (survived)
if (count >= 0) { ... }
```

Add a boundary test:

```typescript
it('should not execute when count is exactly 0', () => {
  const result = processItems(0);
  expect(result).toBeUndefined();
});
```

## Prioritize Critical Paths

Focus mutation testing on:
- Business logic functions
- State management hooks
- Data transformation utilities
- Error handling code

## Workflow Integration

### Per Implementation Item (Immediate)
1. Complete RED-GREEN-REFACTOR cycle
2. Run scoped mutation test: `npm run test:mutation:scope "path/to/new/files/**"`
3. If score < 80%, kill surviving mutants
4. **Do NOT proceed to next item until score >= 80%**

### Per Plan (Final)
1. All items completed with scoped mutation testing
2. Run full mutation test: `npm run test:mutation`
3. Address any cross-file mutations that survived

## Checklist

Per implementation item:
- [ ] Scoped mutation tests run: `npm run test:mutation:scope "path/to/files/**"`
- [ ] Mutation score >= 80% on new files
- [ ] Surviving mutants addressed before moving on

Final verification:
- [ ] Full mutation tests run: `npm run test:mutation`
- [ ] Overall mutation score > 80%
- [ ] No surviving mutations in critical paths
- [ ] Boundary conditions tested
- [ ] Both branches of conditionals tested
- [ ] Return values explicitly asserted
