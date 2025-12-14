import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for Shell workspace integration (Issue #202).
 *
 * Tests that the shell correctly uses the CompositeFileSystem from
 * useWorkspaceManager, allowing navigation between workspaces.
 */
test.describe('Shell Workspace Integration', () => {
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

  test.describe('workspace navigation', () => {
    test('shell starts at root directory showing workspaces', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Run ls to see workspace mount points
      await terminal.execute('ls')

      // Terminal should show the default workspace mount point (my-files)
      await terminal.expectToContain('my-files')
    })

    test('can navigate to workspace with cd', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Navigate to the default workspace
      await terminal.execute('cd /my-files')

      // Verify we're in the workspace
      await terminal.execute('pwd')

      // Should show /my-files as current directory
      await terminal.expectToContain('/my-files')
    })

    test('can create files in workspace via shell', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Navigate to workspace and create a file
      await terminal.execute('cd /my-files')
      await terminal.execute('touch test-file.lua')

      // Verify file was created
      await terminal.execute('ls')
      await terminal.expectToContain('test-file.lua')
    })

    test('can create directories in workspace via shell', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Navigate to workspace and create a directory
      await terminal.execute('cd /my-files')
      await terminal.execute('mkdir test-dir')

      // Navigate into the new directory
      await terminal.execute('cd test-dir')

      // Verify current directory
      await terminal.execute('pwd')
      await terminal.expectToContain('/my-files/test-dir')
    })
  })

  test.describe('workspace root operations', () => {
    test('shell can list mount points at root', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Navigate to root and list mount points
      await terminal.execute('cd /')
      await terminal.execute('ls')

      // Should show the default workspace
      await terminal.expectToContain('my-files')
    })

    test('shell can navigate back to root from workspace', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // First navigate to workspace
      await terminal.execute('cd /my-files')

      // Navigate back to root
      await terminal.execute('cd /')

      // Verify we're at root by checking pwd output
      await terminal.execute('pwd')

      // The buffer should contain a line with just "/" as the pwd output
      const content = await terminal.getAllText()
      // Look for pwd followed by a line containing just /
      expect(content).toMatch(/pwd[\s\S]*\n\/\s*\n/)
    })
  })

  test.describe('shell-workspace interaction', () => {
    test('files created in shell are accessible via shell commands', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a file in the workspace via shell
      await terminal.execute('cd /my-files')
      await terminal.execute('touch shell-created.lua')

      // Verify file exists via ls
      await terminal.execute('ls')
      await terminal.expectToContain('shell-created.lua')

      // Verify we can write content to the file
      await terminal.execute('echo "print(42)" > shell-created.lua')

      // Verify we can read the file
      await terminal.execute('cat shell-created.lua')
      await terminal.expectToContain('print(42)')

      // Verify file persists after navigation
      await terminal.execute('cd /')
      await terminal.execute('cd /my-files')
      await terminal.execute('ls')
      await terminal.expectToContain('shell-created.lua')
    })
  })
})
