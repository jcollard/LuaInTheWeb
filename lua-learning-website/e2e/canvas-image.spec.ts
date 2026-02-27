import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for canvas image support.
 *
 * Tests the ability to:
 * - Register images via canvas.assets.load_image()
 * - Load images from HTTP URLs
 * - Draw images on the canvas
 * - Get image dimensions via canvas.assets.get_width/get_height
 *
 * Note: These tests use HTTP URLs since the shell uses a virtual filesystem
 * that doesn't easily support binary files. The AssetLoader supports both
 * filesystem paths and HTTP URLs.
 */
test.describe('Canvas Image Support', () => {
  test.describe('Image Registration', () => {
    test('canvas.assets.load_image() registers an image for loading', async ({ shellPage: page }) => {
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

      // Register an image (using HTTP URL to test fixture)
      await terminal.type('canvas.assets.load_image("test", "http://localhost:5173/test-fixtures/red-square.png")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Should not throw an error - the registration should succeed
      // The terminal should show the next prompt without error messages
      await terminal.type('print("registration succeeded")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('registration succeeded', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Image Loading and Drawing', () => {
    test('canvas loads and draws image from HTTP URL', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready (wait for welcome message and prompt)
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await terminal.expectToContain('Lua 5.4 REPL', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Get the current origin for the test server
      const origin = new URL(page.url()).origin

      // Register image from HTTP URL (using test server's origin)
      await terminal.type(`canvas.assets.load_image("red", "${origin}/test-fixtures/red-square.png")`)
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas to draw the image and stop quickly
      await terminal.type('canvas.tick(function() canvas.clear() canvas.draw_image("red", 10, 10) if canvas.get_time() > 0.2 then print("image drawn successfully") canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for the success message (canvas runs for 0.2s then stops)
      await terminal.expectToContain('image drawn successfully', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })

    test('canvas.assets.get_width and get_height return image dimensions', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready (wait for welcome message and prompt)
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await terminal.expectToContain('Lua 5.4 REPL', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Get the current origin for the test server
      const origin = new URL(page.url()).origin

      // Register image
      await terminal.type(`canvas.assets.load_image("test", "${origin}/test-fixtures/red-square.png")`)
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas to print dimensions
      await terminal.type('canvas.tick(function() local w = canvas.assets.get_width("test") local h = canvas.assets.get_height("test") print("Dimensions: " .. w .. "x" .. h) canvas.stop() end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for the dimensions message (canvas stops immediately after printing)
      await terminal.expectToContain('Dimensions: 8x8', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })

  test.describe('Image Drawing with Scaling', () => {
    test('canvas.draw_image supports width and height parameters', async ({ shellPage: page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Wait for REPL to be ready (wait for welcome message and prompt)
      const stopButton = page.getByRole('button', { name: /stop process/i })
      await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await terminal.expectToContain('Lua 5.4 REPL', { timeout: TIMEOUTS.ASYNC_OPERATION })

      // Require canvas module
      await terminal.type('canvas = require("canvas")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Get the current origin for the test server
      const origin = new URL(page.url()).origin

      // Register image
      await terminal.type(`canvas.assets.load_image("test", "${origin}/test-fixtures/red-square.png")`)
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Set up canvas to draw scaled image
      await terminal.type('canvas.tick(function() canvas.clear() canvas.draw_image("test", 10, 10, 100, 100) if canvas.get_time() > 0.2 then print("scaled image drawn") canvas.stop() end end)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Start canvas
      await terminal.type('canvas.start()')
      await terminal.press('Enter')

      // Wait for the success message (canvas runs for 0.2s then stops)
      await terminal.expectToContain('scaled image drawn', { timeout: TIMEOUTS.ASYNC_OPERATION })
    })
  })
})
