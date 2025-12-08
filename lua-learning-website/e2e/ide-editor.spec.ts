import { test, expect } from '@playwright/test'

test.describe('IDE Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    // Wait for the IDE layout to render
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test('loads IDE layout at /editor route', async ({ page }) => {
    // Assert - IDE layout should be visible
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test('displays activity bar with icons', async ({ page }) => {
    // Assert - Activity bar with navigation should be visible
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    await expect(activityBar).toBeVisible()

    // Should have explorer, search, and extensions buttons
    await expect(page.getByRole('button', { name: /explorer/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /extensions/i })).toBeVisible()
  })

  test('displays sidebar panel', async ({ page }) => {
    // Assert - Sidebar should be visible
    await expect(page.locator('[data-testid="sidebar-panel"]')).toBeVisible()

    // Should show Explorer header by default (exact match to avoid matching placeholder)
    await expect(page.locator('[data-testid="sidebar-panel"]').getByText('Explorer', { exact: true })).toBeVisible()
  })

  test('clicking activity bar icon changes sidebar header', async ({ page }) => {
    // Click on Search icon
    await page.getByRole('button', { name: /search/i }).click()

    // Assert - Sidebar should show Search
    await expect(page.getByText('Search coming soon...')).toBeVisible()

    // Click on Extensions icon
    await page.getByRole('button', { name: /extensions/i }).click()

    // Assert - Sidebar should show Extensions
    await expect(page.getByText('Extensions coming soon...')).toBeVisible()
  })

  test('displays editor panel with Monaco editor', async ({ page }) => {
    // Assert - Editor panel should be visible
    await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()

    // Should have a file tab
    await expect(page.getByText('untitled.lua')).toBeVisible()

    // Should have run button
    await expect(page.getByRole('button', { name: /run/i })).toBeVisible()
  })

  test('displays bottom panel with Terminal and REPL tabs', async ({ page }) => {
    // Assert - Bottom panel should be visible
    await expect(page.locator('[data-testid="bottom-panel"]')).toBeVisible()

    // Should have Terminal and REPL tabs
    await expect(page.getByRole('tab', { name: /terminal/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /repl/i })).toBeVisible()
  })

  test('switches between Terminal and REPL tabs', async ({ page }) => {
    // Click REPL tab
    await page.getByRole('tab', { name: /repl/i }).click()

    // Assert - REPL content should be visible (LuaRepl component)
    await expect(page.locator('[data-testid="bottom-panel"]')).toBeVisible()

    // Click back to Terminal
    await page.getByRole('tab', { name: /terminal/i }).click()

    // Assert - Terminal content should be visible
    await expect(page.locator('[data-testid="terminal-content"]')).toBeVisible()
  })

  test('displays status bar with line/column info', async ({ page }) => {
    // Assert - Status bar should be visible
    const statusBar = page.getByRole('status')
    await expect(statusBar).toBeVisible()

    // Should show line and column numbers (format: "Ln X, Col Y")
    await expect(page.getByText(/Ln \d+, Col \d+/)).toBeVisible()

    // Should show language
    await expect(statusBar.getByText('Lua')).toBeVisible()

    // Should show encoding
    await expect(statusBar.getByText('UTF-8')).toBeVisible()
  })

  test('panel resize handles are visible', async ({ page }) => {
    // Assert - Resize handles should be present
    const resizeHandles = page.locator('[role="separator"]')
    await expect(resizeHandles.first()).toBeVisible()
  })

  test('run button is clickable and responds', async ({ page }) => {
    // Assert - Run button should be visible and enabled
    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeVisible()
    await expect(runButton).toBeEnabled()

    // Click run button (with empty code - should not crash)
    await runButton.click()

    // Button should still be functional after click
    await expect(runButton).toBeVisible()
  })

  test('navigating to /editor from home page works', async ({ page }) => {
    // Start at home
    await page.goto('/')
    await expect(page.getByText('Welcome to Learn Lua')).toBeVisible()

    // Click Editor link
    await page.getByRole('link', { name: /editor/i }).click()

    // Assert - Should be on editor page
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })
})
