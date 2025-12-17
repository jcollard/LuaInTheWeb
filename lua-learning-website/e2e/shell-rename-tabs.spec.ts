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
 * are covered by unit tests in IDEContext.test.tsx and mv.test.ts.
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

  test.describe('tab updates when file renamed via mv', () => {
    test('open tab updates name when file is renamed via mv', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Step 1: Create a test file via shell
      await terminal.execute('touch /home/original.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Step 2: Wait for file tree to update and show the new file
      const fileTreeItem = page.getByRole('treeitem', { name: /original\.lua/i })
      await expect(fileTreeItem).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Step 3: Open the file in a tab by double-clicking (permanent tab)
      await fileTreeItem.dblclick()
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Step 4: Verify tab shows original filename
      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab', { name: /original\.lua/i })).toBeVisible()

      // Step 5: Rename file via shell mv command
      await terminal.focus()
      await terminal.execute('mv /home/original.lua /home/renamed.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Step 6: Verify tab now shows the new filename
      await expect(editorPanel.getByRole('tab', { name: /renamed\.lua/i })).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })

      // Step 7: Verify old tab name is gone
      await expect(editorPanel.getByRole('tab', { name: /original\.lua/i })).not.toBeVisible()
    })

    test('renaming file not open in tab does not crash', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a file via shell but don't open it
      await terminal.execute('touch /home/closed-file.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Wait for file to appear in tree
      await expect(page.getByRole('treeitem', { name: /closed-file\.lua/i })).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })

      // Rename it via mv - should not crash
      await terminal.execute('mv /home/closed-file.lua /home/renamed-file.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify the rename worked (file tree shows new name)
      await expect(page.getByRole('treeitem', { name: /renamed-file\.lua/i })).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })

      // Verify old name is gone from tree
      await expect(page.getByRole('treeitem', { name: /closed-file\.lua/i })).not.toBeVisible()
    })
  })
})
