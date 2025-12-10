import { test, expect, Page } from '@playwright/test'
import { TIMEOUTS } from './constants'

/**
 * Helper to get terminal content via SerializeAddon
 */
async function getShellContent(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const getContent = (window as unknown as { __getShellContent?: () => string }).__getShellContent
    return getContent?.() ?? ''
  })
}

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

  test('shows welcome message on load', async ({ page }) => {
    // Wait for welcome message to appear
    await expect
      .poll(async () => getShellContent(page), { timeout: TIMEOUTS.ELEMENT_VISIBLE })
      .toContain('Lua Shell - Ready')

    const content = await getShellContent(page)
    expect(content).toContain("Type 'help' for available commands")
  })

  test('pwd command shows current directory', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')

    // Wait for prompt to reappear after command executes
    // Use accessibility tree text verification via tabpanel
    const tabpanel = page.getByRole('tabpanel')
    await expect(tabpanel).toContainText('pwd')
    await expect(tabpanel).toContainText('/')
    await expect(tabpanel).toContainText('$')
  })

  test('help command shows available commands', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    await page.keyboard.type('help')
    await page.keyboard.press('Enter')

    // Verify help shows available commands
    await expect
      .poll(async () => getShellContent(page), { timeout: TIMEOUTS.ELEMENT_VISIBLE })
      .toContain('Available commands')

    const content = await getShellContent(page)
    expect(content).toContain('pwd')
    expect(content).toContain('cd')
    expect(content).toContain('ls')
    expect(content).toContain('help')
  })

  test('cd to non-existent directory shows error', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    await page.keyboard.type('cd nonexistent')
    await page.keyboard.press('Enter')

    // Verify error message appears in tabpanel
    const tabpanel = page.getByRole('tabpanel')
    await expect(tabpanel).toContainText('No such file or directory')
  })

  test('ls command works on empty directory', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    await page.keyboard.type('ls')
    await page.keyboard.press('Enter')

    // Wait for command to execute - after ls, prompt should reappear
    // On empty directory, ls produces no output, verify no error and terminal still works
    await expect
      .poll(async () => {
        const content = await getShellContent(page)
        // ls was typed, no error message, and prompt reappeared (contains $ )
        return content.includes('ls') && !content.includes('error') && content.includes('$ ')
      }, { timeout: TIMEOUTS.ELEMENT_VISIBLE })
      .toBe(true)
  })

  test('unknown command shows command not found error', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    await page.keyboard.type('notarealcommand')
    await page.keyboard.press('Enter')

    // Verify error message
    await expect
      .poll(async () => getShellContent(page), { timeout: TIMEOUTS.ELEMENT_VISIBLE })
      .toContain('command not found')
  })

  test('Ctrl+C cancels current input', async ({ page }) => {
    const terminal = page.locator('.xterm-screen')
    await terminal.click()

    // Type some partial command
    await page.keyboard.type('some partial command')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Press Ctrl+C to cancel
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Now type a real command to verify terminal still works
    await page.keyboard.type('pwd')
    await page.keyboard.press('Enter')

    // Verify pwd works (proves Ctrl+C didn't break terminal)
    const tabpanel = page.getByRole('tabpanel')
    await expect(tabpanel).toContainText('pwd')
    await expect(tabpanel).toContainText('/')
    // Verify "some" was NOT executed as a command
    await expect(tabpanel).not.toContainText('some: command not found')
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
