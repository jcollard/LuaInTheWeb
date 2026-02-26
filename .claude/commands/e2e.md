# E2E Testing Guidelines

Reference for writing, running, and debugging Playwright E2E tests.

## Quick Reference Commands

```bash
# Run all E2E tests (headless, 4 workers locally, 2 in CI)
npm --prefix lua-learning-website run test:e2e

# Run a single spec file
npm --prefix lua-learning-website run test:e2e -- e2e/file-explorer.spec.ts

# Run tests matching a grep pattern
npm --prefix lua-learning-website run test:e2e -- --grep "creates new file"

# Debug with visible browser
npm --prefix lua-learning-website run test:e2e -- --headed e2e/file-explorer.spec.ts

# Open Playwright UI mode (interactive)
npm --prefix lua-learning-website run test:e2e -- --ui

# View last HTML report
npx --prefix lua-learning-website playwright show-report
```

## Shared Fixtures

Tests import `test` and `expect` from `./fixtures` instead of `@playwright/test`. Each fixture navigates to `/editor` and waits for progressively more UI:

| Fixture | Setup | Use for |
|---------|-------|---------|
| `editorPage` | goto → wait ide-layout | Tests that don't need clean state (autocomplete, loading modal) |
| `cleanEditorPage` | goto → clear localStorage → reload → wait ide-layout | Tests needing clean state but not file explorer (theme, workspace-ui) |
| `explorerPage` | cleanEditorPage + wait File Explorer tree | File explorer, tab, workspace, editor tests |
| `shellPage` | editorPage + wait shell-terminal-container | Canvas, shell, execution tests |

### Which fixture to choose

```
Need the file explorer tree?
  YES → explorerPage
  NO → Need clean localStorage?
    YES → cleanEditorPage
    NO → Need shell terminal?
      YES → shellPage
      NO → editorPage
```

### Usage

```typescript
import { test, expect } from './fixtures'

test.describe('My Feature', () => {
  test('does something', async ({ explorerPage: page }) => {
    // page is ready — ide-layout, file explorer already visible
    // just write your test logic
  })
})
```

### When NOT to use fixtures

Keep custom `beforeEach` for tests that need:
- Pre-seeded localStorage before reload (e.g., require-module)
- `test.describe.configure({ mode: 'serial' })` with shared state
- Unique navigation beyond `/editor`

## Shared Helpers

### Editor helpers (`./helpers/editor`)

```typescript
import { createAndOpenFile, createAndOpenFileWithName } from './helpers/editor'

// Create file with default name, returns monaco-editor locator
const editor = await createAndOpenFile(page)

// Create file with specific name, opens as permanent tab
await createAndOpenFileWithName(page, 'utils.lua')
```

### Terminal helper (`./helpers/terminal`)

```typescript
import { createTerminalHelper } from './helpers/terminal'

const terminal = createTerminalHelper(page)
await terminal.focus()
await terminal.execute('lua main.lua')
await terminal.expectToContain('Hello')
await terminal.waitForOutput('Done', 10000)
```

## Timeout Constants (`./constants`)

```typescript
import { TIMEOUTS } from './constants'
```

| Constant | Value | Use for |
|----------|-------|---------|
| `BRIEF` | 100ms | Minimal UI updates |
| `UI_STABLE` | 200ms | UI stabilization after interaction |
| `TRANSITION` | 300ms | CSS transitions |
| `ANIMATION` | 500ms | Animations |
| `INIT` | 1000ms | Component initialization |
| `ASYNC_OPERATION` | 5000ms | Lua execution, async ops |
| `ELEMENT_VISIBLE` | 10000ms | Element visibility (matches global `expect.timeout`) |
| `CI_EXTENDED` | 30000ms | Slow CI environments |

The global config (`playwright.config.ts`) sets:
- `expect.timeout`: 10s (matches `ELEMENT_VISIBLE`)
- `actionTimeout`: 10s (click, fill, etc.)
- `timeout`: 60s (per test)
- `workers`: 4 locally, 2 in CI

Most tests should NOT need explicit timeouts — the global config handles it.

## Flakiness Prevention

### DO

- Use `expect(locator).toBeVisible()` — auto-retries until timeout
- Use `expect.poll()` for non-DOM assertions (terminal content, evaluated JS)
- Use `data-testid` attributes for stable selectors
- Wait for state transitions: `await expect(input).not.toBeVisible()` after form submit
- Use `{ timeout: TIMEOUTS.CI_EXTENDED }` for genuinely slow operations

### DON'T

- Use `page.waitForTimeout()` as primary wait — prefer `expect` auto-retry
- Use raw numbers like `{ timeout: 10000 }` — use `TIMEOUTS` constants
- Use `page.$()` or `page.evaluate()` for assertions — use `expect(locator)`
- Chain multiple `waitForTimeout` calls — sign of missing proper waits
- Assume element order — use `getByRole`, `getByTestId`, `getByText`

### Common Flakiness Patterns

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Timeout waiting for element" | Default timeout too short under load | Fixed globally (10s expect timeout) |
| Intermittent in CI, passes locally | Race between workers and dev server | Workers capped at 2 (CI) / 4 (local) |
| Terminal content assertion fails | xterm renders to canvas, not DOM | Use `TerminalHelper.expectToContain()` with polling |
| Monaco content assertion fails | Monaco virtualizes rendering | Use `page.evaluate()` to read model content |
| File tree item not found | Workspace takes time to load | Fixture waits for tree; add specific treeitem waits if needed |

## Writing New Tests

### Template

```typescript
import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'

test.describe('Feature Name', () => {
  test('user can do X', async ({ explorerPage: page }) => {
    // Arrange — page is already at /editor with file explorer visible

    // Act
    await page.getByRole('button', { name: /new file/i }).click()

    // Assert
    await expect(page.getByTestId('result')).toBeVisible()
  })
})
```

### When to Write E2E Tests

Write for:
- Core user flows (write code → run → see output)
- Features integrating multiple systems (Monaco + Lua + terminal)
- Anything that can't be fully tested with mocked unit tests

Don't write for:
- Internal utilities or pure functions
- Components with no user interaction

## Debugging

```bash
# Run with headed browser + slow motion
npm --prefix lua-learning-website run test:e2e -- --headed --slowmo 500 e2e/file.spec.ts

# Enable trace on every test (not just retries)
npm --prefix lua-learning-website run test:e2e -- --trace on e2e/file.spec.ts

# View HTML report after failure
npx --prefix lua-learning-website playwright show-report

# Debug a single test with inspector
npm --prefix lua-learning-website run test:e2e -- --debug e2e/file.spec.ts
```

Traces are saved on first retry by default (`trace: 'on-first-retry'` in config). Open the HTML report to view traces with timeline, snapshots, and network.
