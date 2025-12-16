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

  test('should load module from same directory using require()', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Verify files exist
    await terminal.execute('ls')
    await terminal.expectToContain('utils.lua')
    await terminal.expectToContain('test.lua')

    // Run the script
    await terminal.execute('lua test.lua')

    // Wait for Lua execution
    await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

    // Check for output
    const content = await terminal.getAllText()
    console.log('Terminal content after lua test.lua:', content)

    // Should see unique output from require'd module
    expect(content).toContain('REQUIRE_TEST_SUCCESS_World_12345')
  })

  test('should allow scripts with top-level return statements', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Set up a module-style script that returns a value
    await page.evaluate(() => {
      const now = Date.now()
      const fsData = {
        version: 1,
        files: {
          '/module.lua': {
            name: 'module.lua',
            content: `local M = {}
function M.test()
  print("MODULE_RETURN_TEST_SUCCESS")
end
M.test()
return M`,
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

    // Run the module-style script directly
    await terminal.execute('lua module.lua')

    // Wait for Lua execution
    await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

    // Should execute without error and print the test message
    const content = await terminal.getAllText()
    console.log('Terminal content:', content)
    expect(content).toContain('MODULE_RETURN_TEST_SUCCESS')
    expect(content).not.toContain('[error]')
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
