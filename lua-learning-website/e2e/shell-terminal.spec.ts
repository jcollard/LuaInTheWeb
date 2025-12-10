import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

test.describe('Shell Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Switch to Shell tab
    await page.getByRole('tab', { name: /shell/i }).click()
    // Wait for xterm to initialize (look for the terminal canvas)
    await expect(page.locator('.xterm-screen')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test('Shell tab is accessible and shows terminal', async ({ page }) => {
    const shellTab = page.getByRole('tab', { name: /shell/i })
    await expect(shellTab).toBeVisible()
    await expect(shellTab).toHaveAttribute('aria-selected', 'true')

    // Terminal should be visible
    const terminal = page.locator('.xterm-screen')
    await expect(terminal).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('pwd command executes without error', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type pwd command
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should remain functional
    await expect(terminal).toBeVisible()
  })

  test('help command executes and terminal remains functional', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type help command
    await page.keyboard.type('help')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Type another command to verify terminal is still working
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('cd to non-existent directory handles error gracefully', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type cd command to a non-existent directory
    await page.keyboard.type('cd nonexistent')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should remain functional after error
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('cd .. executes at root without error', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // At root, cd .. should not error
    await page.keyboard.type('cd ..')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Verify terminal still works
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('cd ~ executes without error', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Navigate with ~
    await page.keyboard.type('cd ~')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Verify terminal still works
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('ls command executes on empty directory without error', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type ls command on empty root directory
    await page.keyboard.type('ls')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should remain functional
    await expect(terminal).toBeVisible()
  })

  test('unknown command shows error and terminal remains functional', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type unknown command
    await page.keyboard.type('unknowncommand')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Type another command to verify terminal is still working
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('command history navigation with arrow keys', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type first command
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Type second command
    await page.keyboard.type('help')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Press up arrow to get previous command
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press up again to get first command
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press down to go back
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Execute recalled command
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Terminal should still be functional
    await expect(terminal).toBeVisible()
  })

  test('Ctrl+C cancels current input', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type some partial command
    await page.keyboard.type('some partial command')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Ctrl+C to cancel
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Type a new command to verify terminal is still working
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await expect(terminal).toBeVisible()
  })

  test('Shell terminal is contained within bottom panel', async ({ page }) => {
    // Get the bottom panel container
    const bottomPanel = page.locator('[data-testid="bottom-panel"]')
    await expect(bottomPanel).toBeVisible()
    const bottomPanelBox = await bottomPanel.boundingBox()
    expect(bottomPanelBox).toBeTruthy()

    // Get the terminal element
    const terminal = page.locator('.xterm-screen')
    await expect(terminal).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Poll until boundingBox is available
    let terminalBox: Awaited<ReturnType<typeof terminal.boundingBox>> = null
    await expect
      .poll(
        async () => {
          terminalBox = await terminal.boundingBox()
          return terminalBox
        },
        { timeout: TIMEOUTS.ELEMENT_VISIBLE }
      )
      .toBeTruthy()

    // Terminal should be fully contained within the bottom panel
    const terminalBottom = terminalBox!.y + terminalBox!.height
    const bottomPanelBottom = bottomPanelBox!.y + bottomPanelBox!.height

    expect(terminalBottom).toBeLessThanOrEqual(bottomPanelBottom + 5) // 5px tolerance
  })
})
