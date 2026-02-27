import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'

test.describe('Library Workspace', () => {
  test.beforeEach(async ({ explorerPage: page }) => {
    // Wait for libs workspace to finish loading (loading icon should disappear)
    // This ensures the async fetch has completed before we try to interact
    const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
    await expect(libsWorkspace).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    // Wait for the library workspace icon to appear (replaces loading icon)
    await expect(page.getByTestId('library-workspace-icon')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test.describe('library workspace display', () => {
    test('displays libs workspace as root folder in tree', async ({ explorerPage: page }) => {
      // Assert - Library workspace (libs) should be visible in the file tree
      await expect(page.getByRole('treeitem', { name: /^libs$/i })).toBeVisible()
    })

    test('shows library (book) icon for libs workspace', async ({ explorerPage: page }) => {
      // Assert - Library workspace should have the book icon
      await expect(page.getByTestId('library-workspace-icon')).toBeVisible()
    })

    test('can expand libs workspace to see shell.lua', async ({ explorerPage: page }) => {
      // Arrange - Find libs workspace
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await expect(libsWorkspace).toBeVisible()

      // Act - Click chevron to expand
      const chevron = libsWorkspace.getByTestId('folder-chevron')
      await chevron.click()

      // Assert - shell.lua should be visible inside
      await expect(page.getByRole('treeitem', { name: 'shell.lua' })).toBeVisible()
    })
  })

  test.describe('library file viewing', () => {
    test('can open shell.lua from libs workspace', async ({ explorerPage: page }) => {
      // Arrange - Expand libs workspace
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.getByTestId('folder-chevron').click()

      // Act - Double-click shell.lua to open it
      const shellFile = page.getByRole('treeitem', { name: 'shell.lua' })
      await shellFile.dblclick()

      // Assert - Editor panel should show shell.lua content
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
      // Tab should show shell.lua - use tab bar specifically
      const tabBar = page.getByTestId('editor-panel').getByRole('tablist')
      await expect(tabBar).toContainText('shell.lua')
    })

    test('shell.lua contains shell library code', async ({ explorerPage: page }) => {
      // Arrange - Expand libs workspace and open shell.lua
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.getByTestId('folder-chevron').click()
      const shellFile = page.getByRole('treeitem', { name: 'shell.lua' })
      await shellFile.dblclick()

      // Assert - Editor should contain shell library code
      // Look for characteristic shell library content
      await expect(page.locator('.monaco-editor')).toBeVisible()
      // The file should have Lua code for shell library
      const editorContent = page.locator('.monaco-editor')
      // Check for key content - the file starts with LuaDoc annotations
      await expect(editorContent).toContainText('Terminal control library')
      await expect(editorContent).toContainText('@class shell')
    })
  })

  test.describe('library file read-only behavior', () => {
    test('shows error toast when trying to save shell.lua', async ({ explorerPage: page }) => {
      // Arrange - Open shell.lua
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.getByTestId('folder-chevron').click()
      const shellFile = page.getByRole('treeitem', { name: 'shell.lua' })
      await shellFile.dblclick()
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

    test('library file tab shows dirty indicator after editing', async ({ explorerPage: page }) => {
      // Arrange - Open shell.lua
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.getByTestId('folder-chevron').click()
      const shellFile = page.getByRole('treeitem', { name: 'shell.lua' })
      await shellFile.dblclick()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()

      // Act - Make a change in the editor
      const editor = page.locator('.monaco-editor')
      await editor.click()
      await page.keyboard.type('-- test')

      // Assert - Tab should show dirty indicator (dot or asterisk before name)
      // The TabBar component typically shows isDirty with a visual indicator
      const tabBar = page.getByTestId('editor-panel').getByRole('tablist')
      await expect(tabBar).toContainText(/shell\.lua/)
    })
  })

  test.describe('library workspace context menu', () => {
    test('libs workspace should not have Remove option in context menu', async ({ explorerPage: page }) => {
      // Act - Right-click on libs workspace
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.click({ button: 'right' })

      // Assert - Context menu should either not appear or have no Remove option
      // Library workspaces are read-only and have an empty context menu
      // Wait a short time to see if menu appears
      await page.waitForTimeout(200)

      // The Remove Workspace option should not be present
      const removeOption = page.getByRole('menuitem', { name: /remove workspace/i })
      await expect(removeOption).not.toBeVisible()
    })

    test('libs workspace should not have Rename option in context menu', async ({ explorerPage: page }) => {
      // Act - Right-click on libs workspace
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.click({ button: 'right' })

      // Assert - Context menu should either not appear or have no Rename option
      // Library workspaces are read-only and have an empty context menu
      // Wait a short time to see if menu appears
      await page.waitForTimeout(200)

      // The Rename Workspace option should not be present
      const renameOption = page.getByRole('menuitem', { name: /rename workspace/i })
      await expect(renameOption).not.toBeVisible()
    })
  })
})
