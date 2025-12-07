# Mutation Testing Guidelines

Mutation testing ensures your tests actually catch bugs, not just achieve coverage. A test that doesn't fail when code is broken is a useless test.

## What is Mutation Testing?

Mutation testing introduces small bugs (mutations) into your code and runs tests. If tests still pass, they're not catching that type of bug.

### Mutation Examples

| Original | Mutation | What it tests |
|----------|----------|---------------|
| `x > 5` | `x >= 5` | Boundary conditions |
| `x && y` | `x \|\| y` | Logical operators |
| `return value` | `return null` | Return value assertions |
| `array.push(x)` | *(removed)* | Side effect verification |
| `x + 1` | `x - 1` | Arithmetic operations |

## Running Mutation Tests

```bash
npm run test:mutation
```

## Understanding Results

### Mutation Score

```
Mutation Score: 85% (170/200 mutants killed)
```

- **Killed (170)**: Tests caught the mutation ✅
- **Survived (30)**: Tests didn't catch it ❌
- **Timeout**: Mutation caused infinite loop
- **No Coverage**: Code not executed by tests

### Target Scores

| Score | Quality |
|-------|---------|
| 90%+ | Excellent |
| 80-89% | Good (minimum target) |
| 70-79% | Needs improvement |
| <70% | Poor - tests provide false confidence |

## Fixing Surviving Mutants

### 1. Boundary Mutations

**Mutant survived:** `x > 5` → `x >= 5`

**Fix:** Add boundary test
```typescript
it('should reject when count equals limit', () => {
  expect(validate(5, { limit: 5 })).toBe(false);
});

it('should accept when count is below limit', () => {
  expect(validate(4, { limit: 5 })).toBe(true);
});
```

### 2. Logical Operator Mutations

**Mutant survived:** `a && b` → `a || b`

**Fix:** Test each condition independently
```typescript
it('should fail when only first condition is true', () => {
  expect(check(true, false)).toBe(false);
});

it('should fail when only second condition is true', () => {
  expect(check(false, true)).toBe(false);
});

it('should pass when both conditions are true', () => {
  expect(check(true, true)).toBe(true);
});
```

### 3. Removed Statement Mutations

**Mutant survived:** `list.push(item)` was removed

**Fix:** Assert the side effect
```typescript
it('should add item to list', () => {
  const list: string[] = [];
  addItem(list, 'test');
  expect(list).toContain('test');
});
```

### 4. Return Value Mutations

**Mutant survived:** `return result` → `return ""`

**Fix:** Assert the actual return value
```typescript
it('should return formatted string', () => {
  const result = format('hello');
  expect(result).toBe('HELLO'); // Specific assertion
});
```

### 5. Arithmetic Mutations

**Mutant survived:** `x + 1` → `x - 1`

**Fix:** Assert exact values
```typescript
it('should increment counter', () => {
  expect(increment(5)).toBe(6); // Not just "greater than 5"
});
```

## Common Testing Mistakes

### ❌ Testing implementation, not behavior

```typescript
// Bad - tests internal state, not behavior
it('should set loading to true', () => {
  component.fetchData();
  expect(component.loading).toBe(true);
});

// Good - tests observable behavior
it('should show loading spinner while fetching', async () => {
  render(<DataComponent />);
  fireEvent.click(screen.getByText('Load'));
  expect(screen.getByRole('progressbar')).toBeVisible();
});
```

### ❌ Weak assertions

```typescript
// Bad - mutation x > 0 → x >= 0 survives
it('should return positive number', () => {
  expect(calculate(5)).toBeGreaterThan(0);
});

// Good - specific value assertion
it('should return input squared', () => {
  expect(calculate(5)).toBe(25);
});
```

### ❌ Missing negative tests

```typescript
// Only testing happy path
it('should return user when found', () => { ... });

// Missing: what happens when NOT found?
it('should return null when user not found', () => { ... });
it('should throw when id is invalid', () => { ... });
```

## Mutation Testing Checklist

Before considering tests complete:

- [ ] Mutation score > 80%
- [ ] All critical paths have 90%+ mutation score
- [ ] Surviving mutants reviewed and justified (or tests added)
- [ ] No "assert something exists" without asserting its value
- [ ] Boundary conditions tested
- [ ] Both true and false branches of conditions tested

## Integration with TDD

1. **RED**: Write failing test
2. **GREEN**: Make test pass
3. **REFACTOR**: Improve code
4. **MUTATE**: Run mutation tests
5. **STRENGTHEN**: Fix surviving mutants

## Reference

Full testing documentation: [docs/testing.md](docs/testing.md)
