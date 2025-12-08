# Milestone Checkpoint - E2E Testing

Use this command when you've completed a set of related implementation items that form a complete user-facing feature or flow.

## When to Run a Milestone

Run `/milestone` when:
- A user-visible flow is complete (can be demonstrated end-to-end)
- Multiple related items have been implemented and mutation-tested
- The plan explicitly marks a **MILESTONE** checkpoint
- You've completed 2-4 implementation items that work together

Do NOT run `/milestone` for:
- Individual utility functions
- Internal refactoring with no user-visible changes
- Components that aren't yet integrated into a flow

## Milestone Checklist

### 1. Verify All Items Are Complete

Before E2E testing, confirm:
- [ ] All related implementation items completed
- [ ] All unit tests passing: `npm run test`
- [ ] All scoped mutation tests passing (>= 80% per item)
- [ ] Lint passes: `npm run lint`

### 2. Create/Update Test Page (if needed)

For new user-facing features, create a test page:

**Location:** `src/pages/test/<FeatureName>Test.tsx`
**Route:** `/test/<feature-name>`

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

Register in App.tsx (dev only):
```tsx
{import.meta.env.DEV && (
  <Route path="/test/my-feature" element={<MyFeatureTest />} />
)}
```

### 3. Write E2E Tests

**Location:** `e2e/<feature>.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/feature-name')
    await expect(page.locator('[data-testid="feature"]')).toBeVisible()
  })

  test('completes primary user flow', async ({ page }) => {
    // User actions
    await page.click('[data-testid="action-button"]')

    // Verify outcome
    await expect(page.locator('[data-testid="result"]')).toContainText('expected')
  })

  test('handles error case gracefully', async ({ page }) => {
    // Trigger error condition
    // Verify error handling
  })
})
```

### 4. Run E2E Tests

```bash
# Run E2E tests for the specific feature
npm run test:e2e e2e/feature-name.spec.ts

# Or run all E2E tests
npm run test:e2e
```

### 5. Fix Any Failures

If E2E tests fail:
1. Check if it's a test issue (selectors, timing) or implementation issue
2. Fix the root cause
3. Re-run affected unit tests and mutation tests if implementation changed
4. Re-run E2E tests

## Milestone Completion Output

After completing the milestone, report:

```
MILESTONE COMPLETE: [Feature Name]

Items included:
- [Item 1]
- [Item 2]
- [Item 3]

E2E Tests:
- [ ] Test page created: /test/feature-name
- [ ] E2E test file: e2e/feature-name.spec.ts
- [ ] All E2E tests passing

Ready to proceed to next implementation items.
```

## E2E Best Practices Reminder

- Use `data-testid` attributes for stable selectors
- Wait for async operations (Monaco, Lua WASM)
- Test user-visible outcomes, not implementation details
- Keep E2E tests focused on critical paths
- Use extended timeouts for async operations: `{ timeout: 10000 }`
