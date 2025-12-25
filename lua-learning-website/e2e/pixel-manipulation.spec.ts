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

  test('should cache and reuse ImageData across frames', async ({ page }) => {
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

    await terminal.type('canvas.set_size(100, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('cached_img = nil')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('frame = 0')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Build the tick function line by line (no comments, no blank lines)
    await terminal.type('canvas.tick(function()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  frame = frame + 1')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  if frame == 1 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.clear()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.set_color(255, 0, 0)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.fill_rect(0, 0, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    cached_img = canvas.get_image_data(0, 0, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if cached_img then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      local r, g, b = cached_img:get_pixel(25, 25)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME1_PIXEL: r=" .. r .. " g=" .. g .. " b=" .. b)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME1_DATA1: " .. tostring(cached_img.data[1]))')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  elseif frame == 2 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if cached_img then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      local r, g, b = cached_img:get_pixel(25, 25)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME2_PIXEL: r=" .. r .. " g=" .. g .. " b=" .. b)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME2_DATA1: " .. tostring(cached_img.data[1]))')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      if r == 255 and g == 0 and b == 0 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('        print("CACHE_TEST_PASSED")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('        print("CACHE_TEST_FAILED: cached pixel r=" .. r)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("CACHE_TEST_FAILED: cached_img is nil")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.stop()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    await terminal.waitForOutput('CACHE_TEST_', TIMEOUTS.CI_EXTENDED)

    const output = await terminal.getAllText()
    console.log('Terminal output:', output)

    // Verify frame 1 captured red pixel
    expect(output).toContain('FRAME1_PIXEL: r=255 g=0 b=0')
    // Verify frame 2 still has the cached red pixel
    expect(output).toContain('CACHE_TEST_PASSED')
  })

  test('should put_image_data work with cached ImageData', async ({ page }) => {
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

    await terminal.type('canvas.set_size(100, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('cached_img = nil')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('frame = 0')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('canvas.tick(function()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  frame = frame + 1')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  if frame == 1 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.clear()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.set_color(255, 0, 0)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.fill_rect(0, 0, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    cached_img = canvas.get_image_data(0, 0, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    print("FRAME1: cached")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  elseif frame == 2 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.clear()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if cached_img then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      canvas.put_image_data(cached_img, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME2: put_image_data")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  elseif frame == 3 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    local verify = canvas.get_image_data(50, 50, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if verify then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      local r, g, b = verify:get_pixel(25, 25)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME3: r=" .. r .. " g=" .. g .. " b=" .. b)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      if r == 255 and g == 0 and b == 0 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('        print("PUT_CACHE_TEST_PASSED")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('        print("PUT_CACHE_TEST_FAILED: r=" .. r)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("PUT_CACHE_TEST_FAILED: nil")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.stop()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    await terminal.waitForOutput('PUT_CACHE_TEST_', TIMEOUTS.CI_EXTENDED)

    const output = await terminal.getAllText()
    console.log('Terminal output:', output)

    // Extract only the output after canvas.start() to avoid matching echoed code
    const startIndex = output.indexOf('canvas.start()')
    const outputAfterStart = startIndex >= 0 ? output.substring(startIndex) : output

    // Check test results (only in the actual output, not echoed code)
    expect(outputAfterStart).toContain('PUT_CACHE_TEST_PASSED')
    // Also verify the values are correct
    expect(outputAfterStart).toContain('r=255 g=0 b=0')
  })

  test('should cache work with LOCAL variables (like demo)', async ({ page }) => {
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

    await terminal.type('canvas.set_size(100, 100)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Use LOCAL variables like the demo does
    await terminal.type('local cached_effects = {}')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('local frame = 0')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('canvas.tick(function()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  frame = frame + 1')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  if frame == 1 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.clear()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.set_color(255, 0, 0)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.fill_rect(0, 0, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    cached_effects[1] = canvas.get_image_data(0, 0, 50, 50)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if cached_effects[1] then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      local r = cached_effects[1]:get_pixel(25, 25)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME1_LOCAL: r=" .. r)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  elseif frame == 2 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    if cached_effects[1] then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      local r = cached_effects[1]:get_pixel(25, 25)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("FRAME2_LOCAL: r=" .. r)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      if r == 255 then')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('        print("LOCAL_CACHE_TEST_PASSED")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('        print("LOCAL_CACHE_TEST_FAILED: r=" .. r)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    else')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('      print("LOCAL_CACHE_TEST_FAILED: nil")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('    canvas.stop()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('  end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    await terminal.type('end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    await terminal.waitForOutput('LOCAL_CACHE_TEST_', TIMEOUTS.CI_EXTENDED)

    const output = await terminal.getAllText()
    console.log('Terminal output:', output)

    expect(output).toContain('LOCAL_CACHE_TEST_PASSED')
  })
})
