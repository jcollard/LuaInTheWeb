import { test, expect } from './fixtures'

test.describe('Theme Toggle UI Control', () => {
  test('theme toggle button is visible in the activity bar', async ({
    cleanEditorPage: page,
  }) => {
    // The theme toggle should be in the activity bar's bottom section
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    await expect(activityBar).toBeVisible()

    // Should have a button for theme switching
    const themeToggle = activityBar.getByRole('button', {
      name: /switch to (light|dark) mode/i,
    })
    await expect(themeToggle).toBeVisible()
  })

  test('theme toggle shows moon icon in dark mode', async ({ cleanEditorPage: page }) => {
    // Set dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // In dark mode, button should say "Switch to light mode"
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to light mode',
    })
    await expect(themeToggle).toBeVisible()
  })

  test('theme toggle shows sun icon in light mode', async ({ cleanEditorPage: page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // In light mode, button should say "Switch to dark mode"
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to dark mode',
    })
    await expect(themeToggle).toBeVisible()
  })

  test('clicking theme toggle switches from dark to light', async ({
    cleanEditorPage: page,
  }) => {
    // Start in dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Verify we're in dark mode
    let theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('dark')

    // Click the theme toggle
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to light mode',
    })
    await themeToggle.click()

    // Verify theme switched to light
    theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')

    // Button label should update
    await expect(
      activityBar.getByRole('button', { name: 'Switch to dark mode' })
    ).toBeVisible()
  })

  test('clicking theme toggle switches from light to dark', async ({
    cleanEditorPage: page,
  }) => {
    // Start in light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Verify we're in light mode
    let theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')

    // Click the theme toggle
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to dark mode',
    })
    await themeToggle.click()

    // Verify theme switched to dark
    theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('dark')

    // Button label should update
    await expect(
      activityBar.getByRole('button', { name: 'Switch to light mode' })
    ).toBeVisible()
  })

  test('theme toggle is keyboard accessible', async ({ cleanEditorPage: page }) => {
    // Start in dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Find the theme toggle
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to light mode',
    })

    // Focus and press Enter
    await themeToggle.focus()
    await page.keyboard.press('Enter')

    // Verify theme switched
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')
  })

  test('theme toggle persists choice to localStorage', async ({ cleanEditorPage: page }) => {
    // Start in dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Click to switch to light
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to light mode',
    })
    await themeToggle.click()

    // Verify localStorage was updated
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem('lua-ide-theme')
    )
    expect(storedTheme).toBe('light')

    // Reload and verify theme persists
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('light')
  })

  test('theme toggle has tooltip', async ({ cleanEditorPage: page }) => {
    // Start in dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Find the theme toggle
    const activityBar = page.locator('nav[aria-label="Activity Bar"]')
    const themeToggle = activityBar.getByRole('button', {
      name: 'Switch to light mode',
    })

    // Check tooltip via title attribute
    await expect(themeToggle).toHaveAttribute('title', 'Switch to light mode')
  })
})
