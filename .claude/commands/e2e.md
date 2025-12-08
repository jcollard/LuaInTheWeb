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

Example test page structure:
```tsx
// src/pages/test/MyFeatureTest.tsx
export function MyFeatureTest() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>MyFeature Test Page</h1>
      <MyFeature {...testProps} />
    </div>
  )
}
```

Add the route in App.tsx (dev only):
```tsx
{import.meta.env.DEV && (
  <Route path="/test/my-feature" element={<MyFeatureTest />} />
)}
```

## Writing E2E Tests

Location: `e2e/<feature>.spec.ts`

Follow this pattern:

```typescript
import { test, expect } from '@playwright/test'

test.describe('MyFeature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/my-feature')
    // Wait for async components to load
    await expect(page.locator('[data-testid="my-feature"]')).toBeVisible()
  })

  test('performs core user action', async ({ page }) => {
    // Interact with UI
    await page.click('button:has-text("Action")')

    // Assert on visible outcomes
    await expect(page.locator('[data-testid="result"]')).toContainText('expected')
  })
})
```

## Best Practices

### Wait for Async Operations

The Lua WASM engine and Monaco take time to load. Always wait:

```typescript
// Wait for Monaco
await expect(page.locator('.monaco-editor')).toBeVisible()

// Wait for Lua engine (if no UI indicator)
await page.waitForTimeout(1000)

// Use extended timeouts for async operations
await expect(outputPanel).toContainText('result', { timeout: 10000 })
```

### Use data-testid Attributes

Target elements with `data-testid` for stable selectors:

```typescript
// Good
await page.locator('[data-testid="output-panel"]')

// Avoid (fragile)
await page.locator('.some-css-class')
```

### Test User-Visible Behavior

Focus on what users see, not implementation details:

```typescript
// Good - tests user-visible outcome
await expect(page.locator('[data-testid="output"]')).toContainText('Hello')

// Avoid - tests implementation details
await expect(someInternalState).toBe(true)
```

## Running E2E Tests

```bash
npm run test:e2e        # Run all E2E tests (headless)
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:headed # Run with visible browser
```

## E2E Test Checklist

Before considering E2E tests complete:

- [ ] Core user flows covered
- [ ] Test page created at `/test/<feature>`
- [ ] Tests wait for async operations
- [ ] data-testid attributes used for selectors
- [ ] Tests pass locally
- [ ] Tests pass in CI
