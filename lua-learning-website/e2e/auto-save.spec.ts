import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // Expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  await expect(page.getByRole('treeitem').nth(1)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

  // Click New File button
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  await input.press('Enter')
  await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

  // Click the newly created file to open it
  const fileItems = page.getByRole('treeitem')
  const count = await fileItems.count()
  if (count > 1) {
    await fileItems.nth(1).click()
  } else {
    await fileItems.first().click()
  }
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
}

// Helper to open command palette
async function openCommandPalette(page: import('@playwright/test').Page) {
  // Focus the Monaco editor first
  await page.locator('.monaco-editor').click()
  // Open command palette with F1
  await page.keyboard.press('F1')
  // Wait for command palette to appear
  await expect(page.locator('.quick-input-widget')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
}

test.describe('Auto-Save and Save All', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
  })

  test('command palette shows "Turn On Auto-Save" when auto-save is disabled', async ({ page }) => {
    // Create and open a file
    await createAndOpenFile(page)

    // Open command palette
    await openCommandPalette(page)

    // Type to search for auto-save
    await page.keyboard.type('auto-save')

    // Should show "Turn On Auto-Save" option
    const option = page.locator('.quick-input-widget').getByText(/turn on auto-save/i)
    await expect(option).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('toggling auto-save changes command palette label', async ({ page }) => {
    // Create and open a file
    await createAndOpenFile(page)

    // Open command palette and enable auto-save
    await openCommandPalette(page)
    await page.keyboard.type('auto-save')
    await page.locator('.quick-input-widget').getByText(/turn on auto-save/i).click()

    // Wait for command palette to close
    await expect(page.locator('.quick-input-widget')).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Open command palette again
    await openCommandPalette(page)
    await page.keyboard.type('auto-save')

    // Should now show "Turn Off Auto-Save"
    const option = page.locator('.quick-input-widget').getByText(/turn off auto-save/i)
    await expect(option).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('command palette shows "Save All Files" action', async ({ page }) => {
    // Create and open a file
    await createAndOpenFile(page)

    // Open command palette
    await openCommandPalette(page)

    // Type to search for save all
    await page.keyboard.type('save all')

    // Should show "Save All Files" option
    const option = page.locator('.quick-input-widget').getByText(/save all files/i)
    await expect(option).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('auto-save persists preference to localStorage', async ({ page }) => {
    // Create and open a file
    await createAndOpenFile(page)

    // Enable auto-save via command palette
    await openCommandPalette(page)
    await page.keyboard.type('auto-save')
    await page.locator('.quick-input-widget').getByText(/turn on auto-save/i).click()

    // Wait for command palette to close
    await expect(page.locator('.quick-input-widget')).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Check localStorage
    const autoSaveEnabled = await page.evaluate(() => localStorage.getItem('ide-auto-save-enabled'))
    expect(autoSaveEnabled).toBe('true')
  })

  // Skipped: Flaky under parallel execution - passes individually but fails with 16 workers
  // See: https://github.com/jcollard/LuaInTheWeb/issues/404
  test.skip('Ctrl+Shift+S saves all files via keyboard shortcut', async ({ page }) => {
    // Create and open a file
    await createAndOpenFile(page)

    // Focus editor and type some code
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()
    await page.keyboard.type('print("hello")')

    // Wait for content to be typed
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('print', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // File should show dirty indicator (asterisk in tab)
    const editorPanel = page.getByTestId('editor-panel')
    const dirtyTab = editorPanel.getByRole('tab').filter({ hasText: /\*/ })
    await expect(dirtyTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Press Ctrl+Shift+S to save all
    await page.keyboard.press('Control+Shift+s')

    // Wait for save to complete - dirty indicator should disappear
    // Tab should no longer have asterisk
    await expect(dirtyTab).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })
})
