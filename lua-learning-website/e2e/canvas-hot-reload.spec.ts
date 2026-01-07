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
})
