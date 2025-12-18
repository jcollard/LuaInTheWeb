import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas scaling functionality.
 *
 * Tests the ability to:
 * - Display scaling mode selector in canvas tab
 * - Switch between 'Fit' and '1x' scaling modes
 * - Persist scaling preference to localStorage
 * - Restore scaling preference on page reload
 * - Apply correct CSS classes for each scaling mode
 */
test.describe('Canvas Scaling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for the shell terminal to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test.describe('Scaling Mode Selector', () => {
    test('displays scaling mode selector in canvas panel', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Clear localStorage first
      await page.evaluate(() => localStorage.removeItem('canvas-scaling:mode'))

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Require canvas and set up a simple tick
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for canvas tab to appear
      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Look for scaling selector
      const scalingSelector = page.getByRole('combobox', { name: /scale/i })
      await expect(scalingSelector).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Stop the canvas
      await stopButton.click()
    })

    test('defaults to Fit mode', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Clear localStorage first
      await page.evaluate(() => localStorage.removeItem('canvas-scaling:mode'))

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Check default value
      const scalingSelector = page.getByRole('combobox', { name: /scale/i })
      await expect(scalingSelector).toHaveValue('fit')

      await stopButton.click()
    })

    test('can switch to 1x mode', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Clear localStorage first
      await page.evaluate(() => localStorage.removeItem('canvas-scaling:mode'))

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Change to native mode
      const scalingSelector = page.getByRole('combobox', { name: /scale/i })
      await scalingSelector.selectOption('native')
      await expect(scalingSelector).toHaveValue('native')

      await stopButton.click()
    })
  })

  test.describe('CSS Classes', () => {
    test('applies fit CSS class in fit mode', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await page.evaluate(() => localStorage.removeItem('canvas-scaling:mode'))

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Verify fit mode CSS class is applied
      const canvasContainer = page.locator('[class*="canvasContainerFit"]')
      await expect(canvasContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      const canvas = page.locator('canvas[aria-label="Canvas game"]')
      await expect(canvas).toHaveClass(/canvasFit/)

      await stopButton.click()
    })

    test('applies native CSS class in 1x mode', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await page.evaluate(() => localStorage.removeItem('canvas-scaling:mode'))

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Change to native mode
      const scalingSelector = page.getByRole('combobox', { name: /scale/i })
      await scalingSelector.selectOption('native')

      // Verify native mode CSS class is applied
      const canvasContainer = page.locator('[class*="canvasContainerNative"]')
      await expect(canvasContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      const canvas = page.locator('canvas[aria-label="Canvas game"]')
      await expect(canvas).toHaveClass(/canvasNative/)

      await stopButton.click()
    })
  })

  test.describe('localStorage Persistence', () => {
    test('saves scaling preference to localStorage', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await page.evaluate(() => localStorage.removeItem('canvas-scaling:mode'))

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Change to native mode
      const scalingSelector = page.getByRole('combobox', { name: /scale/i })
      await scalingSelector.selectOption('native')

      // Verify localStorage was updated
      const storedValue = await page.evaluate(() => localStorage.getItem('canvas-scaling:mode'))
      expect(storedValue).toBe('native')

      await stopButton.click()
    })

    test('restores scaling preference on page reload', async ({ page }) => {
      // Set preference directly in localStorage
      await page.evaluate(() => localStorage.setItem('canvas-scaling:mode', 'native'))

      // Reload page
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
      await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })

      const terminal = createTerminalHelper(page)
      await terminal.focus()

      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.tick(function() if canvas.get_time() > 10 then canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      const canvasTab = page.locator('[class*="canvasTab"]').first()
      await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Verify native mode is restored
      const scalingSelector = page.getByRole('combobox', { name: /scale/i })
      await expect(scalingSelector).toHaveValue('native')

      // Verify CSS class is correct
      const canvasContainer = page.locator('[class*="canvasContainerNative"]')
      await expect(canvasContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      await stopButton.click()
    })
  })
})
