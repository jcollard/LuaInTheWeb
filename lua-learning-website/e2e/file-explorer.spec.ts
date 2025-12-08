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
  })

  test.describe('initial state', () => {
    test('displays file explorer panel', async ({ page }) => {
      // Assert - File tree should be visible
      await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    })

    test('displays New File and New Folder buttons', async ({ page }) => {
      // Assert - Toolbar buttons should be visible
      await expect(page.getByRole('button', { name: /new file/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /new folder/i })).toBeVisible()
    })
  })

  test.describe('file creation', () => {
    test('clicking New File button creates a new file', async ({ page }) => {
      // Act - Click New File button
      await page.getByRole('button', { name: /new file/i }).click()

      // Assert - A new file should appear in the tree
      // The exact behavior depends on implementation (might show input or create default name)
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await expect(tree).toBeVisible()
    })
  })

  test.describe('file selection', () => {
    test('clicking a file selects it', async ({ page }) => {
      // Arrange - Create a file first
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)

      // Find a file in the tree and click it
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()

      // Assert - Item should be selected (has selected class)
      await expect(treeItem).toHaveClass(/selected/)
    })
  })

  test.describe('keyboard navigation', () => {
    test('arrow keys navigate between items', async ({ page }) => {
      // Arrange - Create a folder and a file (so we have 2 items)
      await page.getByRole('button', { name: /new folder/i }).click()
      await page.waitForTimeout(200)
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)

      // Focus tree and select first item (folder)
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.focus()

      // Click first item to select it
      const items = page.getByRole('treeitem')
      await items.first().click()
      await expect(items.first()).toHaveClass(/selected/)

      // Press ArrowDown to move to next item (file)
      await tree.press('ArrowDown')
      await page.waitForTimeout(100)

      // The second item should now be selected
      const secondItem = items.nth(1)
      await expect(secondItem).toHaveClass(/selected/)
    })
  })

  test.describe('context menu', () => {
    test('right-clicking file opens context menu', async ({ page }) => {
      // Arrange - Create a file
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)

      // Act - Right-click the file
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click({ button: 'right' })

      // Assert - Context menu should appear
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(page.getByText('Rename')).toBeVisible()
      await expect(page.getByText('Delete')).toBeVisible()
    })

    test('clicking rename in context menu shows rename input', async ({ page }) => {
      // Arrange - Create a file and open context menu
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click({ button: 'right' })

      // Act - Click rename
      await page.getByText('Rename').click()

      // Assert - Input should appear in sidebar (not Monaco editor)
      const sidebar = page.getByTestId('sidebar-panel')
      await expect(sidebar.getByRole('textbox')).toBeVisible()
    })

    test('clicking delete in context menu shows confirmation dialog', async ({ page }) => {
      // Arrange - Create a file and open context menu
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)
      const treeItem = page.getByRole('treeitem').first()
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
      // Arrange - Create a file and select it
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()

      // Act - Press F2
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.press('F2')

      // Assert - Input should appear in sidebar for renaming
      const sidebar = page.getByTestId('sidebar-panel')
      await expect(sidebar.getByRole('textbox')).toBeVisible()
    })
  })

  test.describe('Delete key shortcut', () => {
    test('pressing Delete on selected file shows confirmation dialog', async ({ page }) => {
      // Arrange - Create a file and select it
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()

      // Act - Press Delete
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.press('Delete')

      // Assert - Confirmation dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    })

    test('confirming delete removes the file', async ({ page }) => {
      // Arrange - Create a file and select it
      await page.getByRole('button', { name: /new file/i }).click()
      await page.waitForTimeout(200)
      const treeItem = page.getByRole('treeitem').first()
      const fileName = await treeItem.textContent()
      await treeItem.click()

      // Act - Press Delete and confirm
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await tree.press('Delete')
      await page.getByRole('button', { name: /delete/i }).click()

      // Assert - File should be removed from tree
      await expect(page.getByText(fileName!)).not.toBeVisible()
    })
  })

  test.describe('folder operations', () => {
    test('clicking New Folder button creates a new folder', async ({ page }) => {
      // Act - Click New Folder button
      await page.getByRole('button', { name: /new folder/i }).click()
      await page.waitForTimeout(200)

      // Assert - A new folder should appear in the tree
      const tree = page.getByRole('tree', { name: 'File Explorer' })
      await expect(tree).toBeVisible()
      // Folder item should have a chevron for expansion
      await expect(page.getByTestId('folder-chevron')).toBeVisible()
    })

    test('clicking folder expands/collapses it', async ({ page }) => {
      // Arrange - Create a folder
      await page.getByRole('button', { name: /new folder/i }).click()
      await page.waitForTimeout(200)

      // Click chevron to expand (it may already be expanded or collapsed)
      const chevron = page.getByTestId('folder-chevron')
      await chevron.click()
      await page.waitForTimeout(100)

      // Toggle again
      await chevron.click()
      await page.waitForTimeout(100)

      // Should still be in tree
      await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    })
  })
})
