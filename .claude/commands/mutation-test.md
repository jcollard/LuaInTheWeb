# Mutation Testing Guidelines

Mutation testing verifies that your tests actually catch bugs by introducing small changes (mutations) to your code and checking if tests fail.

## Running Mutation Tests

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

## Checklist

Before considering tests complete:

- [ ] Mutation tests run: `npm run test:mutation`
- [ ] Mutation score > 80%
- [ ] No surviving mutations in critical paths
- [ ] Boundary conditions tested
- [ ] Both branches of conditionals tested
- [ ] Return values explicitly asserted
