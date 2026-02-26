import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'
import { createAndOpenFile } from './helpers/editor'

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
  test.beforeEach(async ({ explorerPage: page }) => {
    // Wait for async workspaces to finish loading to avoid race conditions
    await expect(page.getByTestId('library-workspace-icon')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('command palette shows "Turn On Auto-Save" when auto-save is disabled', async ({ explorerPage: page }) => {
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

  test('toggling auto-save changes command palette label', async ({ explorerPage: page }) => {
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

  test('command palette shows "Save All Files" action', async ({ explorerPage: page }) => {
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

  test('auto-save persists preference to localStorage', async ({ explorerPage: page }) => {
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

  test('Ctrl+Shift+S saves all files via keyboard shortcut', async ({ explorerPage: page }) => {
    // Create and open a file
    await createAndOpenFile(page)

    // Focus editor and type some code
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()
    // Use delay to ensure all characters are typed correctly (avoids race conditions)
    await page.keyboard.type('print("hello")', { delay: 30 })

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
