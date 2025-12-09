import { test, expect } from '@playwright/test'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')
  await sidebar.getByRole('button', { name: /new file/i }).click()
  const input = sidebar.getByRole('textbox')
  await input.press('Enter') // Accept default name
  await page.waitForTimeout(200)
  // Click the file to open it
  const treeItem = page.getByRole('treeitem').first()
  await treeItem.click()
  await page.waitForTimeout(500)
}

test.describe('Theme - Monaco Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    // Wait for IDE layout to be ready
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test('Monaco editor uses vs-dark theme in dark mode', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor to be visible
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Monaco adds theme class to the editor element
    // vs-dark theme adds 'vs-dark' class
    await expect(monacoEditor).toHaveClass(/vs-dark/)
  })

  test('Monaco editor uses vs theme in light mode', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor to be visible
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // vs (light) theme should NOT have vs-dark class
    await expect(monacoEditor).not.toHaveClass(/vs-dark/)
  })

  test('Monaco editor background matches theme in dark mode', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Check background color - vs-dark uses #1e1e1e
    const bgColor = await monacoEditor.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // #1e1e1e = rgb(30, 30, 30)
    expect(bgColor).toBe('rgb(30, 30, 30)')
  })

  test('Monaco editor background matches theme in light mode', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Check background color - vs (light) uses #fffffe (near white)
    const bgColor = await monacoEditor.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // Monaco vs light theme uses #fffffe = rgb(255, 255, 254)
    expect(bgColor).toBe('rgb(255, 255, 254)')
  })

  test('Monaco editor theme persists after page reload', async ({ page }) => {
    // Start in dark mode
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor and verify dark theme
    let monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })
    await expect(monacoEditor).toHaveClass(/vs-dark/)

    // Change theme to light and reload (simulating user switching themes)
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Open a file again
    await createAndOpenFile(page)

    // Monaco should now have vs (light) theme
    monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })
    await expect(monacoEditor).not.toHaveClass(/vs-dark/)
  })
})
