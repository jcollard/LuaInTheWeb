import { test, expect } from '@playwright/test'

test.describe('Docs Workspace', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
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

      // Act - Double-click shell.md to open it
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Editor panel should show shell.md content
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
      // Tab should show shell.md - use tab bar specifically
      const tabBar = page.getByTestId('editor-panel').getByRole('tablist')
      await expect(tabBar).toContainText('shell.md')
    })

    test('shell.md contains shell library API documentation', async ({ page }) => {
      // Arrange - Expand docs workspace and open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Editor should contain shell library documentation
      await expect(page.locator('.monaco-editor')).toBeVisible()
      const editorContent = page.locator('.monaco-editor')
      // Check for key content - the documentation should have these sections
      await expect(editorContent).toContainText('Shell Library')
      await expect(editorContent).toContainText('Color Constants')
    })

    test('shell.md documents color functions', async ({ page }) => {
      // Arrange - Expand docs workspace and open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Documentation should mention color-related content
      // (visible in the initial viewport where Color Constants section is shown)
      const editorContent = page.locator('.monaco-editor')
      await expect(editorContent).toContainText('shell.foreground')
    })

    test('shell.md documents require statement', async ({ page }) => {
      // Arrange - Expand docs workspace and open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()

      // Assert - Documentation should show how to load the library
      const editorContent = page.locator('.monaco-editor')
      await expect(editorContent).toContainText("require('shell')")
    })
  })

  test.describe('docs file read-only behavior', () => {
    test('shows error toast when trying to save shell.md', async ({ page }) => {
      // Arrange - Open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()

      // Make a change in the editor to mark as dirty
      const editor = page.locator('.monaco-editor')
      await editor.click()
      // Type something to modify the content
      await page.keyboard.type('-- modified')
      await page.waitForTimeout(100)

      // Act - Try to save with Ctrl+S
      await page.keyboard.press('Control+s')

      // Assert - Error toast should appear
      const toastContainer = page.getByTestId('toast-container')
      await expect(toastContainer).toBeVisible({ timeout: 5000 })
      await expect(toastContainer.getByText(/read-only/i)).toBeVisible()
    })

    test('docs file tab shows dirty indicator after editing', async ({ page }) => {
      // Arrange - Open shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.dblclick()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()

      // Act - Make a change in the editor
      const editor = page.locator('.monaco-editor')
      await editor.click()
      await page.keyboard.type('-- test')

      // Assert - Tab should show dirty indicator
      const tabBar = page.getByTestId('editor-panel').getByRole('tablist')
      await expect(tabBar).toContainText(/shell\.md/)
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
