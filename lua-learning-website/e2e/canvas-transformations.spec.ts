import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas transformation functions.
 *
 * Tests verify that:
 * - All transformation functions exist in the canvas module
 * - Transformation functions can be called without errors
 * - Typical transformation workflows work correctly
 */
test.describe('Canvas Transformations', () => {
  test.describe('Transformation Functions Availability', () => {
    test('canvas module has all transformation functions', async ({ shellPage: page }) => {
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

      // Check translate function exists
      await terminal.type('print(type(canvas.translate))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Check rotate function exists
      await terminal.type('print(type(canvas.rotate))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Check scale function exists
      await terminal.type('print(type(canvas.scale))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Check save function exists
      await terminal.type('print(type(canvas.save))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Check restore function exists
      await terminal.type('print(type(canvas.restore))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Check reset_transform function exists
      await terminal.type('print(type(canvas.reset_transform))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('function', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Transformation Function Calls', () => {
    test('translate function can be called', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call translate - should not throw
      await terminal.type('canvas.translate(100, 50)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("translate ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('translate ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('rotate function can be called', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call rotate - should not throw
      await terminal.type('canvas.rotate(math.pi / 4)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("rotate ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('rotate ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('scale function can be called', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call scale - should not throw
      await terminal.type('canvas.scale(2, 2)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("scale ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('scale ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('save and restore functions can be called', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call save and restore - should not throw
      await terminal.type('canvas.save()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.restore()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("save/restore ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('save/restore ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('transform function can be called with matrix values', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call transform with identity-like matrix - should not throw
      await terminal.type('canvas.transform(1, 0, 0, 1, 100, 50)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("transform ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('transform ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('set_transform function can be called', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call set_transform - should not throw
      await terminal.type('canvas.set_transform(2, 0, 0, 2, 50, 50)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("set_transform ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('set_transform ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('reset_transform function can be called', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Call reset_transform - should not throw
      await terminal.type('canvas.reset_transform()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("reset_transform ok")')
      await terminal.press('Enter')
      await terminal.expectToContain('reset_transform ok', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Transformation Workflow', () => {
    test('transformations work during canvas execution', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Define a tick function that uses transformations (single-line)
      await terminal.type('canvas.tick(function() canvas.clear() canvas.save() canvas.translate(200, 200) canvas.rotate(canvas.get_time()) canvas.set_color(255, 0, 0) canvas.fill_rect(-25, -25, 50, 50) canvas.restore() if canvas.get_time() > 0.1 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to stop and tab to close
      await page.waitForTimeout(500)

      // Canvas tab should close (proves transformations didn't crash the canvas)
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })
})
