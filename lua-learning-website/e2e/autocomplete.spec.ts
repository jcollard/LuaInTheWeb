import { test, expect } from '@playwright/test'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // First, expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  await page.waitForTimeout(200) // Wait for expansion animation

  // Now click New File button - the file will be created inside the expanded workspace
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: 5000 }) // Wait for rename input to appear
  await input.press('Enter') // Accept default name
  await expect(input).not.toBeVisible({ timeout: 5000 }) // Wait for rename to complete

  // Click the newly created file to open it (should be second treeitem after workspace)
  const fileItems = page.getByRole('treeitem')
  const count = await fileItems.count()
  if (count > 1) {
    await fileItems.nth(1).click() // Click the file inside the workspace
  } else {
    // Fallback: click first item
    await fileItems.first().click()
  }
  await page.waitForTimeout(200)
}

test.describe('IDE Editor - Autocomplete Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Create and open a file so Monaco editor is visible
    await createAndOpenFile(page)
    // Wait for Monaco to load
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 })
  })

  test('autocomplete does not appear automatically while typing', async ({ page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // Type a Lua keyword prefix that would trigger autocomplete if enabled
    await page.keyboard.type('pri')

    // Wait a moment for potential autocomplete popup
    await page.waitForTimeout(500)

    // Autocomplete popup (suggest-widget) should NOT be visible
    const suggestWidget = page.locator('.monaco-editor .suggest-widget')
    await expect(suggestWidget).not.toBeVisible()
  })

  test('autocomplete appears when Ctrl+Space is pressed', async ({ page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // Type some text first
    await page.keyboard.type('pri')
    await page.waitForTimeout(200)

    // Press Ctrl+Space to trigger autocomplete
    await page.keyboard.press('Control+Space')

    // Wait for autocomplete popup to appear
    await page.waitForTimeout(500)

    // Autocomplete popup (suggest-widget) should be visible
    const suggestWidget = page.locator('.monaco-editor .suggest-widget.visible')
    await expect(suggestWidget).toBeVisible({ timeout: 5000 })
  })

  test('autocomplete does not appear on trigger characters like dot', async ({ page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // Type something that would trigger autocomplete on '.' if enabled
    await page.keyboard.type('string.')

    // Wait a moment for potential autocomplete popup
    await page.waitForTimeout(500)

    // Autocomplete popup should NOT be visible (since suggestOnTriggerCharacters is false)
    const suggestWidget = page.locator('.monaco-editor .suggest-widget')
    await expect(suggestWidget).not.toBeVisible()
  })
})
