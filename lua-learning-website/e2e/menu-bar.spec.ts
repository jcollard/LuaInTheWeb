import { test, expect, Page } from '@playwright/test'

test.describe('Menu Bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  // Helper to get menu bar buttons (avoids conflict with other "File" buttons)
  const getMenuTrigger = (page: Page, name: string) =>
    page.getByRole('menubar', { name: 'Application menu' }).getByRole('button', { name, exact: true })

  test.describe('rendering', () => {
    test('should render menu bar with all menus', async ({ page }) => {
      // The menu bar should be visible at the top
      const menuBar = page.getByRole('menubar', { name: 'Application menu' })
      await expect(menuBar).toBeVisible()

      // All menu triggers should be visible
      await expect(getMenuTrigger(page, 'File')).toBeVisible()
      await expect(getMenuTrigger(page, 'Edit')).toBeVisible()
      await expect(getMenuTrigger(page, 'View')).toBeVisible()
      await expect(getMenuTrigger(page, 'Run')).toBeVisible()
      await expect(getMenuTrigger(page, 'Settings')).toBeVisible()
    })

    test('should not show any dropdown by default', async ({ page }) => {
      const menus = page.getByRole('menu')
      await expect(menus).not.toBeVisible()
    })
  })

  test.describe('menu opening and closing', () => {
    test('should open File menu when clicked', async ({ page }) => {
      // Click File menu
      await getMenuTrigger(page, 'File').click()

      // Menu should be visible
      const menu = page.getByRole('menu')
      await expect(menu).toBeVisible()

      // Should show File menu items
      await expect(page.getByRole('menuitem', { name: 'New File' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Save' })).toBeVisible()
    })

    test('should close menu when clicking the same trigger again', async ({ page }) => {
      // Open File menu
      await getMenuTrigger(page, 'File').click()
      await expect(page.getByRole('menu')).toBeVisible()

      // Click File again
      await getMenuTrigger(page, 'File').click()

      // Menu should close
      await expect(page.getByRole('menu')).not.toBeVisible()
    })

    test('should switch menu when clicking different trigger', async ({ page }) => {
      // Open File menu
      await getMenuTrigger(page, 'File').click()
      await expect(page.getByRole('menuitem', { name: 'New File' })).toBeVisible()

      // Click Edit menu
      await getMenuTrigger(page, 'Edit').click()

      // Should show Edit menu items
      await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'New File' })).not.toBeVisible()
    })

    test('should close menu when clicking outside', async ({ page }) => {
      // Open File menu
      await getMenuTrigger(page, 'File').click()
      await expect(page.getByRole('menu')).toBeVisible()

      // Click outside (on the main work area, far from menu)
      await page.mouse.click(800, 400)

      // Menu should close
      await expect(page.getByRole('menu')).not.toBeVisible()
    })
  })

  test.describe('File menu', () => {
    test('should show all File menu items', async ({ page }) => {
      // Open File menu
      await getMenuTrigger(page, 'File').click()

      // Should show all File menu items
      await expect(page.getByRole('menuitem', { name: 'New File' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Open File...' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Save' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Export As...' })).toBeVisible()
    })

    test('should show Open File as disabled', async ({ page }) => {
      // Open File menu
      await getMenuTrigger(page, 'File').click()

      // Open File should be disabled (placeholder for future implementation)
      const openFileItem = page.getByRole('menuitem', { name: 'Open File...' })
      await expect(openFileItem).toBeVisible()
      await expect(openFileItem).toHaveClass(/disabled/)
    })

    test('should create new file via File menu', async ({ page }) => {
      // Open File menu and click New File
      await getMenuTrigger(page, 'File').click()
      await page.getByRole('menuitem', { name: 'New File' }).click()

      // Menu should close
      await expect(page.getByRole('menu')).not.toBeVisible()

      // A rename input should appear in the file tree (indicating a new file is being created)
      const sidebar = page.getByTestId('sidebar-panel')
      await expect(sidebar.getByRole('textbox')).toBeVisible({ timeout: 3000 })
    })

    test('should show Export As enabled when file has content', async ({ page }) => {
      // First, create and open a file so Monaco editor is visible
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter') // Accept default name
      // Wait for input to disappear (file created)
      await expect(input).not.toBeVisible()
      // Click the file to open it
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()
      // Wait for Monaco editor to be visible
      await expect(page.locator('.monaco-editor')).toBeVisible()

      // Type some content into the editor (new file is empty by default)
      // Click on the editor lines area to focus
      await page.locator('.monaco-editor .view-lines').click()
      // Type content using keyboard
      await page.keyboard.type('print("hello")')

      // Open File menu
      await getMenuTrigger(page, 'File').click()

      // Export As should be enabled (not disabled) since file has content
      const exportItem = page.getByRole('menuitem', { name: 'Export As...' })
      await expect(exportItem).toBeVisible()
      await expect(exportItem).not.toHaveClass(/disabled/)
    })
  })

  test.describe('Edit menu', () => {
    test('should show all Edit menu items', async ({ page }) => {
      // Open Edit menu
      await getMenuTrigger(page, 'Edit').click()

      // Should show all Edit menu items
      await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Redo' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Cut' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Copy' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Paste' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Select All' })).toBeVisible()
    })

    test('should show Edit items as disabled when no file is open (welcome screen)', async ({ page }) => {
      // We're on welcome screen by default, so Edit items should be disabled
      await getMenuTrigger(page, 'Edit').click()

      // All Edit menu items should be disabled since no editor is visible
      await expect(page.getByRole('menuitem', { name: 'Undo' })).toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Redo' })).toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Cut' })).toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Copy' })).toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Paste' })).toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Select All' })).toHaveClass(/disabled/)
    })

    test('should enable Paste and Select All when editor is open', async ({ page }) => {
      // Create and open a file to get the editor visible
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Click file to open it in editor
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()

      // Wait for Monaco editor to be visible
      await expect(page.locator('.monaco-editor')).toBeVisible()

      // Open Edit menu
      await getMenuTrigger(page, 'Edit').click()

      // Paste and Select All should be enabled (no selection/history needed)
      await expect(page.getByRole('menuitem', { name: 'Paste' })).not.toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Select All' })).not.toHaveClass(/disabled/)

      // Cut/Copy should be disabled (no selection)
      await expect(page.getByRole('menuitem', { name: 'Cut' })).toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Copy' })).toHaveClass(/disabled/)

      // Undo should be disabled (no history yet)
      await expect(page.getByRole('menuitem', { name: 'Undo' })).toHaveClass(/disabled/)
    })

    test('should enable Undo after typing content', async ({ page }) => {
      // Create and open a file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Click file to open it
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()
      await expect(page.locator('.monaco-editor')).toBeVisible()

      // Focus editor and type content
      await page.locator('.monaco-editor .view-lines').click()
      await page.keyboard.type('hello')

      // Open Edit menu
      await getMenuTrigger(page, 'Edit').click()

      // Undo should now be enabled (we have typed content)
      await expect(page.getByRole('menuitem', { name: 'Undo' })).not.toHaveClass(/disabled/)
    })

    test('should perform Select All from Edit menu', async ({ page }) => {
      // Create and open a file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Click file to open it
      const treeItem = page.getByRole('treeitem').first()
      await treeItem.click()
      await expect(page.locator('.monaco-editor')).toBeVisible()

      // Focus editor and type content
      await page.locator('.monaco-editor .view-lines').click()
      await page.keyboard.type('hello world')

      // Open Edit menu and click Select All
      await getMenuTrigger(page, 'Edit').click()
      await page.getByRole('menuitem', { name: 'Select All' }).click()

      // Menu should close
      await expect(page.getByRole('menu')).not.toBeVisible()

      // Now open Edit menu again - Cut and Copy should be enabled (text is selected)
      await getMenuTrigger(page, 'Edit').click()
      await expect(page.getByRole('menuitem', { name: 'Cut' })).not.toHaveClass(/disabled/)
      await expect(page.getByRole('menuitem', { name: 'Copy' })).not.toHaveClass(/disabled/)
    })
  })

  test.describe('menu actions', () => {
    test('should toggle sidebar visibility from View menu', async ({ page }) => {
      // Verify sidebar is visible initially
      const sidebar = page.locator('[class*="sidebarPanel"]')
      await expect(sidebar).toBeVisible()

      // Open View menu and click Hide Sidebar
      await getMenuTrigger(page, 'View').click()
      await page.getByRole('menuitem', { name: /Hide Sidebar/ }).click()

      // Menu should close and sidebar should be hidden
      await expect(page.getByRole('menu')).not.toBeVisible()
      await expect(sidebar).not.toBeVisible()

      // Open View menu and click Show Sidebar
      await getMenuTrigger(page, 'View').click()
      await page.getByRole('menuitem', { name: /Show Sidebar/ }).click()

      // Sidebar should be visible again
      await expect(sidebar).toBeVisible()
    })

    test('should toggle theme from Settings menu', async ({ page }) => {
      // Get current theme
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )

      // Open Settings menu and click theme toggle
      await getMenuTrigger(page, 'Settings').click()
      await page.getByRole('menuitem', { name: /Theme/ }).click()

      // Theme should change
      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(newTheme).not.toBe(initialTheme)
    })
  })

  test.describe('keyboard navigation', () => {
    test('should close menu on Escape key', async ({ page }) => {
      // Open File menu
      await getMenuTrigger(page, 'File').click()
      await expect(page.getByRole('menu')).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')

      // Menu should close
      await expect(page.getByRole('menu')).not.toBeVisible()
    })

    test('should navigate menu items with arrow keys', async ({ page }) => {
      // Open View menu (has multiple enabled items)
      await getMenuTrigger(page, 'View').click()
      const menu = page.getByRole('menu')
      await expect(menu).toBeVisible()

      // First item should be focused
      const items = page.getByRole('menuitem')
      await expect(items.first()).toHaveClass(/focused/)

      // Press ArrowDown - should move to second item
      await page.keyboard.press('ArrowDown')

      // Second item should be focused
      await expect(items.nth(1)).toHaveClass(/focused/)
      await expect(items.first()).not.toHaveClass(/focused/)
    })
  })

  test.describe('accessibility', () => {
    test('should have correct ARIA attributes on menu trigger', async ({ page }) => {
      const fileTrigger = getMenuTrigger(page, 'File')

      // Check aria-haspopup
      await expect(fileTrigger).toHaveAttribute('aria-haspopup', 'menu')

      // When closed, aria-expanded should be false
      await expect(fileTrigger).toHaveAttribute('aria-expanded', 'false')

      // Open menu
      await fileTrigger.click()

      // When open, aria-expanded should be true
      await expect(fileTrigger).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
