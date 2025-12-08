# Phase 1.5: EmbeddableEditor E2E Tests

**Status**: Draft
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Add E2E tests using Playwright to validate the EmbeddableEditor works with real Monaco Editor and wasmoon Lua engine in a browser environment.

## Problem Statement

Unit tests mock Monaco and the Lua engine. We need to verify the full integration works in a real browser before building more features on top of it.

## Proposed Solution

Create a small set of Playwright E2E tests that:
- Load the EmbeddableEditor in a real browser
- Verify Monaco renders and accepts input
- Verify Lua code executes and output displays
- Verify keyboard shortcuts work

## Requirements

### Functional Requirements

- [ ] Playwright installed and configured
- [ ] Test page/route that renders EmbeddableEditor
- [ ] E2E tests for core user flows

### Non-Functional Requirements

- [ ] Tests run in CI (GitHub Actions)
- [ ] Tests complete in < 30 seconds
- [ ] Clear failure messages

## Technical Design

### Test Page

Create a simple test page at `/test/embeddable-editor` (dev only):

```tsx
// Only available in development
<EmbeddableEditor code={`print("Hello from Lua!")`} />
```

### E2E Test Cases

```typescript
// e2e/embeddable-editor.spec.ts
test('renders Monaco editor', async ({ page }) => {
  await page.goto('/test/embeddable-editor')
  await expect(page.locator('.monaco-editor')).toBeVisible()
})

test('executes Lua code and shows output', async ({ page }) => {
  await page.goto('/test/embeddable-editor')
  await page.click('button:has-text("Run")')
  await expect(page.locator('[data-testid="output-panel"]')).toContainText('Hello from Lua!')
})

test('Ctrl+Enter executes code', async ({ page }) => {
  await page.goto('/test/embeddable-editor')
  await page.locator('.monaco-editor textarea').press('Control+Enter')
  await expect(page.locator('[data-testid="output-panel"]')).toContainText('Hello from Lua!')
})

test('Reset button restores initial code', async ({ page }) => {
  await page.goto('/test/embeddable-editor')
  // Type something
  await page.locator('.monaco-editor textarea').fill('print("modified")')
  await page.click('button:has-text("Reset")')
  // Verify original code restored
  await expect(page.locator('.monaco-editor')).toContainText('Hello from Lua!')
})

test('displays Lua errors without crashing', async ({ page }) => {
  await page.goto('/test/embeddable-editor')
  await page.locator('.monaco-editor textarea').fill('invalid lua syntax !!!')
  await page.click('button:has-text("Run")')
  await expect(page.locator('[data-testid="output-panel"]')).toContainText('error')
})
```

## Implementation Plan

**TDD Workflow**: Write failing E2E tests first, then implement infrastructure to make them pass.

### Step 1: Setup Playwright

1. [ ] Install Playwright: `npm install -D @playwright/test`
2. [ ] Configure `playwright.config.ts`
3. [ ] Add npm scripts: `test:e2e`, `test:e2e:ui`
4. [ ] Verify Playwright runs with a simple test

### Step 2: Create Test Page

1. [ ] Create `/test/embeddable-editor` route (dev only)
2. [ ] Render EmbeddableEditor with test code
3. [ ] Verify page loads in browser

### Step 3: Write E2E Tests

1. [ ] **TEST**: Monaco editor renders
2. [ ] **TEST**: Run button executes Lua and shows output
3. [ ] **TEST**: Ctrl+Enter keyboard shortcut works
4. [ ] **TEST**: Reset button restores initial code
5. [ ] **TEST**: Lua errors display in output panel

### Step 4: CI Integration

1. [ ] Add Playwright to GitHub Actions workflow
2. [ ] Verify tests pass in CI

## Testing Strategy

### E2E Tests (5 tests)

- [ ] Monaco editor renders and is interactive
- [ ] Run button executes Lua code
- [ ] Output panel displays execution results
- [ ] Ctrl+Enter shortcut executes code
- [ ] Lua syntax errors display gracefully

## Success Metrics

- [ ] All 5 E2E tests pass locally
- [ ] Tests pass in CI
- [ ] Tests complete in < 30 seconds
- [ ] No flaky tests

## Dependencies

- Phase 1: Embeddable Editor (completed)

---

## Approval

- [ ] Technical Review
- [ ] Testing Plan Review
