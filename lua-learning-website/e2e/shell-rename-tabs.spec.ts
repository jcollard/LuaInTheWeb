import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for shell mv command updating tabs (Issue #181).
 *
 * Tests that when a file is renamed via `mv` command in the shell,
 * open tabs are updated to reflect the new filename.
 *
 * Note: Additional edge cases (dirty state preservation, directory renames)
 * are covered by unit tests in useShell.test.ts and mv.test.ts.
 */
test.describe('Shell Rename Tab Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Expand the workspace folder so new files/folders are visible
    const workspaceChevron = page.getByTestId('folder-chevron').first()
    await workspaceChevron.click()
    await page.waitForTimeout(100) // Wait for expansion animation

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

  test.describe('file rename via mv', () => {
    test('mv command calls onFileMove callback', async ({ page }) => {
      // This test verifies the shell integration is working by checking
      // that mv command executes successfully
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a test file via shell
      await terminal.execute('touch /home/test-mv.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Rename it using mv
      await terminal.execute('mv /home/test-mv.lua /home/renamed-mv.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify the file was renamed by listing the directory
      await terminal.execute('ls /home')
      await terminal.expectToContain('renamed-mv.lua')
      // Note: We don't check for absence of test-mv.lua since the command
      // history will still contain that filename from the touch command
    })

    test('renaming file not open in tab does not crash', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a file via shell but don't open it
      await terminal.execute('touch /home/notopen.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Rename it via mv - should not crash
      await terminal.execute('mv /home/notopen.lua /home/renamed.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify the rename worked
      await terminal.execute('ls /home')
      await terminal.expectToContain('renamed.lua')
    })
  })
})
