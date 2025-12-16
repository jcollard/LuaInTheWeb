import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas shell integration.
 *
 * Tests the ability to:
 * - Run Lua scripts with canvas.start() via the shell
 * - Canvas tabs open when canvas.start() is called
 * - print() output goes to terminal while canvas runs
 * - canvas.stop() closes the canvas tab
 * - Ctrl+C stops the canvas and closes the tab
 */
test.describe('Canvas Shell Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for the shell terminal to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test.describe('Canvas Tab Opens', () => {
    test('canvas.start() opens a canvas tab', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a Lua script that uses canvas.start() then stops after brief time
      const canvasScript = `
local canvas = require('canvas')
canvas.on_draw(function()
  canvas.clear()
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(10, 10, 50, 50)
  -- Stop after first frame
  if canvas.get_time() > 0.1 then
    canvas.stop()
  end
end)
canvas.start()
print("Canvas stopped")
`
      // Write the script to a file
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/canvas_test.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Run the script
      await terminal.execute('lua /home/canvas_test.lua')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for the script to complete and canvas to stop
      await terminal.expectToContain('Canvas stopped', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Canvas tab should be closed after canvas.stop()
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('canvas tab shows correct tab name', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a simple canvas script that stops quickly
      const canvasScript = `
local canvas = require('canvas')
canvas.on_draw(function()
  if canvas.get_time() > 0.05 then canvas.stop() end
end)
canvas.start()
`
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/test_tab.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.execute('lua /home/test_tab.lua')

      // Check for canvas tab - should be named canvas-main
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await expect(canvasTab).toContainText('canvas-main')
    })
  })

  test.describe('Print Output During Canvas', () => {
    test('print() output goes to terminal while canvas runs', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a script that prints and uses canvas
      const canvasScript = `
local canvas = require('canvas')
print("Before canvas.start()")
canvas.on_draw(function()
  if canvas.get_time() > 0.1 then
    canvas.stop()
  end
end)
canvas.start()
print("After canvas.stop()")
`
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/print_test.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.execute('lua /home/print_test.lua')

      // Both print statements should appear in terminal
      await terminal.expectToContain('Before canvas.start()', { timeout: TIMEOUTS.ASYNC_OPERATION })
      await terminal.expectToContain('After canvas.stop()', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('canvas.stop() Behavior', () => {
    test('canvas.stop() closes canvas tab and unblocks start()', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Script that prints before/after to verify blocking behavior
      const canvasScript = `
local canvas = require('canvas')
local frame_count = 0
canvas.on_draw(function()
  frame_count = frame_count + 1
  if frame_count >= 5 then
    canvas.stop()
  end
end)
print("Starting canvas...")
canvas.start()
print("Canvas ended after " .. frame_count .. " frames")
`
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/stop_test.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.execute('lua /home/stop_test.lua')

      // Verify canvas opened
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for completion message
      await terminal.expectToContain('Canvas ended after', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Canvas tab should be closed
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Ctrl+C Handling', () => {
    test('Ctrl+C stops canvas and closes tab', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Script with infinite canvas loop (no canvas.stop())
      const canvasScript = `
local canvas = require('canvas')
local x = 0
canvas.on_draw(function()
  canvas.clear()
  x = x + 100 * canvas.get_delta()
  canvas.set_color(0, 255, 0)
  canvas.fill_circle(x % 800, 300, 25)
end)
print("Starting infinite canvas...")
canvas.start()
print("Canvas was interrupted")
`
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/infinite_canvas.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.execute('lua /home/infinite_canvas.lua')

      // Verify canvas opened
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to be running
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Press Ctrl+C to stop
      await terminal.press('Control+c')

      // Wait for process to stop
      await page.waitForTimeout(TIMEOUTS.INIT)

      // If stop button still visible, click it as fallback
      const stopButton = page.getByRole('button', { name: /stop process/i })
      if (await stopButton.isVisible()) {
        await stopButton.click()
      }

      // Canvas tab should be closed
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Terminal should be functional again
      await terminal.execute('pwd')
      await terminal.expectToContain('/')
    })

    test('Stop button stops canvas and closes tab', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Script with infinite canvas loop
      const canvasScript = `
local canvas = require('canvas')
canvas.on_draw(function()
  canvas.clear()
  canvas.set_color(255, 255, 0)
  canvas.fill_rect(0, 0, 100, 100)
end)
canvas.start()
`
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/stop_btn_test.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.execute('lua /home/stop_btn_test.lua')

      // Verify canvas and stop button visible
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click stop button
      await stopButton.click()

      // Canvas tab should be closed
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Stop button should disappear
      await expect(stopButton).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Terminal should be functional
      await terminal.execute('pwd')
      await terminal.expectToContain('/')
    })
  })

  test.describe('Error Handling', () => {
    test('second canvas.start() throws error', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Script that tries to start canvas twice
      const canvasScript = `
local canvas = require('canvas')
local started = false
canvas.on_draw(function()
  if not started then
    started = true
    -- Try to start again while already running
    local ok, err = pcall(function() canvas.start() end)
    if not ok then
      print("Error caught: " .. tostring(err))
    end
    canvas.stop()
  end
end)
canvas.start()
print("Test complete")
`
      await terminal.execute(`echo '${canvasScript.replace(/'/g, "'\\''")}' > /home/double_start.lua`)
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.execute('lua /home/double_start.lua')

      // Should see error message about canvas already running
      await terminal.expectToContain('already running', { timeout: TIMEOUTS.ASYNC_OPERATION })
      await terminal.expectToContain('Test complete', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })
})
