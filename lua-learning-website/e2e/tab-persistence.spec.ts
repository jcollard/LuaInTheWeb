import { test, expect } from '@playwright/test'

// Wait time for both file system (300ms) and tab (100ms) debounced saves
const PERSISTENCE_WAIT = 500

test.describe('Tab Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Expand the workspace folder so files are visible
    await page.getByTestId('folder-chevron').first().click()
    const workspaceFolder = page.getByRole('treeitem').first()
    await expect(workspaceFolder).toHaveAttribute('aria-expanded', 'true')
  })

  // Helper to create a file
  async function createFile(page: import('@playwright/test').Page, name: string) {
    const sidebar = page.getByTestId('sidebar-panel')
    await sidebar.getByRole('button', { name: /new file/i }).click()
    const input = sidebar.getByRole('textbox')
    await input.fill(name)
    await input.press('Enter')
    await expect(input).not.toBeVisible()
  }

  // Helper function to escape special regex chars in filename and add word boundary
  function fileNameRegex(name: string): RegExp {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match filename at word boundary (start of string, after space, or before space/Close)
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i')
  }

  // Helper to open file as permanent tab
  async function openFilePermanent(page: import('@playwright/test').Page, name: string) {
    // Use exact match for file name in tree
    const file = page.getByRole('treeitem', { name, exact: true })
    await file.dblclick()
    // Wait for tab to appear in editor panel
    const editorPanel = page.getByTestId('editor-panel')
    await expect(editorPanel.getByRole('tab', { name: fileNameRegex(name) })).toBeVisible()
  }

  // Helper to pin a tab
  async function pinTab(page: import('@playwright/test').Page, tabName: string) {
    const editorPanel = page.getByTestId('editor-panel')
    const tab = editorPanel.getByRole('tab', { name: fileNameRegex(tabName) })
    await tab.click({ button: 'right' })
    await page.getByRole('menuitem', { name: /pin/i }).click()
  }

  // Helper to delete a file
  async function deleteFile(page: import('@playwright/test').Page, fileName: string) {
    const fileItem = page.getByRole('treeitem', { name: fileName, exact: true })
    await fileItem.click({ button: 'right' })
    await page.getByRole('menuitem', { name: /delete/i }).click()
    // Confirm deletion if dialog appears
    const confirmButton = page.getByRole('button', { name: /delete|confirm/i })
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click()
    }
  }

  test.describe('Basic Persistence', () => {
    test('tabs are persisted across browser refresh', async ({ page }) => {
      // Arrange - Create and open files
      await createFile(page, 'persist1.lua')
      await createFile(page, 'persist2.lua')

      await openFilePermanent(page, 'persist1.lua')
      await openFilePermanent(page, 'persist2.lua')

      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab')).toHaveCount(2)

      // Wait for persistence to save (debounced)
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Act - Refresh the page
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Tabs should be restored
      const restoredEditorPanel = page.getByTestId('editor-panel')
      await expect(restoredEditorPanel.getByRole('tab')).toHaveCount(2)
      await expect(restoredEditorPanel.getByRole('tab', { name: /persist1\.lua/i })).toBeVisible()
      await expect(restoredEditorPanel.getByRole('tab', { name: /persist2\.lua/i })).toBeVisible()
    })

    test('active tab is restored after refresh', async ({ page }) => {
      // Arrange - Create and open files, then activate specific tab
      await createFile(page, 'active1.lua')
      await createFile(page, 'active2.lua')

      await openFilePermanent(page, 'active1.lua')
      await openFilePermanent(page, 'active2.lua')

      const editorPanel = page.getByTestId('editor-panel')
      // Select the first tab to make it active
      await editorPanel.getByRole('tab', { name: /active1\.lua/i }).click()

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - First tab should be active (has aria-selected)
      const restoredEditorPanel = page.getByTestId('editor-panel')
      const activeTab = restoredEditorPanel.getByRole('tab', { name: /active1\.lua/i })
      await expect(activeTab).toHaveAttribute('aria-selected', 'true')
    })

    test('tab order is preserved after refresh', async ({ page }) => {
      // Arrange - Create and open three files
      await createFile(page, 'order1.lua')
      await createFile(page, 'order2.lua')
      await createFile(page, 'order3.lua')

      await openFilePermanent(page, 'order1.lua')
      await openFilePermanent(page, 'order2.lua')
      await openFilePermanent(page, 'order3.lua')

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Order should be preserved
      const restoredEditorPanel = page.getByTestId('editor-panel')
      const tabs = restoredEditorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(3)

      // Check order
      await expect(tabs.nth(0)).toContainText('order1.lua')
      await expect(tabs.nth(1)).toContainText('order2.lua')
      await expect(tabs.nth(2)).toContainText('order3.lua')
    })
  })

  test.describe('Pinned Tab Persistence', () => {
    test('pinned state is preserved after refresh', async ({ page }) => {
      // Arrange - Create files and pin one
      await createFile(page, 'pinned.lua')
      await createFile(page, 'unpinned.lua')

      await openFilePermanent(page, 'pinned.lua')
      await openFilePermanent(page, 'unpinned.lua')

      await pinTab(page, 'pinned.lua')

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Pinned tab should have pinned indicator
      const restoredEditorPanel = page.getByTestId('editor-panel')
      const pinnedTab = restoredEditorPanel.getByRole('tab', { name: /pinned\.lua/i })
      // Check for pin indicator (the tab should have a pin icon or data attribute)
      await expect(pinnedTab.locator('[data-testid="pin-icon"]')).toBeVisible()
    })

    test('pinned tabs remain on the left after refresh', async ({ page }) => {
      // Arrange - Create files, pin one that's not first
      await createFile(page, 'first.lua')
      await createFile(page, 'middle.lua')
      await createFile(page, 'last.lua')

      await openFilePermanent(page, 'first.lua')
      await openFilePermanent(page, 'middle.lua')
      await openFilePermanent(page, 'last.lua')

      // Pin the middle tab - it should move to the left
      await pinTab(page, 'middle.lua')

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Pinned tab should be first
      const restoredEditorPanel = page.getByTestId('editor-panel')
      const tabs = restoredEditorPanel.getByRole('tab')
      await expect(tabs.first()).toContainText('middle.lua')
    })
  })

  test.describe('Missing File Recovery', () => {
    test('tabs for missing files are automatically closed on reload with notification', async ({ page }) => {
      // Note: Issue #564 - We now filter out missing file tabs and show a notification
      // This prevents crashes when trying to open non-existent files, especially binary files.

      // Arrange - Create files and open them
      await createFile(page, 'keep.lua')
      await createFile(page, 'deleted.lua')

      await openFilePermanent(page, 'keep.lua')
      await openFilePermanent(page, 'deleted.lua')

      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab')).toHaveCount(2)

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Delete the file
      await deleteFile(page, 'deleted.lua')

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Only the existing file tab should be restored
      const restoredEditorPanel = page.getByTestId('editor-panel')
      await expect(restoredEditorPanel.getByRole('tab')).toHaveCount(1)
      await expect(restoredEditorPanel.getByRole('tab', { name: /keep\.lua/i })).toBeVisible()
      await expect(restoredEditorPanel.getByRole('tab', { name: /deleted\.lua/i })).not.toBeVisible()

      // Assert - Error toast should appear with notification
      const toast = page.locator('[role="alert"], [data-testid="toast"]')
      await expect(toast).toBeVisible({ timeout: 2000 })
      await expect(toast).toContainText(/closed tab for missing file/i)
      await expect(toast).toContainText(/deleted\.lua/i)
    })

    test('multiple missing files show count in notification', async ({ page }) => {
      // Arrange - Create and open multiple files
      await createFile(page, 'keep.lua')
      await createFile(page, 'deleted1.lua')
      await createFile(page, 'deleted2.lua')

      await openFilePermanent(page, 'keep.lua')
      await openFilePermanent(page, 'deleted1.lua')
      await openFilePermanent(page, 'deleted2.lua')

      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab')).toHaveCount(3)

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Delete two files
      await deleteFile(page, 'deleted1.lua')
      await deleteFile(page, 'deleted2.lua')

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Only keep.lua should remain
      const restoredEditorPanel = page.getByTestId('editor-panel')
      await expect(restoredEditorPanel.getByRole('tab')).toHaveCount(1)
      await expect(restoredEditorPanel.getByRole('tab', { name: /keep\.lua/i })).toBeVisible()

      // Assert - Toast should show count
      const toast = page.locator('[role="alert"], [data-testid="toast"]')
      await expect(toast).toBeVisible({ timeout: 2000 })
      await expect(toast).toContainText(/closed 2 tabs for missing files/i)
      await expect(toast).toContainText(/deleted1\.lua/i)
      await expect(toast).toContainText(/deleted2\.lua/i)
    })

    test('app remains functional after closing missing file tabs', async ({ page }) => {
      // Arrange - Create files and open them
      await createFile(page, 'functional.lua')
      await createFile(page, 'missing.lua')

      await openFilePermanent(page, 'functional.lua')
      await openFilePermanent(page, 'missing.lua')

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Delete missing.lua
      await deleteFile(page, 'missing.lua')

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - App should be functional
      const restoredEditorPanel = page.getByTestId('editor-panel')
      await expect(restoredEditorPanel.getByRole('tab', { name: /functional\.lua/i })).toBeVisible()

      // Try to create a new file (test app functionality)
      await createFile(page, 'new-file.lua')
      await openFilePermanent(page, 'new-file.lua')

      // New file should be visible
      await expect(restoredEditorPanel.getByRole('tab', { name: /new-file\.lua/i })).toBeVisible()
      await expect(restoredEditorPanel.getByRole('tab')).toHaveCount(2)
    })

    test('all files missing shows notification and empty tab bar', async ({ page }) => {
      // Arrange - Create files and open them
      await createFile(page, 'file1.lua')
      await createFile(page, 'file2.lua')

      await openFilePermanent(page, 'file1.lua')
      await openFilePermanent(page, 'file2.lua')

      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab')).toHaveCount(2)

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Delete all files
      await deleteFile(page, 'file1.lua')
      await deleteFile(page, 'file2.lua')

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - No tabs should be visible
      const restoredEditorPanel = page.getByTestId('editor-panel')
      await expect(restoredEditorPanel.getByRole('tab')).toHaveCount(0)

      // Assert - Toast should appear
      const toast = page.locator('[role="alert"], [data-testid="toast"]')
      await expect(toast).toBeVisible({ timeout: 2000 })
      await expect(toast).toContainText(/closed 2 tabs for missing files/i)
    })
  })

  test.describe('Canvas Tab Exclusion', () => {
    test('canvas tabs are not persisted', async ({ page }) => {
      // Arrange - Create a file and open it
      await createFile(page, 'file.lua')
      await openFilePermanent(page, 'file.lua')

      // Run code to open canvas tab (if canvas is available)
      // First, type some canvas code in the editor
      const editor = page.locator('.monaco-editor')
      await editor.click()
      await page.keyboard.type('canvas.setSize(100, 100)\ncanvas.clear()')

      // Try to run the code (if run button exists)
      const runButton = page.getByRole('button', { name: /run/i })
      if (await runButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await runButton.click()
        // Wait for potential canvas tab to appear
        await page.waitForTimeout(500)
      }

      // Wait for persistence
      await page.waitForTimeout(PERSISTENCE_WAIT)

      // Act - Refresh
      await page.reload()
      await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

      // Assert - Only file tab should be restored (canvas tabs excluded)
      const restoredEditorPanel = page.getByTestId('editor-panel')
      const restoredTabs = restoredEditorPanel.getByRole('tab')
      await expect(restoredTabs).toHaveCount(1)
      await expect(restoredTabs.first()).toContainText('file.lua')
    })
  })

  test.describe('Empty State', () => {
    test('no tabs restored when localStorage is empty', async ({ page }) => {
      // Arrange - Ensure localStorage is clear (done in beforeEach)
      // No files opened

      // Act - Just verify state
      const editorPanel = page.getByTestId('editor-panel')

      // Assert - No tabs should be visible
      await expect(editorPanel.getByRole('tab')).toHaveCount(0)
    })
  })
})
