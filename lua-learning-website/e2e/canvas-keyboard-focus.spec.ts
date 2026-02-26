import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas keyboard focus behavior.
 *
 * Tests that canvas tabs automatically receive keyboard focus when:
 * - A new canvas tab opens (via canvas.start())
 *
 * This ensures keyboard-controlled games work immediately without
 * requiring the user to click on the canvas first.
 */
test.describe('Canvas Keyboard Focus', () => {
  test.describe('Auto-focus on Canvas Tab Open', () => {
    test('canvas element is focusable with tabIndex', async ({ shellPage: page }) => {
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

      // Set up canvas with timer-based stop
      await terminal.type('canvas.tick(function() if canvas.get_time() > 0.5 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Verify canvas element exists and has tabIndex for focusability
      const canvasElement = page.locator('canvas[tabindex="0"]')
      await expect(canvasElement).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to stop
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('canvas receives keyboard events when tab opens', async ({ shellPage: page }) => {
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

      // Set up key tracking variable
      await terminal.type('key_a_pressed = false')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas that checks for 'a' key press and stops
      await terminal.type('canvas.tick(function() if canvas.is_key_pressed("a") then key_a_pressed = true canvas.stop() end if canvas.get_time() > 3 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to render and receive focus
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Press 'a' key - canvas should receive it if focused
      await page.keyboard.press('a')

      // Wait for canvas to process the key and stop
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Verify the key was detected by checking the variable
      await terminal.type('print(key_a_pressed)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // If canvas received keyboard focus, key_a_pressed should be true
      await terminal.expectToContain('true', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Click-to-Focus', () => {
    test('clicking canvas gives it keyboard focus', async ({ shellPage: page }) => {
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

      // Track whether key 'a' is detected after clicking canvas
      await terminal.type('key_detected = false')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas that checks for 'a' key press
      await terminal.type(
        'canvas.tick(function() canvas.clear() canvas.set_color(100, 100, 100) canvas.fill_rect(0, 0, 100, 100) if canvas.is_key_pressed("a") then key_detected = true canvas.stop() end if canvas.get_time() > 5 then canvas.stop() end end)',
      )
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to render
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Click on the canvas to ensure it gets focus
      const canvasElement = page.locator('canvas[tabindex="0"]')
      await canvasElement.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Press 'a' - canvas should receive it after click-to-focus
      await page.keyboard.press('a')

      // Wait for canvas to process the key and stop
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Verify the key was detected (proves click gave focus)
      await terminal.type('print(key_detected)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('true', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Focus Retention on Special Keys', () => {
    test('canvas retains focus after pressing Tab and Arrow keys', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready
      const stopProcessButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopProcessButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Track whether key 'a' is detected after Tab/Arrow presses
      await terminal.type('key_detected = false')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas with drawing (required) that checks for 'a' key after special keys
      await terminal.type(
        'canvas.tick(function() canvas.clear() canvas.set_color(100, 100, 100) canvas.fill_rect(0, 0, 100, 100) if canvas.is_key_pressed("a") then key_detected = true canvas.stop() end if canvas.get_time() > 10 then canvas.stop() end end)',
      )
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Canvas tab should appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Wait for canvas to render and receive focus
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Press Tab, Arrow keys, Escape - these should NOT move focus away
      await page.keyboard.press('Tab')
      await page.waitForTimeout(TIMEOUTS.BRIEF)
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(TIMEOUTS.BRIEF)
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(TIMEOUTS.BRIEF)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Now press 'a' - if canvas still has focus, it should detect this
      await page.keyboard.press('a')

      // Wait for canvas to process the key and stop
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

      // Verify the key was detected (proves focus was retained through special keys)
      await terminal.type('print(key_detected)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('true', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })
})
