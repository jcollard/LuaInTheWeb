import { test, expect } from '@playwright/test'

test.describe('Enhanced Editor Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Expand the workspace folder so files are visible
    const workspaceFolder = page.getByRole('treeitem').first()
    await page.getByTestId('folder-chevron').first().click()
    // Wait for folder to expand by checking aria-expanded attribute
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

  // Helper to open file as permanent tab
  async function openFilePermanent(page: import('@playwright/test').Page, name: string) {
    const file = page.getByRole('treeitem', { name: new RegExp(name, 'i') })
    await file.dblclick()
    // Wait for tab to appear in editor panel
    const editorPanel = page.getByTestId('editor-panel')
    await expect(editorPanel.getByRole('tab', { name: new RegExp(name, 'i') })).toBeVisible()
  }

  test.describe('Tab Context Menu', () => {
    test('right-clicking a tab opens context menu', async ({ page }) => {
      // Arrange - Create and open a file
      await createFile(page, 'test.lua')
      await openFilePermanent(page, 'test.lua')

      const editorPanel = page.getByTestId('editor-panel')
      const tab = editorPanel.getByRole('tab')

      // Act - Right-click the tab
      await tab.click({ button: 'right' })

      // Assert - Context menu should be visible
      await expect(page.getByRole('menu')).toBeVisible()
    })

    test('context menu shows Pin option for unpinned tabs', async ({ page }) => {
      // Arrange
      await createFile(page, 'test.lua')
      await openFilePermanent(page, 'test.lua')

      const editorPanel = page.getByTestId('editor-panel')
      const tab = editorPanel.getByRole('tab')

      // Act
      await tab.click({ button: 'right' })

      // Assert
      await expect(page.getByRole('menuitem', { name: /pin/i })).toBeVisible()
    })

    test('clicking Close from context menu closes the tab', async ({ page }) => {
      // Arrange
      await createFile(page, 'test.lua')
      await openFilePermanent(page, 'test.lua')

      const editorPanel = page.getByTestId('editor-panel')
      const tab = editorPanel.getByRole('tab')
      await expect(tab).toBeVisible()

      // Act
      await tab.click({ button: 'right' })
      await page.getByRole('menuitem', { name: /^close$/i }).click()

      // Assert - Tab should be closed
      await expect(editorPanel.getByRole('tab')).toHaveCount(0)
    })

    test('Close to Right closes all tabs to the right', async ({ page }) => {
      // Arrange - Create and open three files
      await createFile(page, 'file1.lua')
      await createFile(page, 'file2.lua')
      await createFile(page, 'file3.lua')

      await openFilePermanent(page, 'file1.lua')
      await openFilePermanent(page, 'file2.lua')
      await openFilePermanent(page, 'file3.lua')

      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab')).toHaveCount(3)

      // Act - Right-click first tab and select Close to Right
      const tab1 = editorPanel.getByRole('tab', { name: /file1\.lua/i })
      await tab1.click({ button: 'right' })
      await page.getByRole('menuitem', { name: /close to right/i }).click()

      // Assert - Only first tab should remain
      await expect(editorPanel.getByRole('tab')).toHaveCount(1)
      await expect(editorPanel.getByRole('tab', { name: /file1\.lua/i })).toBeVisible()
    })

    test('Close Others closes all tabs except the clicked one', async ({ page }) => {
      // Arrange - Create and open three files
      await createFile(page, 'keep.lua')
      await createFile(page, 'close1.lua')
      await createFile(page, 'close2.lua')

      await openFilePermanent(page, 'keep.lua')
      await openFilePermanent(page, 'close1.lua')
      await openFilePermanent(page, 'close2.lua')

      const editorPanel = page.getByTestId('editor-panel')
      await expect(editorPanel.getByRole('tab')).toHaveCount(3)

      // Act - Right-click the middle tab and select Close Others
      const keepTab = editorPanel.getByRole('tab', { name: /keep\.lua/i })
      await keepTab.click({ button: 'right' })
      await page.getByRole('menuitem', { name: /close others/i }).click()

      // Assert - Only the keep tab should remain
      await expect(editorPanel.getByRole('tab')).toHaveCount(1)
      await expect(editorPanel.getByRole('tab', { name: /keep\.lua/i })).toBeVisible()
    })
  })

  test.describe('Drag and Drop Reordering', () => {
    test('tabs are draggable', async ({ page }) => {
      // Arrange
      await createFile(page, 'test.lua')
      await openFilePermanent(page, 'test.lua')

      const editorPanel = page.getByTestId('editor-panel')
      const tab = editorPanel.getByRole('tab')

      // Assert - Tab should have draggable attribute
      await expect(tab).toHaveAttribute('draggable', 'true')
    })

    test('can reorder tabs via drag and drop', async ({ page }) => {
      // Arrange - Create and open two files
      await createFile(page, 'first.lua')
      await createFile(page, 'second.lua')

      await openFilePermanent(page, 'first.lua')
      await openFilePermanent(page, 'second.lua')

      const editorPanel = page.getByTestId('editor-panel')
      const tabs = editorPanel.getByRole('tab')
      await expect(tabs).toHaveCount(2)

      // Get initial order
      const tab1 = editorPanel.getByRole('tab').first()
      const tab2 = editorPanel.getByRole('tab').last()

      // Verify initial order
      await expect(tab1).toContainText('first.lua')
      await expect(tab2).toContainText('second.lua')

      // Act - Drag second tab before first
      const tab1Bounds = await tab1.boundingBox()
      const tab2Bounds = await tab2.boundingBox()

      if (tab1Bounds && tab2Bounds) {
        await page.mouse.move(tab2Bounds.x + tab2Bounds.width / 2, tab2Bounds.y + tab2Bounds.height / 2)
        await page.mouse.down()
        await page.mouse.move(tab1Bounds.x, tab1Bounds.y + tab1Bounds.height / 2, { steps: 10 })
        await page.mouse.up()
      }

      // Assert - Order should be swapped: second.lua is now first
      // Playwright's expect auto-waits for the condition to be met
      await expect(editorPanel.getByRole('tab')).toHaveCount(2)
      const newFirstTab = editorPanel.getByRole('tab').first()
      const newSecondTab = editorPanel.getByRole('tab').last()
      await expect(newFirstTab).toContainText('second.lua')
      await expect(newSecondTab).toContainText('first.lua')
    })
  })
})
