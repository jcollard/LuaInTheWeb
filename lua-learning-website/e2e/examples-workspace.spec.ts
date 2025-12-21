import { test, expect } from '@playwright/test'

test.describe('Examples Workspace', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
  })

  test.describe('examples workspace display', () => {
    test('displays examples workspace as root folder in tree', async ({ page }) => {
      // Assert - Examples workspace should be visible in the file tree
      await expect(page.getByRole('treeitem', { name: /^examples$/i })).toBeVisible()
    })

    test('shows examples workspace icon', async ({ page }) => {
      // Assert - Examples workspace should have its distinct icon
      await expect(page.getByTestId('examples-workspace-icon')).toBeVisible()
    })

    // Skipped: Flaky under parallel execution - passes individually but fails with 16 workers
    // See: https://github.com/jcollard/LuaInTheWeb/issues/404
    test.skip('can expand examples workspace to see hello.lua', async ({ page }) => {
      // Arrange - Find examples workspace
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await expect(examplesWorkspace).toBeVisible()

      // Act - Click chevron to expand
      const chevron = examplesWorkspace.getByTestId('folder-chevron')
      await chevron.click()

      // Assert - hello.lua should be visible inside
      await expect(page.getByRole('treeitem', { name: 'hello.lua' })).toBeVisible()
    })

    // Skipped: Flaky under parallel execution - passes individually but fails with 16 workers
    // See: https://github.com/jcollard/LuaInTheWeb/issues/404
    test.skip('examples workspace contains example files and folders', async ({ page }) => {
      // Arrange - Expand examples workspace
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.getByTestId('folder-chevron').click()

      // Assert - Root-level example files should be visible
      await expect(page.getByRole('treeitem', { name: 'hello.lua' })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'colors.lua' })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'mad_takes.lua' })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'adventure.lua' })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'ascii_world.lua' })).toBeVisible()
      // Assert - ascii_world and canvas subdirectories should be visible
      await expect(page.getByRole('treeitem', { name: 'ascii_world', exact: true })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'canvas', exact: true })).toBeVisible()
    })

    // Skipped: Flaky under parallel execution - passes individually but fails with 16 workers
    // See: https://github.com/jcollard/LuaInTheWeb/issues/404
    test.skip('can expand ascii_world folder to see game modules', async ({ page }) => {
      // Arrange - Expand examples workspace
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.getByTestId('folder-chevron').click()

      // Act - Find and expand ascii_world folder
      const asciiWorldFolder = page.getByRole('treeitem', { name: 'ascii_world', exact: true })
      await asciiWorldFolder.getByTestId('folder-chevron').click()

      // Assert - Game module files should be visible
      await expect(page.getByRole('treeitem', { name: 'config.lua' })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'game.lua' })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: 'EXTENSIONS.md' })).toBeVisible()
    })
  })

  // Skipped: Flaky under parallel execution - passes individually but fails with 16 workers
  // See: https://github.com/jcollard/LuaInTheWeb/issues/404
  test.describe.skip('example file viewing', () => {
    test('can open hello.lua from examples workspace', async ({ page }) => {
      // Arrange - Expand examples workspace
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.getByTestId('folder-chevron').click()

      // Act - Double-click hello.lua to open it
      const helloFile = page.getByRole('treeitem', { name: 'hello.lua' })
      await helloFile.dblclick()

      // Assert - Editor panel should show hello.lua content
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
      // Tab should show hello.lua - use tab bar specifically
      const tabBar = page.getByTestId('editor-panel').getByRole('tablist')
      await expect(tabBar).toContainText('hello.lua')
    })

    test('hello.lua contains Hello World program', async ({ page }) => {
      // Arrange - Expand examples workspace and open hello.lua
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.getByTestId('folder-chevron').click()
      const helloFile = page.getByRole('treeitem', { name: 'hello.lua' })
      await helloFile.dblclick()

      // Assert - Editor should contain Hello World code
      await expect(page.locator('.monaco-editor')).toBeVisible()
      const editorContent = page.locator('.monaco-editor')
      await expect(editorContent).toContainText('print')
      await expect(editorContent).toContainText('Hello')
    })
  })

  // Skipped: Flaky under parallel execution - passes individually but fails with 16 workers
  // See: https://github.com/jcollard/LuaInTheWeb/issues/404
  test.describe.skip('example file read-only behavior', () => {
    test('shows error toast when trying to save hello.lua', async ({ page }) => {
      // Arrange - Open hello.lua
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.getByTestId('folder-chevron').click()
      const helloFile = page.getByRole('treeitem', { name: 'hello.lua' })
      await helloFile.dblclick()
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
  })

  test.describe('examples workspace context menu', () => {
    test('examples workspace should not have Remove option in context menu', async ({ page }) => {
      // Act - Right-click on examples workspace
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.click({ button: 'right' })

      // Assert - Context menu should either not appear or have no Remove option
      await page.waitForTimeout(200)

      // The Remove Workspace option should not be present
      const removeOption = page.getByRole('menuitem', { name: /remove workspace/i })
      await expect(removeOption).not.toBeVisible()
    })

    test('examples workspace should not have Rename option in context menu', async ({ page }) => {
      // Act - Right-click on examples workspace
      const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
      await examplesWorkspace.click({ button: 'right' })

      // Assert - Context menu should either not appear or have no Rename option
      await page.waitForTimeout(200)

      // The Rename Workspace option should not be present
      const renameOption = page.getByRole('menuitem', { name: /rename workspace/i })
      await expect(renameOption).not.toBeVisible()
    })
  })
})
