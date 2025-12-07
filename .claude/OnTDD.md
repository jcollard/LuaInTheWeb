# TDD Guidelines: Red-Green-Refactor

You are working on a project that follows strict Test-Driven Development. Follow these practices for ALL code changes.

## The TDD Cycle

### 1. RED: Write a Failing Test FIRST

**Before writing ANY production code:**

1. Write a test that describes the desired behavior
2. Run the test and verify it FAILS
3. Ensure it fails for the RIGHT reason (missing functionality, not syntax error)

```typescript
// Example: Test first, implementation doesn't exist yet
describe('parseLineNumber', () => {
  it('should extract line number from Lua error', () => {
    const error = '[string "..."]:42: undefined variable';
    expect(parseLineNumber(error)).toBe(42);
  });
});
```

**Why this matters:**
- Proves the test can actually fail
- Ensures you understand the requirement before coding
- Creates a clear target for implementation

### 2. GREEN: Write MINIMUM Code to Pass

Write the simplest code that makes the test pass:

```typescript
// Minimal implementation - no extra features
function parseLineNumber(error: string): number {
  const match = error.match(/:(\d+):/);
  return match ? parseInt(match[1]) : 0;
}
```

**Rules:**
- Don't add features not required by tests
- Don't optimize prematurely
- Don't handle edge cases without tests for them
- "Make it work" before "make it right"

### 3. REFACTOR: Improve While Green

With passing tests, safely improve the code:

- Remove duplication
- Improve naming
- Extract functions/modules
- Optimize if needed

**Run tests after EVERY change** during refactoring.

## Test Quality Requirements

### Descriptive Test Names

```typescript
// ✅ Good - describes behavior and context
it('should return 0 when error message has no line number')
it('should handle multi-digit line numbers')
it('should display error message when Lua syntax is invalid')

// ❌ Bad - vague or implementation-focused
it('should work')
it('should call the function')
it('test parseLineNumber')
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should capture print output', async () => {
  // Arrange - set up test conditions
  const engine = await createLuaEngine();
  const output: string[] = [];
  engine.onPrint = (msg) => output.push(msg);

  // Act - perform the action being tested
  await engine.execute('print("Hello")');

  // Assert - verify the expected outcome
  expect(output).toEqual(['Hello']);
});
```

### One Assertion Per Concept

```typescript
// ✅ Good - focused tests
it('should extract line number', () => {
  expect(parseError('[...]:5: error').line).toBe(5);
});

it('should extract error message', () => {
  expect(parseError('[...]:5: undefined').message).toBe('undefined');
});

// ❌ Avoid - testing multiple unrelated things
it('should parse error', () => {
  const result = parseError('[...]:5: undefined');
  expect(result.line).toBe(5);
  expect(result.message).toBe('undefined');
  expect(result.isValid).toBe(true);
  expect(result.severity).toBe('error');
});
```

## Edge Cases to Always Test

1. **Empty/null inputs**: What happens with `""`, `null`, `undefined`?
2. **Boundary values**: First item, last item, zero, negative numbers
3. **Error conditions**: Invalid input, network failures, timeouts
4. **Type edge cases**: Very long strings, special characters, unicode

## Before Marking Work Complete

- [ ] Tests written BEFORE implementation
- [ ] All tests pass
- [ ] Each test fails when the code it tests is removed/broken
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Test names clearly describe behavior

## Commands

- `npm run test` - Run all tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report

## Reference

Full testing documentation: [docs/testing.md](docs/testing.md)
