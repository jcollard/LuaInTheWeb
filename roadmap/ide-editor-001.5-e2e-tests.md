# Phase 1.5: E2E Testing Foundation

**Status**: Draft
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Establish E2E testing as a project standard by:
1. Setting up Playwright for E2E tests
2. Writing E2E tests for EmbeddableEditor
3. Creating test pages that double as manual QA sandboxes
4. Updating project documentation to include E2E testing guidelines

## Problem Statement

Unit tests mock Monaco and the Lua engine. We need to:
- Verify the full integration works in a real browser
- Establish patterns for E2E testing future user-facing features
- Create sandbox pages for manual QA
- Document E2E testing as a project standard

## Proposed Solution

Create a comprehensive E2E testing foundation:
- Playwright setup with CI integration
- Test page pattern (`/test/*` routes) for E2E targets and manual QA
- Documentation updates across project config files
- Guidelines for when and how to write E2E tests

## Requirements

### Functional Requirements

- [ ] Playwright installed and configured
- [ ] Test page/route pattern established (`/test/*`)
- [ ] E2E tests for EmbeddableEditor core user flows
- [ ] Documentation updated with E2E guidelines

### Non-Functional Requirements

- [ ] Tests run in CI (GitHub Actions)
- [ ] Tests complete in < 30 seconds
- [ ] Clear failure messages
- [ ] Test pages serve as manual QA sandboxes

## Technical Design

### Test Page Pattern

Create dev-only test routes at `/test/*` that serve dual purposes:
1. **E2E test targets** - Playwright navigates to these pages
2. **Manual QA sandboxes** - Developers can manually verify features

```tsx
// src/pages/test/EmbeddableEditorTest.tsx (dev only)
export function EmbeddableEditorTest() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>EmbeddableEditor Test Page</h1>

      <h2>Interactive Editor</h2>
      <EmbeddableEditor code={`print("Hello from Lua!")`} />

      <h2>Read-only Editor</h2>
      <EmbeddableEditor code={`local x = 10`} readOnly runnable={false} />
    </div>
  )
}
```

### E2E Test Cases

```typescript
// e2e/embeddable-editor.spec.ts
import { test, expect } from '@playwright/test'

test.describe('EmbeddableEditor', () => {
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
    await page.locator('.monaco-editor textarea').fill('print("modified")')
    await page.click('button:has-text("Reset")')
    await expect(page.locator('.monaco-editor')).toContainText('Hello from Lua!')
  })

  test('displays Lua errors without crashing', async ({ page }) => {
    await page.goto('/test/embeddable-editor')
    await page.locator('.monaco-editor textarea').fill('invalid lua syntax !!!')
    await page.click('button:has-text("Run")')
    await expect(page.locator('[data-testid="output-panel"]')).toContainText('error')
  })
})
```

### Documentation Updates

#### Files to Update

| File | Changes |
|------|---------|
| `.claude/OnConversationStart.md` | Add `npm run test:e2e` command, E2E testing mention |
| `.claude/commands/review-plan.md` | Add optional E2E checklist item |
| `.claude/commands/code-review.md` | Add E2E testing section |
| `docs/testing.md` | Add E2E testing section |

#### New Files to Create

| File | Purpose |
|------|---------|
| `.claude/commands/e2e.md` | Slash command `/e2e` with E2E testing guidelines |
| `docs/e2e-testing.md` | Detailed E2E testing guide |

## Implementation Plan

### Step 1: Setup Playwright

1. [ ] Install Playwright: `npm install -D @playwright/test`
2. [ ] Install browsers: `npx playwright install`
3. [ ] Create `playwright.config.ts`
4. [ ] Add npm scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`
5. [ ] Verify Playwright runs with a simple test

### Step 2: Create Test Page Infrastructure

1. [ ] Create `/test` route parent (dev only)
2. [ ] Create `/test/embeddable-editor` page
3. [ ] Add multiple EmbeddableEditor variants for testing
4. [ ] Verify page loads in browser with `npm run dev`

### Step 3: Write E2E Tests

1. [ ] Create `e2e/` directory
2. [ ] **TEST**: Monaco editor renders
3. [ ] **TEST**: Run button executes Lua and shows output
4. [ ] **TEST**: Ctrl+Enter keyboard shortcut works
5. [ ] **TEST**: Reset button restores initial code
6. [ ] **TEST**: Lua errors display in output panel

### Step 4: CI Integration

1. [ ] Create `.github/workflows/e2e.yml`
2. [ ] Configure Playwright for CI (headless, retries)
3. [ ] Verify tests pass in CI
4. [ ] Add E2E status badge to README (optional)

### Step 5: Update Existing Documentation

1. [ ] Update `.claude/OnConversationStart.md`:
   - Add `npm run test:e2e` to Commands section
   - Add E2E mention to "Before Completing Any Task" checklist
2. [ ] Update `.claude/commands/review-plan.md`:
   - Add optional E2E checklist item for user-facing features
3. [ ] Update `.claude/commands/code-review.md`:
   - Add E2E testing section
4. [ ] Update `docs/testing.md`:
   - Add E2E testing overview section

### Step 6: Create New Documentation

1. [ ] Create `.claude/commands/e2e.md`:
   - When to write E2E tests
   - How to write E2E tests
   - Test page pattern
   - Running E2E tests
2. [ ] Create `docs/e2e-testing.md`:
   - Detailed guide for E2E testing
   - Playwright best practices
   - Test page conventions
   - CI configuration

## Testing Strategy

### E2E Tests (5 tests)

- [ ] Monaco editor renders and is interactive
- [ ] Run button executes Lua code
- [ ] Output panel displays execution results
- [ ] Ctrl+Enter shortcut executes code
- [ ] Lua syntax errors display gracefully

### Manual QA via Test Pages

The `/test/embeddable-editor` page enables manual verification of:
- Visual appearance
- Responsive layout
- Keyboard navigation
- Screen reader accessibility

## Documentation Content

### `.claude/commands/e2e.md` Content

```markdown
# E2E Testing Guidelines

Use this guide when writing E2E tests for user-facing features.

## When to Write E2E Tests

Write E2E tests for:
- Core user flows (write code, run, see output)
- Features that integrate multiple systems (Monaco + Lua)
- Anything that can't be fully tested with mocked unit tests

Do NOT write E2E tests for:
- Internal utilities
- Pure functions
- Components with no user interaction

## Test Page Pattern

Create test pages at `/test/<feature-name>`:
- Only available in development mode
- Serve as E2E test targets
- Double as manual QA sandboxes

## Writing E2E Tests

Location: `e2e/<feature>.spec.ts`

Follow this pattern:
1. Navigate to test page
2. Interact with UI (click, type, etc.)
3. Assert on visible outcomes

Keep tests focused on user-visible behavior, not implementation details.

## Running E2E Tests

\`\`\`bash
npm run test:e2e        # Run all E2E tests (headless)
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:headed # Run with visible browser
\`\`\`
```

## Success Metrics

- [ ] All 5 E2E tests pass locally
- [ ] Tests pass in CI
- [ ] Tests complete in < 30 seconds
- [ ] No flaky tests
- [ ] Documentation updated (6 files)
- [ ] `/e2e` slash command available

## Dependencies

- Phase 1: Embeddable Editor (completed)

---

## Approval

- [ ] Technical Review
- [ ] Testing Plan Review
