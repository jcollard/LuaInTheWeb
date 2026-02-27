import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for require() module loading (Issue #278).
 *
 * Tests that require("module") finds modules in the same directory
 * as the calling script in the virtual file system.
 */
test.describe('require() module loading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to clear the page first
    await page.goto('/editor')

    // Set up virtual filesystem with test files BEFORE reload
    await page.evaluate(() => {
      const now = Date.now()
      const fsData = {
        version: 1,
        files: {
          '/utils.lua': {
            name: 'utils.lua',
            content: `local M = {}
function M.greet(name)
  return "REQUIRE_TEST_SUCCESS_" .. name .. "_12345"
end
return M`,
            createdAt: now,
            updatedAt: now,
          },
          '/test.lua': {
            name: 'test.lua',
            content: `local utils = require("utils")
print(utils.greet("World"))`,
            createdAt: now,
            updatedAt: now,
          },
        },
        folders: ['/'],
      }
      localStorage.setItem('workspace:default:fs', JSON.stringify(fsData))
    })

    // Reload to pick up the filesystem changes
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

  test('should show error when module not found', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Set up a script that requires a non-existent module
    await page.evaluate(() => {
      const now = Date.now()
      const fsData = {
        version: 1,
        files: {
          '/bad.lua': {
            name: 'bad.lua',
            content: 'require("nonexistent")',
            createdAt: now,
            updatedAt: now,
          },
        },
        folders: ['/'],
      }
      localStorage.setItem('workspace:default:fs', JSON.stringify(fsData))
    })

    // Reload to pick up the filesystem changes
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    // Switch to Shell tab
    await page.getByRole('tab', { name: /shell/i }).click()
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    const shellContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(shellContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await expect(
      page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    ).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    await terminal.focus()

    // Run the script
    await terminal.execute('lua bad.lua')

    // Wait for Lua execution
    await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

    // Should show error about module not found
    await terminal.expectToContain('not found')
  })
})
