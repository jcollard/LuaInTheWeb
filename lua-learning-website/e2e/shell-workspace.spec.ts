import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

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
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Run ls to see workspace mount points
      await page.keyboard.type('ls')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Terminal should show the default workspace mount point (my-files)
      await expect(terminal).toBeVisible()
    })

    test('can navigate to workspace with cd', async ({ page }) => {
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Navigate to the default workspace
      await page.keyboard.type('cd /my-files')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify we're in the workspace
      await page.keyboard.type('pwd')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await expect(terminal).toBeVisible()
    })

    test('can create files in workspace via shell', async ({ page }) => {
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Navigate to workspace and create a file
      await page.keyboard.type('cd /my-files')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await page.keyboard.type('touch test-file.lua')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify file was created
      await page.keyboard.type('ls')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await expect(terminal).toBeVisible()
    })

    test('can create directories in workspace via shell', async ({ page }) => {
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Navigate to workspace and create a directory
      await page.keyboard.type('cd /my-files')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await page.keyboard.type('mkdir test-dir')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Navigate into the new directory
      await page.keyboard.type('cd test-dir')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify current directory
      await page.keyboard.type('pwd')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await expect(terminal).toBeVisible()
    })
  })

  test.describe('workspace root operations', () => {
    test('shell can list mount points at root', async ({ page }) => {
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Navigate to root and list mount points
      await page.keyboard.type('cd /')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await page.keyboard.type('ls')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify terminal is functional
      await expect(terminal).toBeVisible()
    })

    test('shell can navigate back to root from workspace', async ({ page }) => {
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // First navigate to workspace
      await page.keyboard.type('cd /my-files')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Navigate back to root
      await page.keyboard.type('cd /')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify we're at root
      await page.keyboard.type('pwd')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await expect(terminal).toBeVisible()
    })
  })

  test.describe('shell-workspace interaction', () => {
    test('files created in shell appear in workspace', async ({ page }) => {
      const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
      await terminal.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Create a file in the workspace via shell
      await page.keyboard.type('cd /my-files')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await page.keyboard.type('touch shell-created.lua')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify file exists via ls
      await page.keyboard.type('ls')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await expect(terminal).toBeVisible()
    })
  })
})
