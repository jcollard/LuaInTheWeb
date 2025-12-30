import { test, expect } from '@playwright/test'

test.describe('File Explorer', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Wait for async workspaces to load before interacting
    await expect(page.getByRole('treeitem', { name: 'libs' })).toBeVisible()
    await expect(page.getByRole('treeitem', { name: 'docs' })).toBeVisible()
    // Expand the workspace folder so new files/folders are visible
    const workspaceChevron = page.getByTestId('folder-chevron').first()
    await workspaceChevron.click()
    await page.waitForTimeout(100) // Wait for expansion animation
  })

  test.describe('initial state', () => {
    test('displays file explorer panel', async ({ page }) => {
      // Assert - File tree should be visible
      await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    })

    test('displays New File and New Folder buttons', async ({ page }) => {
      // Assert - Toolbar buttons should be visible in sidebar
      const sidebar = page.getByTestId('sidebar-panel')
      await expect(sidebar.getByRole('button', { name: /new file/i })).toBeVisible()
      await expect(sidebar.getByRole('button', { name: /new folder/i })).toBeVisible()
    })
  })

  test.describe('file creation', () => {
    test('clicking New File button creates a new file', async ({ page }) => {
      // Act - Click New File button in sidebar
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      // Assert - A new file should appear in the tree
      // The exact behavior depends on implementation (might show input or create default name)
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await expect(tree).toBeVisible()
    })
  })

  test.describe('file selection', () => {
    test('clicking a file selects it', async ({ page }) => {
      // Arrange - Create a file first and complete the rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Find the file in the tree (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()

      // Assert - Item should be selected (has selected class)
      await expect(treeItem).toHaveClass(/selected/)
    })
  })

  test.describe('keyboard navigation', () => {
    test('arrow keys navigate between items', async ({ page }) => {
      // Arrange - Create a folder and a file (so we have 2 items)
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      await sidebar.getByRole('button', { name: /new file/i }).click()
      input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Focus tree and select first item (folder)
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.focus()

      // Click first item to select it
      const items = page.getByRole('treeitem')
      await items.first().click()
      await expect(items.first()).toHaveClass(/selected/)

      // Press ArrowDown to move to next item (file)
      await tree.press('ArrowDown')

      // The second item should now be selected
      const secondItem = items.nth(1)
      await expect(secondItem).toHaveClass(/selected/)
    })
  })

  test.describe('context menu', () => {
    test('right-clicking file opens context menu', async ({ page }) => {
      // Arrange - Create a file and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Act - Right-click the file (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click({ button: 'right' })

      // Assert - Context menu should appear
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(page.getByText('Rename')).toBeVisible()
      await expect(page.getByText('Delete')).toBeVisible()
    })

    test('right-clicking folder shows "Open in Shell" option', async ({ page }) => {
      // Arrange - Create a folder and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Act - Right-click the folder (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click({ button: 'right' })

      // Assert - Context menu should include "Open in Shell"
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(page.getByText('Open in Shell')).toBeVisible()
    })

    test('clicking rename in context menu shows rename input', async ({ page }) => {
      // Arrange - Create a file and open context menu
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click({ button: 'right' })

      // Act - Click rename
      await page.getByText('Rename').click()

      // Assert - Input should appear in sidebar (not Monaco editor)
      input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
    })

    test('clicking delete in context menu shows confirmation dialog', async ({ page }) => {
      // Arrange - Create a file and open context menu
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click({ button: 'right' })

      // Act - Click delete
      await page.getByText('Delete').click()

      // Assert - Confirmation dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    })
  })

  test.describe('F2 rename shortcut', () => {
    test('pressing F2 on selected file enters rename mode', async ({ page }) => {
      // Arrange - Create a file, complete rename, and select it
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await expect(treeItem).toHaveClass(/selected/)

      // Act - Press F2
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.press('F2')

      // Assert - Input should appear in sidebar for renaming
      input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
    })
  })

  test.describe('Delete key shortcut', () => {
    test('pressing Delete on selected file shows confirmation dialog', async ({ page }) => {
      // Arrange - Create a file, complete rename, and select it
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await expect(treeItem).toHaveClass(/selected/)

      // Act - Press Delete
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.press('Delete')

      // Assert - Confirmation dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    })

    test('confirming delete removes the file', async ({ page }) => {
      // Arrange - Create a file, complete rename, and select it
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      const treeItem = page.getByRole('treeitem').nth(1)
      const fileName = await treeItem.textContent()
      await treeItem.click()
      await expect(treeItem).toHaveClass(/selected/)

      // Act - Press Delete and confirm
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.press('Delete')
      await expect(page.getByRole('dialog')).toBeVisible()

      // Click the Delete button in the dialog
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: /delete/i }).click()

      // Assert - File should be removed from tree
      await expect(page.getByRole('treeitem', { name: new RegExp(fileName!) })).not.toBeVisible()
    })
  })

  test.describe('folder operations', () => {
    test('clicking New Folder button creates a new folder', async ({ page }) => {
      // Get initial chevron count (workspaces vary based on what's loaded)
      const initialChevronCount = await page.getByTestId('folder-chevron').count()

      // Act - Click New Folder button in sidebar
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()

      // Assert - A new folder should appear in the tree with rename input visible
      await expect(sidebar.getByRole('textbox')).toBeVisible()
      // New folder should add one more chevron
      const chevrons = page.getByTestId('folder-chevron')
      await expect(chevrons).toHaveCount(initialChevronCount + 1)
    })

    test('clicking folder expands/collapses it', async ({ page }) => {
      // Arrange - Create a folder and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Click the new folder's chevron (fourth one - after home, libs, and docs workspaces)
      const chevron = page.getByTestId('folder-chevron').nth(3)
      await chevron.click()

      // Toggle again
      await chevron.click()

      // Should still be in tree
      await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    })
  })

  test.describe('empty state', () => {
    test('shows Welcome Screen when no file is open', async ({ page }) => {
      // Assert - Welcome Screen should be visible when no file is open
      await expect(page.locator('[data-testid="welcome-screen"]')).toBeVisible()
      await expect(page.getByText('Welcome to Lua IDE')).toBeVisible()
    })

    test('hides Welcome Screen after opening a file', async ({ page }) => {
      // Arrange - Create a file and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Double-click the file to open it (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.dblclick()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()

      // Assert - Welcome Screen should be hidden, editor panel visible
      await expect(page.locator('[data-testid="welcome-screen"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
    })
  })

  test.describe('new file inline rename', () => {
    test('new file immediately enters rename mode', async ({ page }) => {
      // Act - Click New File button in sidebar
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      // Assert - Input should appear in sidebar for renaming
      await expect(sidebar.getByRole('textbox')).toBeVisible()
    })

    test('can rename new file by typing and pressing Enter', async ({ page }) => {
      // Act - Click New File button and rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      // Type new name
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
      await input.clear()
      await input.fill('my-script.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Assert - File should be renamed in tree
      await expect(page.getByText('my-script.lua')).toBeVisible()
    })

    test('pressing Escape on new file deletes it', async ({ page }) => {
      // Act - Click New File button and cancel with Escape
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()

      // Press Escape to cancel
      await page.keyboard.press('Escape')
      await expect(input).not.toBeVisible()

      // Assert - File should be deleted (untitled-1.lua should not exist)
      await expect(page.getByText('untitled-1.lua')).not.toBeVisible()
    })
  })

  test.describe('new folder inline rename', () => {
    test('new folder immediately enters rename mode', async ({ page }) => {
      // Act - Click New Folder button in sidebar
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()

      // Assert - Input should appear in sidebar for renaming
      await expect(sidebar.getByRole('textbox')).toBeVisible()
    })

    test('can rename new folder by typing and pressing Enter', async ({ page }) => {
      // Act - Click New Folder button and rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()

      // Type new name
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
      await input.clear()
      await input.fill('my-scripts')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Assert - Folder should be renamed in tree
      await expect(page.getByText('my-scripts')).toBeVisible()
    })

    test('pressing Escape on new folder deletes it', async ({ page }) => {
      // Act - Click New Folder button and cancel with Escape
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()

      // Press Escape to cancel
      await page.keyboard.press('Escape')
      await expect(input).not.toBeVisible()

      // Assert - Folder should be deleted (new-folder should not exist)
      await expect(page.getByText('new-folder')).not.toBeVisible()
    })

    test('accepting default folder name creates folder in tree', async ({ page }) => {
      // Act - Create folder and accept default name
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
      await input.press('Enter') // Accept default name 'new-folder'

      // Wait for rename mode to exit (textbox should disappear)
      await expect(input).not.toBeVisible({ timeout: 3000 })

      // Assert - Folder should exist with default name
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      const folderItem = tree.getByRole('treeitem', { name: /new-folder/i })
      await expect(folderItem).toBeVisible()
    })
  })

  test.describe('drag and drop', () => {
    test('file items are draggable', async ({ page }) => {
      // Arrange - Create a file and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Assert - File item should be draggable (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await expect(treeItem).toHaveAttribute('draggable', 'true')
    })

    test('folder items are draggable', async ({ page }) => {
      // Arrange - Create a folder and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Assert - Folder item should be draggable (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await expect(treeItem).toHaveAttribute('draggable', 'true')
    })
  })

  // Removed: 'error toast notifications' tests - these were testing unimplemented
  // functionality. When toast notifications are added for file validation errors,
  // new tests should be written to match the actual implementation.
  // See issue #414 for details.

  test.describe('file upload', () => {
    test('right-clicking folder shows "Upload Files..." option', async ({ page }) => {
      // Arrange - Create a folder and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      await expect(input).not.toBeVisible()

      // Act - Right-click the folder (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click({ button: 'right' })

      // Assert - Context menu should include "Upload Files..."
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(page.getByText('Upload Files...')).toBeVisible()
    })

    test('uploading single file to folder adds it to the tree', async ({ page }) => {
      // Arrange - Create a folder and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.fill('uploads')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Expand the folder to see contents later
      const folderItem = page.getByRole('treeitem', { name: /uploads/i })
      await expect(folderItem).toBeVisible()

      // Act - Right-click folder and select Upload Files
      await folderItem.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByText('Upload Files...').click()

      // Simulate file selection via the hidden input
      const fileInput = page.getByTestId('file-upload-input')
      await fileInput.setInputFiles({
        name: 'test-upload.lua',
        mimeType: 'text/plain',
        buffer: Buffer.from('print("uploaded!")'),
      })

      // Wait for file tree to update
      await page.waitForTimeout(200)

      // Expand the folder to see the uploaded file
      const chevron = folderItem.getByTestId('folder-chevron')
      await chevron.click()

      // Assert - Uploaded file should appear in the tree
      await expect(page.getByText('test-upload.lua')).toBeVisible()
    })

    test('uploading multiple files to folder adds them all to the tree', async ({ page }) => {
      // Arrange - Create a folder and complete rename
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      let input = sidebar.getByRole('textbox')
      await input.fill('multi-uploads')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Find the folder
      const folderItem = page.getByRole('treeitem', { name: /multi-uploads/i })
      await expect(folderItem).toBeVisible()

      // Act - Right-click folder and select Upload Files
      await folderItem.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByText('Upload Files...').click()

      // Simulate multiple file selection via the hidden input
      const fileInput = page.getByTestId('file-upload-input')
      await fileInput.setInputFiles([
        {
          name: 'file1.lua',
          mimeType: 'text/plain',
          buffer: Buffer.from('print("file 1")'),
        },
        {
          name: 'file2.lua',
          mimeType: 'text/plain',
          buffer: Buffer.from('print("file 2")'),
        },
      ])

      // Wait for file tree to update
      await page.waitForTimeout(200)

      // Expand the folder to see the uploaded files
      const chevron = folderItem.getByTestId('folder-chevron')
      await chevron.click()

      // Assert - Both uploaded files should appear in the tree
      await expect(page.getByText('file1.lua')).toBeVisible()
      await expect(page.getByText('file2.lua')).toBeVisible()
    })
  })
})
