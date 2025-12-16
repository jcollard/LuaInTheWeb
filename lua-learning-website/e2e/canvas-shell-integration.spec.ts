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
 *
 * Note: Since io.open isn't connected to the virtual file system,
 * these tests run canvas code directly in the REPL rather than
 * creating script files.
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

  test.describe('Canvas Module Pattern', () => {
    test('canvas is not available as a global', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Try to access canvas directly - should be nil
      await terminal.type('print(type(canvas))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Should print "nil" because canvas is not a global
      await terminal.expectToContain('nil', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('require("canvas") returns the canvas module', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas and check it's a table
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print(type(canvas))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Should print "table"
      await terminal.expectToContain('table', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('canvas module has expected functions', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Check that key functions exist
      await terminal.type('print(type(canvas.start), type(canvas.stop), type(canvas.on_draw))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Should print "function function function"
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Canvas Tab Opens', () => {
    test('canvas.start() opens a canvas tab in REPL', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear (indicates Lua process is running)
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module (must use global assignment to persist across REPL lines)
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up on_draw callback that stops after a short time
      await terminal.type('canvas.on_draw(function() if canvas.get_time() > 0.1 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Print before starting
      await terminal.type('print("starting canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start the canvas (this should open a tab and block until canvas.stop())
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to stop and close
      await page.waitForTimeout(500) // Wait for canvas to stop (0.1s + buffer)

      // After canvas.stop(), the tab should close
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Terminal should show the output
      await terminal.expectToContain('starting canvas', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('canvas tab shows correct tab name', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas that stops quickly
      await terminal.type('canvas.on_draw(function() if canvas.get_time() > 0.05 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

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

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Print before canvas
      await terminal.type('print("Before canvas.start()")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas with quick stop
      await terminal.type('canvas.on_draw(function() if canvas.get_time() > 0.1 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas to complete
      await page.waitForTimeout(500)

      // Print after canvas
      await terminal.type('print("After canvas.stop()")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Both print statements should appear in terminal
      await terminal.expectToContain('Before canvas.start()', { timeout: TIMEOUTS.ASYNC_OPERATION })
      await terminal.expectToContain('After canvas.stop()', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('canvas.stop() Behavior', () => {
    test('canvas.stop() closes canvas tab', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up frame counter
      await terminal.type('frame_count = 0')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas that stops after 5 frames
      await terminal.type('canvas.on_draw(function() frame_count = frame_count + 1 if frame_count >= 5 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Verify canvas opened
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for frames to complete
      await page.waitForTimeout(500)

      // Canvas tab should be closed
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Ctrl+C Handling', () => {
    test('Stop button stops canvas and closes tab', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up infinite canvas (no canvas.stop())
      await terminal.type('canvas.on_draw(function() canvas.clear() canvas.set_color(255, 0, 0) canvas.fill_rect(0, 0, 100, 100) end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Verify canvas and stop button visible
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait a moment for canvas to be running
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Click stop button
      await stopButton.click()

      // Canvas tab should be closed
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Stop button should disappear
      await expect(stopButton).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Error Handling', () => {
    test('second canvas.start() throws error', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas that tries to start again
      await terminal.type('started = false')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Canvas that tries double start
      await terminal.type('canvas.on_draw(function()')
      await terminal.press('Enter')
      await terminal.type('  if not started then')
      await terminal.press('Enter')
      await terminal.type('    started = true')
      await terminal.press('Enter')
      await terminal.type('    local ok, err = pcall(function() canvas.start() end)')
      await terminal.press('Enter')
      await terminal.type('    if not ok then print("Error: " .. tostring(err)) end')
      await terminal.press('Enter')
      await terminal.type('    canvas.stop()')
      await terminal.press('Enter')
      await terminal.type('  end')
      await terminal.press('Enter')
      await terminal.type('end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for the test to complete
      await page.waitForTimeout(500)

      // Should see error message about canvas already running
      await terminal.expectToContain('already running', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })
})
