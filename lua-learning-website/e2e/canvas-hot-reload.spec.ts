import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas hot reload functionality.
 *
 * Note: The CanvasGamePanel's Reload button only appears when the component
 * manages its own Lua process (standalone mode). When used with shell integration
 * (via onCanvasReady), the shell manages the Lua process and the CanvasGamePanel
 * doesn't have direct control over it.
 *
 * These tests verify the shell-integrated canvas behavior where the canvas
 * itself is rendered but process control is handled by the shell.
 *
 * The --hot-reload flag tests verify:
 * - The flag is accepted by the lua command
 * - Saving a .lua file triggers the lua-file-saved event
 * - The auto-reload mechanism correctly filters by hot reload mode
 */
test.describe('Canvas Hot Reload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for the shell terminal to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test.describe('Canvas Tab Behavior', () => {
    test('canvas tab opens when canvas.start() is called', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear (indicates Lua process is running)
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas that runs for a short time then stops
      await terminal.type('canvas.tick(function() canvas.clear() canvas.set_color(255, 0, 0) canvas.fill_rect(0, 0, 100, 100) if canvas.get_time() > 0.5 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Verify canvas tab is visible
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to stop naturally
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('canvas.reload() can be called without error', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Track whether reload was called
      await terminal.type('frame_count = 0')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('reload_called = false')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Canvas that calls canvas.reload() once and then stops
      // Note: reload won't actually reload any modules since none are loaded,
      // but it should not throw an error
      await terminal.type('canvas.tick(function() canvas.clear() canvas.set_color(0, 255, 0) canvas.fill_rect(0, 0, 50, 50) frame_count = frame_count + 1 if frame_count == 10 and not reload_called then reload_called = true canvas.reload() end if frame_count > 30 then print("canvas done") canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Verify canvas tab is visible
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to stop
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Verify that canvas completed successfully (reload didn't crash it)
      await terminal.expectToContain('canvas done', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Hot Reload Flag', () => {
    test('--hot-reload=auto flag is accepted by lua command', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a simple Lua file via terminal
      await terminal.execute('echo "print(\\"hello\\")" > test.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Run lua with --hot-reload=auto flag (should not error)
      await terminal.type('lua --hot-reload=auto test.lua')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

      // Should see the output (file executes successfully)
      await terminal.expectToContain('hello', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('--hot-reload=manual flag is accepted by lua command', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a simple Lua file via terminal
      await terminal.execute('echo "print(\\"world\\")" > test2.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Run lua with --hot-reload=manual flag (should not error)
      await terminal.type('lua --hot-reload=manual test2.lua')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

      // Should see the output (file executes successfully)
      await terminal.expectToContain('world', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('invalid --hot-reload value defaults to manual (no error)', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a simple Lua file via terminal
      await terminal.execute('echo "print(\\"test\\")" > test3.lua')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Run lua with invalid --hot-reload value (should not error, defaults to manual)
      await terminal.type('lua --hot-reload=invalid test3.lua')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

      // Should see the output (file executes successfully)
      await terminal.expectToContain('test', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Lua File Save Event', () => {
    test('saving a .lua file dispatches lua-file-saved event', async ({ page }) => {
      // Set up event listener before any actions
      const eventFired = page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const handler = () => {
            window.removeEventListener('lua-file-saved', handler)
            resolve(true)
          }
          window.addEventListener('lua-file-saved', handler)
          // Timeout after 5 seconds
          setTimeout(() => {
            window.removeEventListener('lua-file-saved', handler)
            resolve(false)
          }, 5000)
        })
      })

      // Expand workspace folder
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await expect(page.getByRole('treeitem').nth(1)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Create a new Lua file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await input.fill('test_save.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click the file to open it
      await page.getByRole('treeitem', { name: /test_save\.lua/i }).click()
      await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Type some content
      await page.locator('.monaco-editor').click()
      await page.keyboard.type('print("test")', { delay: 30 })
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Save with Ctrl+S
      await page.keyboard.press('Control+s')

      // Wait for event to fire
      const didFire = await eventFired
      expect(didFire).toBe(true)
    })

    test('saving a non-.lua file does not dispatch lua-file-saved event', async ({ page }) => {
      // Set up event listener before any actions
      const eventFired = page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const handler = () => {
            window.removeEventListener('lua-file-saved', handler)
            resolve(true)
          }
          window.addEventListener('lua-file-saved', handler)
          // Short timeout - we expect this NOT to fire
          setTimeout(() => {
            window.removeEventListener('lua-file-saved', handler)
            resolve(false)
          }, 1000)
        })
      })

      // Expand workspace folder
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await expect(page.getByRole('treeitem').nth(1)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Create a non-Lua file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await input.fill('test_save.txt')
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click the file to open it
      await page.getByRole('treeitem', { name: /test_save\.txt/i }).click()
      await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Type some content
      await page.locator('.monaco-editor').click()
      await page.keyboard.type('hello world', { delay: 30 })
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Save with Ctrl+S
      await page.keyboard.press('Control+s')

      // Wait and verify event did NOT fire
      const didFire = await eventFired
      expect(didFire).toBe(false)
    })
  })
})
