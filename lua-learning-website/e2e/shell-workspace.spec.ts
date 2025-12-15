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
    test('shell starts in home directory', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Verify we start in /home
      await terminal.execute('pwd')

      // Terminal should show /home as current directory
      await terminal.expectToContain('/home')
    })

    test('can navigate to root and see workspaces', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Navigate to root to see mount points
      await terminal.execute('cd /')
      await terminal.execute('ls')

      // Should show the default workspace mount point (home)
      await terminal.expectToContain('home')
    })

    test('can create files in workspace via shell', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Shell starts in /home, create a file directly
      await terminal.execute('touch test-file.lua')

      // Verify file was created
      await terminal.execute('ls')
      await terminal.expectToContain('test-file.lua')
    })

    test('can create directories in workspace via shell', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Shell starts in /home, create a directory
      await terminal.execute('mkdir test-dir')

      // Navigate into the new directory
      await terminal.execute('cd test-dir')

      // Verify current directory
      await terminal.execute('pwd')
      await terminal.expectToContain('/home/test-dir')
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
      await terminal.expectToContain('home')
    })

    test('shell can navigate back to root from home', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Shell starts in /home, navigate to root
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

      // Shell starts in /home, create a file directly
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
      await terminal.execute('cd /home')
      await terminal.execute('ls')
      await terminal.expectToContain('shell-created.lua')
    })
  })
})
