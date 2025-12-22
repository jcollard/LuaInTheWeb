import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

test.describe('Docs Workspace', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Wait for docs workspace to finish loading (loading icon should disappear)
    // This ensures the async fetch has completed before we try to interact
    const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
    await expect(docsWorkspace).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    // Wait for the docs workspace icon to appear (replaces loading icon)
    await expect(page.getByTestId('docs-workspace-icon')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test.describe('docs workspace display', () => {
    test('displays docs workspace as root folder in tree', async ({ page }) => {
      // Assert - Docs workspace should be visible in the file tree
      await expect(page.getByRole('treeitem', { name: /^docs$/i })).toBeVisible()
    })

    test('shows docs (document) icon for docs workspace', async ({ page }) => {
      // Assert - Docs workspace should have the document icon
      await expect(page.getByTestId('docs-workspace-icon')).toBeVisible()
    })

    test('can expand docs workspace to see shell.md', async ({ page }) => {
      // Arrange - Find docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await expect(docsWorkspace).toBeVisible()

      // Act - Click chevron to expand
      const chevron = docsWorkspace.getByTestId('folder-chevron')
      await chevron.click()

      // Assert - shell.md should be visible inside
      await expect(page.getByRole('treeitem', { name: 'shell.md' })).toBeVisible()
    })
  })

  test.describe('docs file viewing', () => {
    test('can open shell.md from docs workspace', async ({ page }) => {
      // Arrange - Expand docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()

      // Act - Double-click shell.md to open it (opens markdown preview for docs)
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Markdown viewer should show shell.md content (docs are read-only, show preview)
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()
      // Tab should show shell.md
      await expect(page.getByRole('tab', { name: /shell\.md/i })).toBeVisible()
    })

    test('shell.md contains shell library API documentation', async ({ page }) => {
      // Arrange - Expand docs workspace and open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Markdown viewer should contain shell library documentation
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()
      // Check for key content - the documentation should have these sections
      await expect(markdownViewer).toContainText('Shell Library')
      await expect(markdownViewer).toContainText('Color Constants')
    })

    test('shell.md documents color functions', async ({ page }) => {
      // Arrange - Expand docs workspace and open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Documentation should mention color-related content
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()
      await expect(markdownViewer).toContainText('shell.foreground')
    })

    test('shell.md documents require statement', async ({ page }) => {
      // Arrange - Expand docs workspace and open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Documentation should show how to load the library
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()
      await expect(markdownViewer).toContainText("require('shell')")
    })
  })

  test.describe('docs file read-only behavior', () => {
    test('docs file opens in preview mode only', async ({ page }) => {
      // Arrange - Open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Should show markdown viewer (preview), not Monaco editor
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()
      await expect(page.locator('.monaco-editor')).not.toBeVisible()
    })

    test('docs file can be opened in edit mode but shows error on save', async ({ page }) => {
      // Arrange - Open shell.md via Edit Markdown context menu
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.click({ button: 'right' })
      await page.getByRole('menuitem', { name: /edit markdown/i }).click()

      // Assert - Monaco editor should be visible
      await expect(page.locator('.monaco-editor')).toBeVisible()

      // Make a change
      await page.locator('.monaco-editor').click()
      await page.keyboard.type('-- modified', { delay: 30 })

      // Try to save with Ctrl+S
      await page.keyboard.press('Control+s')

      // Assert - Error toast should appear
      const toastContainer = page.getByTestId('toast-container')
      await expect(toastContainer).toBeVisible({ timeout: 5000 })
      await expect(toastContainer.getByText(/read-only/i)).toBeVisible()
    })
  })

  test.describe('docs workspace context menu', () => {
    test('docs workspace should not have Remove option in context menu', async ({ page }) => {
      // Act - Right-click on docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.click({ button: 'right' })

      // Assert - Context menu should either not appear or have no Remove option
      // Docs workspaces are read-only and have an empty context menu
      // Wait a short time to see if menu appears
      await page.waitForTimeout(200)

      // The Remove Workspace option should not be present
      const removeOption = page.getByRole('menuitem', { name: /remove workspace/i })
      await expect(removeOption).not.toBeVisible()
    })

    test('docs workspace should not have Rename option in context menu', async ({ page }) => {
      // Act - Right-click on docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.click({ button: 'right' })

      // Assert - Context menu should either not appear or have no Rename option
      // Docs workspaces are read-only and have an empty context menu
      // Wait a short time to see if menu appears
      await page.waitForTimeout(200)

      // The Rename Workspace option should not be present
      const renameOption = page.getByRole('menuitem', { name: /rename workspace/i })
      await expect(renameOption).not.toBeVisible()
    })
  })
})
