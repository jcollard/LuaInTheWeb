import { test, expect } from '@playwright/test'
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for the shell terminal to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test.describe('Auto-focus on Canvas Tab Open', () => {
    test('canvas element is focusable with tabIndex', async ({ page }) => {
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

    test('canvas receives keyboard events when tab opens', async ({ page }) => {
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
})
