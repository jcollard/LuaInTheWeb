# E2E Testing Guide

This project uses [Playwright](https://playwright.dev/) for end-to-end testing. E2E tests verify that features work correctly in a real browser environment.

## Overview

E2E tests complement unit tests by:
- Testing full integration (Monaco + Lua WASM + React)
- Verifying user flows work end-to-end
- Catching issues that mocked unit tests miss

## Project Structure

```
lua-learning-website/
├── e2e/                          # E2E test files
│   └── embeddable-editor.spec.ts
├── src/pages/test/               # Test pages (dev only)
│   ├── EmbeddableEditorTest.tsx
│   └── index.ts
├── playwright.config.ts          # Playwright configuration
└── playwright-report/            # Test reports (generated)
```

## Test Page Pattern

E2E tests target dedicated test pages that serve dual purposes:

1. **E2E test targets** - Playwright navigates to these pages
2. **Manual QA sandboxes** - Developers can manually verify features

### Creating a Test Page

1. Create the test page component:

```tsx
// src/pages/test/MyFeatureTest.tsx
import { MyFeature } from '../../components/MyFeature'

export function MyFeatureTest() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>MyFeature Test Page</h1>

      <section style={{ marginBottom: '40px' }}>
        <h2>Default Configuration</h2>
        <MyFeature />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Custom Configuration</h2>
        <MyFeature customProp="value" />
      </section>
    </div>
  )
}
```

2. Export from index:

```tsx
// src/pages/test/index.ts
export { MyFeatureTest } from './MyFeatureTest'
```

3. Add the route (dev only):

```tsx
// In App.tsx
{import.meta.env.DEV && (
  <Route path="/test/my-feature" element={<MyFeatureTest />} />
)}
```

## Writing E2E Tests

### Basic Test Structure

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('MyFeature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/my-feature')
    // Wait for component to be ready
    await expect(page.locator('[data-testid="my-feature"]')).toBeVisible()
  })

  test('renders correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('MyFeature')
  })

  test('handles user interaction', async ({ page }) => {
    await page.click('button:has-text("Submit")')
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
  })
})
```

### Handling Async Operations

The Lua WASM engine takes time to initialize. Wait appropriately:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/test/embeddable-editor')
  // Wait for Monaco to load
  await expect(page.locator('.monaco-editor')).toBeVisible()
  // Wait for Lua engine (no UI indicator, so use timeout)
  await page.waitForTimeout(1000)
})

test('executes code', async ({ page }) => {
  await page.click('button:has-text("Run")')
  // Use extended timeout for execution
  await expect(page.locator('[data-testid="output-panel"]'))
    .toContainText('result', { timeout: 10000 })
})
```

### Keyboard Interactions with Monaco

Monaco Editor captures keyboard events. Target its internal textarea:

```typescript
test('Ctrl+Enter executes code', async ({ page }) => {
  const textarea = page.locator('.monaco-editor textarea').first()
  await textarea.focus()
  await page.keyboard.press('Control+Enter')

  await expect(page.locator('[data-testid="output-panel"]'))
    .toContainText('result')
})
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Test user-visible outcomes** not implementation details
3. **Wait for async operations** with appropriate timeouts
4. **Keep tests focused** on single behaviors
5. **Use descriptive test names** that explain the scenario

## Running Tests

### Local Development

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Open Playwright UI for interactive debugging
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed
```

### CI/CD

E2E tests run automatically in GitHub Actions on:
- Push to `main` branch
- Pull requests to `main`

The workflow is defined in `.github/workflows/e2e.yml`.

## Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### Key Configuration Options

- **testDir**: Location of E2E test files
- **webServer**: Automatically starts dev server for tests
- **retries**: Retry failed tests in CI to handle flakiness
- **trace**: Capture traces on failure for debugging

## Debugging Failed Tests

### View Test Report

```bash
npx playwright show-report
```

### Debug Mode

```bash
npx playwright test --debug
```

### View Traces

Failed tests in CI upload traces to GitHub Actions artifacts. Download and view:

```bash
npx playwright show-trace path/to/trace.zip
```

## Checklist

Before considering E2E implementation complete:

- [ ] Test page created at `/test/<feature>`
- [ ] Core user flows covered
- [ ] Tests wait for async operations
- [ ] data-testid attributes on key elements
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] No flaky tests
