# Testing Guide

This project follows Test-Driven Development (TDD) practices with mutation testing to ensure test quality.

## TDD Workflow: Red-Green-Refactor

### 1. RED: Write a Failing Test First

Before writing any production code:

```typescript
// ❌ Test should fail - function doesn't exist yet
describe('formatLuaError', () => {
  it('should extract line number from Lua error message', () => {
    const error = '[string "..."]:5: attempt to call nil';
    const result = formatLuaError(error);
    expect(result.lineNumber).toBe(5);
  });
});
```

Run the test and verify it fails for the right reason (missing function, not syntax error).

### 2. GREEN: Write Minimum Code to Pass

Write only enough code to make the test pass:

```typescript
// ✅ Minimal implementation
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
- Improve readability

Run tests after each change to ensure nothing breaks.

## Test Structure

### File Organization

```
src/
├── components/
│   ├── LuaPlayground.tsx
│   └── __tests__/
│       └── LuaPlayground.test.tsx
├── utils/
│   ├── luaHelpers.ts
│   └── __tests__/
│       └── luaHelpers.test.ts
```

### Test Naming

Use descriptive names that explain the behavior:

```typescript
// ✅ Good - describes behavior
it('should display error message when Lua syntax is invalid')
it('should preserve command history across sessions')

// ❌ Bad - describes implementation
it('should call setError')
it('should update state')
```

### AAA Pattern

Structure tests with Arrange-Act-Assert:

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

## Mutation Testing

Mutation testing verifies that your tests actually catch bugs by introducing small changes (mutations) to your code and checking if tests fail.

### Running Mutation Tests

```bash
npm run test:mutation
```

### Understanding Results

- **Killed**: Test caught the mutation (good!)
- **Survived**: Mutation wasn't caught (need better tests)
- **Timeout**: Mutation caused infinite loop
- **No Coverage**: Code not covered by tests

### Target: 80%+ Mutation Score

Focus on killing surviving mutants by:
1. Adding missing assertions
2. Testing edge cases
3. Testing boundary conditions

### Common Surviving Mutations

| Mutation | Fix |
|----------|-----|
| `>` to `>=` | Add boundary test |
| `&&` to `\|\|` | Test both conditions independently |
| Removed function call | Assert side effects |
| Changed return value | Assert return value |

## Testing React Components

### Render Testing

```typescript
import { render, screen } from '@testing-library/react';

it('should render run button', () => {
  render(<LuaPlayground />);
  expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
});
```

### User Interaction

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should execute code when run button clicked', async () => {
  const user = userEvent.setup();
  render(<LuaPlayground />);

  await user.click(screen.getByRole('button', { name: /run/i }));

  expect(screen.getByText(/output/i)).toBeInTheDocument();
});
```

### Async Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';

it('should show output after execution', async () => {
  render(<LuaPlayground initialCode='print("test")' />);

  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## E2E Testing

For user-facing features, we use Playwright for end-to-end testing. E2E tests verify the full integration works in a real browser.

### When to Write E2E Tests

Write E2E tests for:
- Core user flows (write code, run, see output)
- Features that integrate multiple systems (Monaco + Lua)
- Anything that can't be fully tested with mocked unit tests

Do NOT write E2E tests for:
- Internal utilities
- Pure functions
- Components with no user interaction

### Test Page Pattern

E2E tests target dedicated test pages at `/test/<feature>`:
- Only available in development mode
- Serve as E2E test targets AND manual QA sandboxes
- Located in `src/pages/test/`

### Running E2E Tests

```bash
npm run test:e2e        # Run all E2E tests (headless)
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:headed # Run with visible browser
```

See [E2E Testing Guide](./e2e-testing.md) for detailed information.

## Test Quality Checklist

Before considering a feature complete:

- [ ] All tests pass
- [ ] Tests written before implementation (TDD)
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Mutation score > 80%
- [ ] No surviving mutations in critical paths
- [ ] Tests are readable and maintainable
- [ ] E2E tests cover core user flows (for user-facing features)

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode (re-runs on changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Mutation testing
npm run test:mutation

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui     # Interactive UI mode
npm run test:e2e:headed # With visible browser
```
