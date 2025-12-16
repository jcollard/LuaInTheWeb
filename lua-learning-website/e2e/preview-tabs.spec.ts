import { test, expect } from '@playwright/test'

test.describe('Preview Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Expand the workspace folder so files are visible
    const workspaceChevron = page.getByTestId('folder-chevron').first()
    await workspaceChevron.click()
    await page.waitForTimeout(100) // Wait for expansion animation
  })

  test.describe('single-click behavior', () => {
    test('single-clicking a file opens it in a preview tab with italic name', async ({ page }) => {
      // Arrange - Create a file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Act - Single-click the file to open it as preview
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await page.waitForTimeout(100) // Allow tab to open

      // Assert - Tab should appear and have preview class (italic styling)
      const editorPanel = page.getByTestId('editor-panel')
      const tab = editorPanel.getByRole('tab')
      await expect(tab).toBeVisible()
      await expect(tab).toHaveClass(/_preview_/)
    })

    test('single-clicking another file replaces the preview tab', async ({ page }) => {
      // Arrange - Create two files
      const sidebar = page.getByTestId('sidebar-panel')
      const editorPanel = page.getByTestId('editor-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.fill('file1.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      await sidebar.getByRole('button', { name: /new file/i }).click()
      input = sidebar.getByRole('textbox')
      await input.fill('file2.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Single-click first file
      const file1 = page.getByRole('treeitem', { name: /file1\.lua/i })
      await file1.click()
      await page.waitForTimeout(100)

      // Assert first file is open as preview
      let tabs = editorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(1)
      await expect(tabs.first()).toHaveClass(/_preview_/)
      await expect(tabs.first()).toContainText('file1.lua')

      // Act - Single-click second file
      const file2 = page.getByRole('treeitem', { name: /file2\.lua/i })
      await file2.click()
      await page.waitForTimeout(100)

      // Assert - Should still have only one tab, now showing file2
      tabs = editorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(1)
      await expect(tabs.first()).toContainText('file2.lua')
      await expect(tabs.first()).toHaveClass(/_preview_/)
    })
  })

  test.describe('double-click behavior', () => {
    test('double-clicking a file opens it as a permanent tab (no italics)', async ({ page }) => {
      // Arrange - Create a file
      const sidebar = page.getByTestId('sidebar-panel')
      const editorPanel = page.getByTestId('editor-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Act - Double-click the file to open it permanently
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.dblclick()
      await page.waitForTimeout(100)

      // Assert - Tab should appear without preview class
      const tab = editorPanel.getByRole('tab')
      await expect(tab).toBeVisible()
      await expect(tab).not.toHaveClass(/_preview_/)
    })

    test('double-clicking opens permanent tab that is not replaced by single-click', async ({ page }) => {
      // Arrange - Create two files
      const sidebar = page.getByTestId('sidebar-panel')
      const editorPanel = page.getByTestId('editor-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.fill('permanent.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      await sidebar.getByRole('button', { name: /new file/i }).click()
      input = sidebar.getByRole('textbox')
      await input.fill('preview.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Double-click to open permanent tab
      const permanentFile = page.getByRole('treeitem', { name: /permanent\.lua/i })
      await permanentFile.dblclick()
      await page.waitForTimeout(100)

      // Assert first file is open as permanent
      let tabs = editorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(1)
      await expect(tabs.first()).not.toHaveClass(/_preview_/)

      // Act - Single-click second file
      const previewFile = page.getByRole('treeitem', { name: /preview\.lua/i })
      await previewFile.click()
      await page.waitForTimeout(100)

      // Assert - Should now have two tabs (permanent + preview)
      tabs = editorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(2)
    })
  })

  test.describe('preview to permanent conversion', () => {
    test('editing a preview tab converts it to permanent', async ({ page }) => {
      // Arrange - Create a file and open as preview
      const sidebar = page.getByTestId('sidebar-panel')
      const editorPanel = page.getByTestId('editor-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Single-click to open as preview
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await page.waitForTimeout(100)

      // Verify it's a preview tab
      const tab = editorPanel.getByRole('tab')
      await expect(tab).toHaveClass(/_preview_/)

      // Act - Type in the editor to make changes
      const editor = page.locator('.monaco-editor')
      await editor.click()
      await page.keyboard.type('-- This is a test comment')
      await page.waitForTimeout(100)

      // Assert - Tab should become permanent (no longer preview class)
      await expect(tab).not.toHaveClass(/_preview_/)
      // Tab should also show dirty indicator (asterisk)
      await expect(tab).toContainText('*')
    })
  })

  test.describe('mixed tab behavior', () => {
    test('can have both permanent and preview tabs open', async ({ page }) => {
      // Arrange - Create three files
      const sidebar = page.getByTestId('sidebar-panel')
      const editorPanel = page.getByTestId('editor-panel')

      await sidebar.getByRole('button', { name: /new file/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.fill('perm1.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      await sidebar.getByRole('button', { name: /new file/i }).click()
      input = sidebar.getByRole('textbox')
      await input.fill('perm2.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      await sidebar.getByRole('button', { name: /new file/i }).click()
      input = sidebar.getByRole('textbox')
      await input.fill('preview.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Double-click first two files to open permanently
      const perm1 = page.getByRole('treeitem', { name: /perm1\.lua/i })
      await perm1.dblclick()
      await page.waitForTimeout(100)

      const perm2 = page.getByRole('treeitem', { name: /perm2\.lua/i })
      await perm2.dblclick()
      await page.waitForTimeout(100)

      // Single-click third file
      const preview = page.getByRole('treeitem', { name: /preview\.lua/i })
      await preview.click()
      await page.waitForTimeout(100)

      // Assert - Should have 3 tabs: 2 permanent, 1 preview
      const tabs = editorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(3)

      // Verify specific tabs
      const tab1 = editorPanel.getByRole('tab', { name: /perm1\.lua/i })
      const tab2 = editorPanel.getByRole('tab', { name: /perm2\.lua/i })
      const tab3 = editorPanel.getByRole('tab', { name: /preview\.lua/i })

      await expect(tab1).not.toHaveClass(/_preview_/)
      await expect(tab2).not.toHaveClass(/_preview_/)
      await expect(tab3).toHaveClass(/_preview_/)
    })
  })
})
