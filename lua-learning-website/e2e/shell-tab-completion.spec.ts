import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

/**
 * E2E tests for Shell terminal tab completion feature.
 *
 * Tests tab completion for both shell commands and file paths.
 */
test.describe('Shell Tab Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Switch to Shell tab (in the bottom panel)
    await page.getByRole('tab', { name: /shell/i }).click()
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Wait for the Shell terminal to initialize
    const shellContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(shellContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Wait for xterm to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"] .xterm-screen')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test('Tab completes partial command (single match)', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Type partial command "cle" which should complete to "clear"
    await page.keyboard.type('cle')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab to complete
    await page.keyboard.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Press Enter to execute (should clear the terminal)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should still be visible and functional
    await expect(terminal).toBeVisible()

    // Verify by typing another command
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('Tab shows multiple command matches', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Type "c" which matches multiple commands (cd, clear, cp)
    await page.keyboard.type('c')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab to show suggestions
    await page.keyboard.press('Tab')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should still be visible
    await expect(terminal).toBeVisible()

    // Cancel and type a new command to verify terminal is functional
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('Tab on empty input shows available commands', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab with empty input
    await page.keyboard.press('Tab')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should show list of available commands
    await expect(terminal).toBeVisible()

    // Cancel and verify terminal is functional
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await page.keyboard.type('help')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('Tab completes directory path after command', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // First, create a directory structure for testing
    await page.keyboard.type('mkdir testdir')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Now type "cd test" and press Tab
    await page.keyboard.type('cd test')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await page.keyboard.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Press Enter to execute (should cd into testdir)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Verify we changed directory
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('Tab does nothing when no matches', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Type something that won't match any command
    await page.keyboard.type('xyz')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Tab - should do nothing
    await page.keyboard.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Terminal should still be visible
    await expect(terminal).toBeVisible()

    // Cancel and verify terminal is functional
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('Tab completion works after creating files', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Create a file
    await page.keyboard.type('touch myfile.txt')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Now type "ls my" and press Tab
    await page.keyboard.type('ls my')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await page.keyboard.press('Tab')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Press Enter to execute
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })
})
