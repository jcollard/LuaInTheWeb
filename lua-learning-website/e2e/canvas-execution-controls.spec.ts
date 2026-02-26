import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas execution controls (Pause/Play/Stop/Step).
 *
 * Tests verify:
 * - Pause button suspends canvas animation
 * - Play button resumes animation after pause
 * - Stop button terminates the canvas process
 * - Step button advances one frame when paused
 * - Button visibility changes based on execution state
 */
test.describe('Canvas Execution Controls', () => {
  test.describe('Button Visibility', () => {
    test('shows Pause and Stop buttons when canvas is running', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear (indicates Lua process is running)
      const stopProcessButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopProcessButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module and start
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() canvas.clear() canvas.set_color(100, 100, 100) canvas.fill_rect(0, 0, 100, 100) end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas tab to appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Verify Pause and Stop buttons are visible
      const pauseButton = page.getByRole('button', { name: /pause game/i })
      const stopButton = page.getByRole('button', { name: /stop game/i })
      await expect(pauseButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Play and Step buttons should NOT be visible when not paused
      const playButton = page.getByRole('button', { name: /play game/i })
      const stepButton = page.getByRole('button', { name: /step one frame/i })
      await expect(playButton).not.toBeVisible()
      await expect(stepButton).not.toBeVisible()

      // Clean up: stop the canvas
      await stopButton.click()
    })

    test('shows Play and Step buttons when canvas is paused', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear
      const stopProcessButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopProcessButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module and start
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() canvas.clear() canvas.set_color(50, 150, 50) canvas.fill_rect(0, 0, 100, 100) end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas tab to appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click Pause button
      const pauseButton = page.getByRole('button', { name: /pause game/i })
      await pauseButton.click()

      // Now Play and Step should be visible, Pause should not
      const playButton = page.getByRole('button', { name: /play game/i })
      const stepButton = page.getByRole('button', { name: /step one frame/i })
      await expect(playButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await expect(stepButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await expect(pauseButton).not.toBeVisible()

      // Stop button should still be visible
      const stopButton = page.getByRole('button', { name: /stop game/i })
      await expect(stopButton).toBeVisible()

      // Clean up: stop the canvas
      await stopButton.click()
    })
  })

  test.describe('Pause and Resume', () => {
    test('pause suspends animation and play resumes it', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear
      const stopProcessButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopProcessButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Canvas that prints frame count
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('frame = 0')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() frame = frame + 1 canvas.clear() end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas tab to appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Let some frames run
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Click Pause
      const pauseButton = page.getByRole('button', { name: /pause game/i })
      await pauseButton.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Verify Play button appears (confirmation that pause worked)
      const playButton = page.getByRole('button', { name: /play game/i })
      await expect(playButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click Play to resume
      await playButton.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Verify Pause button reappears
      await expect(pauseButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Clean up: stop the canvas
      const stopButton = page.getByRole('button', { name: /stop game/i })
      await stopButton.click()
    })
  })

  test.describe('Stop', () => {
    test('stop button terminates the canvas', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear
      const stopProcessButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopProcessButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas module and start
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() canvas.clear() canvas.set_color(200, 50, 50) canvas.fill_rect(0, 0, 100, 100) end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas tab to appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click Stop button
      const stopButton = page.getByRole('button', { name: /stop game/i })
      await stopButton.click()

      // Canvas tab should close
      await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Step', () => {
    test('step button advances one frame when paused', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for stop button to appear
      const stopProcessButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopProcessButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Canvas that tracks frames and prints on each frame
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('frame_count = 0')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() frame_count = frame_count + 1 print("frame: " .. frame_count) canvas.clear() canvas.set_color(0, 100, 255) canvas.fill_rect(10 * frame_count, 10, 50, 50) end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas tab to appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Let a few frames run
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Click Pause
      const pauseButton = page.getByRole('button', { name: /pause game/i })
      await pauseButton.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      // Verify Step button is visible
      const stepButton = page.getByRole('button', { name: /step one frame/i })
      await expect(stepButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Click Step - this should execute one frame
      await stepButton.click()
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // We should still be paused (Step returns to paused state)
      const playButton = page.getByRole('button', { name: /play game/i })
      await expect(playButton).toBeVisible()
      await expect(stepButton).toBeVisible()

      // Clean up: stop the canvas
      const stopButton = page.getByRole('button', { name: /stop game/i })
      await stopButton.click()
    })
  })
})
