# TDD Guidelines

Follow strict Test-Driven Development for all implementation work.

## Red-Green-Refactor Cycle

### 1. RED: Write a Failing Test First

Before writing ANY production code:

```typescript
// Test should fail - function doesn't exist yet
describe('formatLuaError', () => {
  it('should extract line number from Lua error message', () => {
    const error = '[string "..."]:5: attempt to call nil';
    const result = formatLuaError(error);
    expect(result.lineNumber).toBe(5);
  });
});
```

Run the test and verify it fails for the RIGHT reason (missing function, not syntax error).

### 2. GREEN: Write Minimum Code to Pass

Write ONLY enough code to make the test pass:

```typescript
function formatLuaError(error: string): { lineNumber: number } {
  const match = error.match(/:(\d+):/);
  return { lineNumber: match ? parseInt(match[1]) : 0 };
}
```

### 3. REFACTOR: Improve the Code

With tests passing, safely refactor:
- Remove duplication
- Improve naming
- Optimize performance
- Run tests after each change

## Test Quality Requirements

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should execute Lua print statement', async () => {
  // Arrange
  const lua = await LuaFactory.createEngine();
  const output: string[] = [];
  lua.global.set('print', (msg: string) => output.push(msg));

  // Act
  await lua.doString('print("Hello")');

  // Assert
  expect(output).toEqual(['Hello']);
});
```

### Descriptive Test Names

```typescript
// GOOD - describes behavior
it('should display error message when Lua syntax is invalid')
it('should preserve command history across sessions')

// BAD - describes implementation
it('should call setError')
it('should update state')
```

### Edge Cases to Cover

- Empty inputs
- Boundary values (0, -1, MAX_VALUE)
- Null/undefined handling
- Error conditions
- Async timeout scenarios

### One Assertion Per Concept

Each test should verify ONE behavior. Multiple assertions are OK if testing the same concept.

## Checklist

Before implementation is complete:

- [ ] Tests written BEFORE implementation
- [ ] All tests pass: `npm run test`
- [ ] AAA pattern used consistently
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Descriptive test names
- [ ] One assertion per concept
