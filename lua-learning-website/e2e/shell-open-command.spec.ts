import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for Shell 'open' command (Issue #144).
 *
 * Tests that the 'open' command opens files in the editor.
 */
test.describe('Shell Open Command', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    // Switch to Shell tab (in the bottom panel)
    await page.getByRole('tab', { name: /shell/i }).click()
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Wait for the Shell terminal to initialize
    const shellContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(shellContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Wait for xterm to initialize
    await expect(
      page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    ).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test.describe('opening existing files', () => {
    test('opens file in editor when using open command', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a test file first
      await terminal.execute('touch test-open.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Use open command to open the file
      await terminal.execute('open test-open.lua')

      // Wait for and verify the file is opened in a tab
      await expect(page.locator('[role="tab"]').filter({ hasText: 'test-open.lua' })).toBeVisible({
        timeout: TIMEOUTS.ASYNC_OPERATION,
      })

      // Terminal should show success message
      await terminal.expectToContain('Opened:')
    })

    test('opens file with absolute path', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a test file first
      await terminal.execute('touch absolute-test.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Navigate away
      await terminal.execute('cd /')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Use open command with absolute path
      await terminal.execute('open /home/absolute-test.lua')

      // Wait for and verify the file is opened in a tab
      await expect(page.locator('[role="tab"]').filter({ hasText: 'absolute-test.lua' })).toBeVisible({
        timeout: TIMEOUTS.ASYNC_OPERATION,
      })
    })

    test('opens file in subdirectory', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a subdirectory and file
      await terminal.execute('mkdir subdir')
      await terminal.execute('touch subdir/nested.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Use open command with relative path
      await terminal.execute('open subdir/nested.lua')

      // Wait for and verify the file is opened in a tab
      await expect(page.locator('[role="tab"]').filter({ hasText: 'nested.lua' })).toBeVisible({
        timeout: TIMEOUTS.ASYNC_OPERATION,
      })
    })
  })

  test.describe('error handling', () => {
    test('shows error when file does not exist', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Try to open a file that doesn't exist
      await terminal.execute('open nonexistent-file.lua')

      // Terminal should show error message
      await terminal.expectToContain('No such file or directory')
    })

    test('shows usage error when no file specified', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Run open command without arguments
      await terminal.execute('open')

      // Terminal should show usage error
      await terminal.expectToContain('usage')
    })
  })

  test.describe('help integration', () => {
    test('open command appears in help', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Run help command
      await terminal.execute('help')

      // The open command should be listed
      await terminal.expectToContain('open')
    })
  })
})
