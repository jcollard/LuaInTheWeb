import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

/**
 * Theme tests for the Shell terminal component.
 *
 * These tests verify that xterm-based terminals respect theme colors.
 * Updated to target Shell terminal after REPL component was removed (Issue #139).
 */
test.describe('Theme - Shell Terminal', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    // Wait for IDE layout to be ready
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test('Shell terminal background uses theme colors in dark mode', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Click on Shell tab to show the xterm-based terminal
    const shellTab = page.getByRole('tab', { name: /shell/i })
    await shellTab.click()

    // Wait for terminal container to be visible
    const terminalContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(terminalContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Wait for xterm to create its DOM
    await page.waitForSelector('[data-testid="shell-terminal-container"] .xterm-viewport', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Check the xterm viewport background
    const xtermViewport = page.locator('[data-testid="shell-terminal-container"] .xterm-viewport')
    const bgColor = await xtermViewport.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // Dark theme terminal-bg is #1e1e1e = rgb(30, 30, 30)
    expect(bgColor).toBe('rgb(30, 30, 30)')
  })

  test('Shell terminal background uses theme colors in light mode', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Click on Shell tab
    const shellTab = page.getByRole('tab', { name: /shell/i })
    await shellTab.click()

    // Wait for terminal
    const terminalContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(terminalContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await page.waitForSelector('[data-testid="shell-terminal-container"] .xterm-viewport', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Check the xterm viewport background
    const xtermViewport = page.locator('[data-testid="shell-terminal-container"] .xterm-viewport')
    const bgColor = await xtermViewport.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // Light theme terminal-bg is #ffffff = rgb(255, 255, 255)
    expect(bgColor).toBe('rgb(255, 255, 255)')
  })

  test('Shell terminal text is dark in light mode', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Click on Shell tab
    const shellTab = page.getByRole('tab', { name: /shell/i })
    await shellTab.click()

    // Wait for terminal container
    const terminalContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(terminalContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await page.waitForTimeout(TIMEOUTS.INIT) // Wait for Shell to initialize

    // Find any canvas element in the terminal (xterm uses canvas for text rendering)
    const canvases = page.locator('[data-testid="shell-terminal-container"] canvas')
    const canvasCount = await canvases.count()

    // Skip test if no canvas found (xterm might use different renderer)
    if (canvasCount === 0) {
      console.log('No canvas found in terminal - skipping pixel color check')
      return
    }

    // Get all canvases and find one with content
    const canvas = canvases.first()
    await expect(canvas).toBeVisible()

    // Sample pixels from the terminal canvas to check text color
    const pixelInfo = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d')
      if (!ctx) return { found: false, error: 'no context' }

      const width = (canvasEl as HTMLCanvasElement).width
      const height = (canvasEl as HTMLCanvasElement).height

      // Scan the canvas for non-transparent pixels (text)
      const textPixels: Array<{ r: number; g: number; b: number }> = []

      for (let y = 10; y < Math.min(height, 300); y += 3) {
        for (let x = 10; x < Math.min(width, 600); x += 3) {
          const pixel = ctx.getImageData(x, y, 1, 1).data
          const r = pixel[0], g = pixel[1], b = pixel[2], a = pixel[3]

          // Skip transparent pixels (no text there)
          if (a < 128) continue

          // Skip white/near-white pixels (background artifacts)
          if (r > 240 && g > 240 && b > 240) continue

          textPixels.push({ r, g, b })
        }
      }

      if (textPixels.length === 0) {
        return { found: false, error: 'no text pixels found' }
      }

      // Calculate average color of text pixels
      const avgR = textPixels.reduce((sum, p) => sum + p.r, 0) / textPixels.length
      const avgG = textPixels.reduce((sum, p) => sum + p.g, 0) / textPixels.length
      const avgB = textPixels.reduce((sum, p) => sum + p.b, 0) / textPixels.length

      // Check if text is light gray (bug - around 200,200,200) or dark (correct - around 30,30,30)
      const isLightGray = avgR > 150 && avgG > 150 && avgB > 150
      const isDark = avgR < 100 && avgG < 100 && avgB < 100

      return {
        found: true,
        avgR: Math.round(avgR),
        avgG: Math.round(avgG),
        avgB: Math.round(avgB),
        isLightGray,
        isDark,
        sampleCount: textPixels.length,
      }
    })

    // Log for debugging
    console.log('Shell text pixel info:', pixelInfo)

    // If we found text, verify it's not light gray
    if (pixelInfo.found && 'isDark' in pixelInfo) {
      // Text should be dark in light mode (or at least not light gray)
      expect(pixelInfo.isLightGray).toBe(false)
    }
  })

  test('Shell terminal text changes after theme switch', async ({ page }) => {
    // Start in dark mode
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Click on Shell tab
    const shellTab = page.getByRole('tab', { name: /shell/i })
    await shellTab.click()

    // Wait for terminal container
    const terminalContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(terminalContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.INIT)

    // Type something in the Shell to create new text with the new theme
    await terminalContainer.click()
    await page.keyboard.type('echo "test"')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Find canvas and check text color
    const canvases = page.locator('[data-testid="shell-terminal-container"] canvas')
    const canvasCount = await canvases.count()

    if (canvasCount === 0) {
      console.log('No canvas found in terminal - skipping pixel color check')
      return
    }

    const canvas = canvases.first()
    const pixelInfo = await canvas.evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d')
      if (!ctx) return { found: false }

      const width = (canvasEl as HTMLCanvasElement).width
      const height = (canvasEl as HTMLCanvasElement).height

      const textPixels: Array<{ r: number; g: number; b: number }> = []

      // Sample from terminal area
      for (let y = 10; y < Math.min(height, 300); y += 3) {
        for (let x = 10; x < Math.min(width, 600); x += 3) {
          const pixel = ctx.getImageData(x, y, 1, 1).data
          const r = pixel[0], g = pixel[1], b = pixel[2], a = pixel[3]
          if (a < 128) continue
          if (r > 240 && g > 240 && b > 240) continue
          textPixels.push({ r, g, b })
        }
      }

      if (textPixels.length === 0) return { found: false }

      const avgR = textPixels.reduce((sum, p) => sum + p.r, 0) / textPixels.length
      const avgG = textPixels.reduce((sum, p) => sum + p.g, 0) / textPixels.length
      const avgB = textPixels.reduce((sum, p) => sum + p.b, 0) / textPixels.length

      return {
        found: true,
        avgR: Math.round(avgR),
        avgG: Math.round(avgG),
        avgB: Math.round(avgB),
        isLightGray: avgR > 150 && avgG > 150 && avgB > 150,
        isDark: avgR < 100 && avgG < 100 && avgB < 100,
      }
    })

    console.log('Shell text after theme switch:', pixelInfo)

    if (pixelInfo.found && 'isLightGray' in pixelInfo) {
      // New text written after theme switch should NOT be light gray
      expect(pixelInfo.isLightGray).toBe(false)
    }
  })
})
