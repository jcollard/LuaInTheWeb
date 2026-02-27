import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'

test.describe('Theme - Layout Components', () => {
  test('applies dark theme when set in localStorage', async ({ cleanEditorPage: page }) => {
    // Set dark theme in localStorage before reload
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Verify data-theme attribute is 'dark'
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('dark')
  })

  test('applies light theme when set in localStorage', async ({ cleanEditorPage: page }) => {
    // Set light theme in localStorage before reload
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Verify data-theme attribute is 'light'
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')
  })

  test('IDE layout uses theme background colors', async ({ cleanEditorPage: page }) => {
    // Start with dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // In dark theme, bg-primary should be #1e1e1e
    const ideLayout = page.locator('[data-testid="ide-layout"]')
    const darkBgColor = await ideLayout.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(darkBgColor).toBe('rgb(30, 30, 30)') // #1e1e1e

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.TRANSITION) // Wait for transition

    // In light theme, bg-primary should be #ffffff
    const lightBgColor = await ideLayout.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(lightBgColor).toBe('rgb(255, 255, 255)') // #ffffff
  })

  test('activity bar uses theme colors', async ({ cleanEditorPage: page }) => {
    // Start with dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    await expect(activityBar).toBeVisible()

    // In dark theme, bg-tertiary should be #333333
    const darkBgColor = await activityBar.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(darkBgColor).toBe('rgb(51, 51, 51)') // #333333

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // In light theme, bg-tertiary should be #e8e8e8
    const lightBgColor = await activityBar.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(lightBgColor).toBe('rgb(232, 232, 232)') // #e8e8e8
  })

  test('sidebar panel uses theme colors', async ({ cleanEditorPage: page }) => {
    // Start with dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    const sidebarPanel = page.locator('[data-testid="sidebar-panel"]')
    await expect(sidebarPanel).toBeVisible()

    // In dark theme, bg-secondary should be #252526
    const darkBgColor = await sidebarPanel.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(darkBgColor).toBe('rgb(37, 37, 38)') // #252526

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // In light theme, bg-secondary should be #f3f3f3
    const lightBgColor = await sidebarPanel.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(lightBgColor).toBe('rgb(243, 243, 243)') // #f3f3f3
  })

  test('status bar uses theme accent color', async ({ cleanEditorPage: page }) => {
    // Start with dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    const statusBar = page.getByRole('status')
    await expect(statusBar).toBeVisible()

    // In dark theme, accent-primary should be #007acc
    const darkBgColor = await statusBar.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(darkBgColor).toBe('rgb(0, 122, 204)') // #007acc

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // In light theme, accent-primary should be #0066b8
    const lightBgColor = await statusBar.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(lightBgColor).toBe('rgb(0, 102, 184)') // #0066b8
  })

  test('bottom panel uses theme colors', async ({ cleanEditorPage: page }) => {
    // Start with dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    const bottomPanel = page.locator('[data-testid="bottom-panel"]')
    await expect(bottomPanel).toBeVisible()

    // In dark theme, bg-primary should be #1e1e1e
    const darkBgColor = await bottomPanel.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(darkBgColor).toBe('rgb(30, 30, 30)') // #1e1e1e

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // In light theme, bg-primary should be #ffffff
    const lightBgColor = await bottomPanel.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(lightBgColor).toBe('rgb(255, 255, 255)') // #ffffff
  })

  test('theme persists after page reload', async ({ cleanEditorPage: page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Verify theme is light
    let theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')

    // Reload again
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Theme should still be light
    theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')
  })

  test('theme transition is smooth', async ({ cleanEditorPage: page }) => {
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Check that CSS transitions are set up
    const ideLayout = page.locator('[data-testid="ide-layout"]')
    const transition = await ideLayout.evaluate(el =>
      getComputedStyle(el).transition
    )

    // Should have transition properties for background-color
    expect(transition).toContain('background-color')
  })

  test('file explorer uses theme colors', async ({ cleanEditorPage: page }) => {
    // Start with dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    const fileExplorer = page.locator('[data-testid="file-explorer"]')
    await expect(fileExplorer).toBeVisible()

    // In dark theme, bg-secondary should be #252526
    const darkBgColor = await fileExplorer.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(darkBgColor).toBe('rgb(37, 37, 38)') // #252526

    // Switch to light theme
    await page.evaluate(() => {
      localStorage.setItem('lua-ide-theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // In light theme, bg-secondary should be #f3f3f3
    const lightBgColor = await fileExplorer.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(lightBgColor).toBe('rgb(243, 243, 243)') // #f3f3f3
  })
})
