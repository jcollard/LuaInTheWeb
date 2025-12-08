import { test, expect } from '@playwright/test'

test.describe('REPL in IDE', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Switch to REPL tab
    await page.getByRole('tab', { name: /repl/i }).click()
    // Wait for xterm to initialize (look for the terminal canvas)
    await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 10000 })
  })

  test('REPL content is not hidden by status bar', async ({ page }) => {
    // Get the status bar element
    const statusBar = page.getByRole('status')
    await expect(statusBar).toBeVisible()
    const statusBarBox = await statusBar.boundingBox()
    expect(statusBarBox).toBeTruthy()

    // Get the xterm terminal element (the actual terminal viewport)
    const terminal = page.locator('.xterm-screen')
    await expect(terminal).toBeVisible()
    const terminalBox = await terminal.boundingBox()
    expect(terminalBox).toBeTruthy()

    // The bottom of the terminal should be at or above the top of the status bar
    // (terminal should not overlap or be hidden by status bar)
    const terminalBottom = terminalBox!.y + terminalBox!.height
    const statusBarTop = statusBarBox!.y

    expect(terminalBottom).toBeLessThanOrEqual(statusBarTop + 5) // 5px tolerance
  })

  test('REPL prompt is visible after entering commands', async ({ page }) => {
    // Get the status bar position for reference
    const statusBar = page.getByRole('status')
    const statusBarBox = await statusBar.boundingBox()
    expect(statusBarBox).toBeTruthy()

    // Click on the terminal to focus it
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type a Lua command
    await page.keyboard.type('print("Hello")')
    await page.keyboard.press('Enter')

    // Wait for command to execute
    await page.waitForTimeout(500)

    // Type several more commands to fill up some space
    await page.keyboard.type('x = 1')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)

    await page.keyboard.type('y = 2')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)

    await page.keyboard.type('print(x + y)')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)

    // Get terminal bounds after entering commands
    const terminalBox = await terminal.boundingBox()
    expect(terminalBox).toBeTruthy()

    // Terminal should still be fully visible above status bar
    const terminalBottom = terminalBox!.y + terminalBox!.height
    const statusBarTop = statusBarBox!.y

    expect(terminalBottom).toBeLessThanOrEqual(statusBarTop + 5) // 5px tolerance
  })

  test('REPL is fully contained within bottom panel', async ({ page }) => {
    // Get the bottom panel container
    const bottomPanel = page.locator('[data-testid="bottom-panel"]')
    await expect(bottomPanel).toBeVisible()
    const bottomPanelBox = await bottomPanel.boundingBox()
    expect(bottomPanelBox).toBeTruthy()

    // Get the terminal element
    const terminal = page.locator('.xterm-screen')
    await expect(terminal).toBeVisible()
    const terminalBox = await terminal.boundingBox()
    expect(terminalBox).toBeTruthy()

    // Terminal should be fully contained within the bottom panel
    const terminalBottom = terminalBox!.y + terminalBox!.height
    const bottomPanelBottom = bottomPanelBox!.y + bottomPanelBox!.height

    // Terminal bottom should not exceed bottom panel bottom
    expect(terminalBottom).toBeLessThanOrEqual(bottomPanelBottom + 2) // 2px tolerance

    // Terminal top should be at or below bottom panel top (accounting for tab bar ~35px)
    expect(terminalBox!.y).toBeGreaterThanOrEqual(bottomPanelBox!.y)
  })

  test('Clear button is visible and functional', async ({ page }) => {
    // Clear button should be visible in embedded mode
    const clearButton = page.getByRole('button', { name: /clear/i })
    await expect(clearButton).toBeVisible()

    // Click the clear button
    await clearButton.click()

    // Terminal should still be visible after clear
    const terminal = page.locator('.xterm-screen')
    await expect(terminal).toBeVisible()
  })

  test('no nested scrollbars in REPL panel', async ({ page }) => {
    // The replContent should not have scrollbars (overflow: hidden)
    // Check that the container doesn't have scroll behavior

    // Get the REPL content container dimensions
    const replContent = page.locator('#repl-tabpanel')
    const replContentBox = await replContent.boundingBox()
    expect(replContentBox).toBeTruthy()

    // Get the terminal dimensions
    const terminal = page.locator('.xterm-screen')
    const terminalBox = await terminal.boundingBox()
    expect(terminalBox).toBeTruthy()

    // Terminal width should roughly match container width (not causing horizontal scroll)
    // Allow some padding/margin tolerance
    expect(terminalBox!.width).toBeLessThanOrEqual(replContentBox!.width + 50)
  })
})
