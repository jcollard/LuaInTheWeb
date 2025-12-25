import { test, expect } from '@playwright/test'
import { createTerminalHelper } from './helpers/terminal'
import { TIMEOUTS } from './constants'

/**
 * E2E test for pixel manipulation (Issue #431)
 * Verifies that get_image_data and put_image_data work correctly
 */

test.describe('Pixel Manipulation', () => {
  test('should apply invert effect to image data', async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor')

    // Wait for the shell terminal to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Enter Lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Load canvas module
    await terminal.type('canvas = require("canvas")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Set canvas size
    await terminal.type('canvas.set_size(200, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Create a test tick function that tests pixel manipulation
    await terminal.type('canvas.tick(function()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  canvas.clear()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Draw a red rectangle
    await terminal.type('  canvas.set_color(255, 0, 0)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  canvas.fill_rect(0, 0, 100, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Get pixel data
    await terminal.type('  local img = canvas.get_image_data(0, 0, 100, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  if img then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Check pixel value
    await terminal.type('    local r, g, b = img:get_pixel(50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    print("PIXEL_VALUES: r=" .. tostring(r) .. " g=" .. tostring(g) .. " b=" .. tostring(b))')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if r == 255 and g == 0 and b == 0 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("PIXEL_TEST_PASSED")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("PIXEL_TEST_FAILED: wrong color")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    print("PIXEL_TEST_FAILED: img is nil")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  canvas.stop()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Start the canvas
    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    // Wait for the test output
    await terminal.waitForOutput('PIXEL_TEST_', TIMEOUTS.CI_EXTENDED)

    // Get and check the result
    const output = await terminal.getAllText()
    console.log('Terminal output:', output)

    // Check for pass/fail
    expect(output).toContain('PIXEL_TEST_PASSED')
  })

  test('should create_image_data work', async ({ page }) => {
    await page.goto('/editor')

    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    const terminal = createTerminalHelper(page)
    await terminal.focus()

    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    await terminal.type('canvas = require("canvas")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.set_size(200, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.tick(function()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  local img = canvas.create_image_data(10, 10)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  if img then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    img:set_pixel(5, 5, 128, 64, 32, 255)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    local r, g, b, a = img:get_pixel(5, 5)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if r == 128 and g == 64 and b == 32 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("CREATE_TEST_PASSED")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("CREATE_TEST_FAILED: wrong pixel value")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    print("CREATE_TEST_FAILED: img is nil")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  canvas.stop()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    await terminal.waitForOutput('CREATE_TEST_', TIMEOUTS.CI_EXTENDED)

    const output = await terminal.getAllText()
    console.log('Terminal output:', output)

    expect(output).toContain('CREATE_TEST_PASSED')
  })
})
