import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // First, expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  // Wait for folder to expand by checking for child items
  await expect(page.getByRole('treeitem').nth(1)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

  // Now click New File button - the file will be created inside the expanded workspace
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  await input.press('Enter') // Accept default name
  await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

  // Click the newly created file to open it (should be second treeitem after workspace)
  const fileItems = page.getByRole('treeitem')
  const count = await fileItems.count()
  if (count > 1) {
    await fileItems.nth(1).click() // Click the file inside the workspace
  } else {
    // Fallback: click first item
    await fileItems.first().click()
  }
  // Wait for Monaco editor to load
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
}

test.describe('IDE Editor - Autocomplete Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Create and open a file so Monaco editor is visible
    await createAndOpenFile(page)
    // Wait for Monaco to load
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('autocomplete does not appear automatically while typing', async ({ page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // Type a Lua keyword prefix that would trigger autocomplete if enabled
    await page.keyboard.type('pri')
    // Wait for text to render
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('pri', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Give autocomplete time to appear (if it would) - this is intentional for negative test
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

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
    // Wait for text to render
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('pri', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Press Ctrl+Space to trigger autocomplete
    await page.keyboard.press('Control+Space')

    // Autocomplete popup (suggest-widget) should be visible
    const suggestWidget = page.locator('.monaco-editor .suggest-widget.visible')
    await expect(suggestWidget).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('autocomplete does not appear on trigger characters like dot', async ({ page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // Type something that would trigger autocomplete on '.' if enabled
    await page.keyboard.type('string.')
    // Wait for text to render
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('string.', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Give autocomplete time to appear (if it would) - this is intentional for negative test
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Autocomplete popup should NOT be visible (since suggestOnTriggerCharacters is false)
    const suggestWidget = page.locator('.monaco-editor .suggest-widget')
    await expect(suggestWidget).not.toBeVisible()
  })
})
