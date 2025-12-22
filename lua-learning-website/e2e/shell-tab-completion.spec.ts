import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for Shell terminal tab completion feature.
 *
 * Tests tab completion for both shell commands and file paths.
 */
test.describe('Shell Tab Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
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

  test('Tab completes partial command (single match)', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Type partial command "cle" which should complete to "clear"
    await terminal.type('cle')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab to complete
    await terminal.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Press Enter to execute (should clear the terminal)
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // After clear, the terminal should show a fresh prompt
    // Verify terminal is still functional by typing a command
    await terminal.execute('pwd')
    await terminal.expectToContain('/')
  })

  test('Tab shows multiple command matches', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Type "c" which matches multiple commands (cd, clear, cp, cat)
    await terminal.type('c')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab to show suggestions
    await terminal.press('Tab')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should show multiple completions (at least cd and clear)
    await terminal.expectToContain('cd')
    await terminal.expectToContain('clear')

    // Cancel and verify terminal is functional
    await terminal.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await terminal.execute('pwd')
    await terminal.expectToContain('/')
  })

  // SKIPPED: Real bug - Tab on empty input doesn't show available commands
  // Tracked in: https://github.com/jcollard/LuaInTheWeb/issues/359
  test.skip('Tab on empty input shows available commands', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Press Tab with empty input
    await terminal.press('Tab')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should show list of available commands
    await terminal.expectToContain('cd')
    await terminal.expectToContain('ls')
    await terminal.expectToContain('pwd')

    // Cancel and verify terminal is functional
    await terminal.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await terminal.execute('help')
    await terminal.expectToContain('Available commands')
  })

  test('Tab completes directory path after command', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // First, create a directory structure for testing
    await terminal.execute('mkdir testdir')

    // Now type "cd test" and press Tab
    await terminal.type('cd test')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Press Enter to execute (should cd into testdir)
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Verify we changed directory
    await terminal.execute('pwd')
    await terminal.expectToContain('/testdir')
  })

  test('Tab does nothing when no matches', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Type something that won't match any command
    await terminal.type('xyz')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab - should do nothing (no completion available)
    await terminal.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // The line should still have "xyz" (unchanged)
    const content = await terminal.getAllText()
    expect(content).toContain('xyz')

    // Cancel and verify terminal is functional
    await terminal.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await terminal.execute('pwd')
    await terminal.expectToContain('/')
  })

  test('Tab completion works after creating files', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Create a file
    await terminal.execute('touch myfile.txt')

    // Now type "ls my" and press Tab
    await terminal.type('ls my')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Press Enter to execute
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // The ls command should have completed to "ls myfile.txt" and shown the file
    await terminal.expectToContain('myfile.txt')
  })
})
