import { test, expect } from '@playwright/test'

// Helper to expand workspace folder so files can be created/selected
async function expandWorkspace(page: import('@playwright/test').Page) {
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  await page.waitForTimeout(200)
}

test.describe('Welcome Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state (no recent files)
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render (ensures workspace is ready)
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
  })

  test.describe('initial display', () => {
    test('displays Welcome Screen when no files are open', async ({ page }) => {
      // Assert - Welcome screen should be visible
      await expect(page.locator('[data-testid="welcome-screen"]')).toBeVisible()

      // Should show welcome title
      await expect(page.getByText('Welcome to Lua IDE')).toBeVisible()
    })

    test('shows New File button in Start section', async ({ page }) => {
      // Assert - New File button should be visible in welcome screen
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await expect(welcomeScreen.getByRole('button', { name: /new file/i })).toBeVisible()
    })

    test('shows Open Shell button in Start section', async ({ page }) => {
      // Assert - Open Shell button should be visible
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await expect(welcomeScreen.getByRole('button', { name: /open shell/i })).toBeVisible()
    })

    test('shows Recent Files section', async ({ page }) => {
      // Assert - Recent Files section heading should be visible
      await expect(page.getByRole('heading', { name: 'Recent Files' })).toBeVisible()
    })

    test('shows empty state message when no recent files', async ({ page }) => {
      // Assert - Should show "No recent files" message
      await expect(page.getByText(/no recent files/i)).toBeVisible()
    })

    test('does not show editor panel when Welcome Screen is displayed', async ({ page }) => {
      // Assert - Editor panel should not be visible
      await expect(page.locator('[data-testid="editor-panel"]')).not.toBeVisible()
    })
  })

  test.describe('New File action', () => {
    test('clicking New File creates and opens a file', async ({ page }) => {
      // First expand the workspace to see created files
      await expandWorkspace(page)

      // Act - Click New File button in welcome screen
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await welcomeScreen.getByRole('button', { name: /new file/i }).click()

      // Wait for file to be created (enters rename mode)
      const sidebar = page.getByTestId('sidebar-panel')
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: 5000 })

      // Accept default name
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: 5000 })

      // Click on file to open it (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await page.waitForTimeout(200)

      // Assert - Welcome screen should be hidden, editor panel should be visible
      await expect(page.locator('[data-testid="welcome-screen"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
    })
  })

  test.describe('Open Shell action', () => {
    test('clicking Open Shell shows terminal panel if hidden', async ({ page }) => {
      // Arrange - Hide terminal first using Ctrl+`
      await page.keyboard.press('Control+`')
      await expect(page.locator('[data-testid="bottom-panel"]')).not.toBeVisible()

      // Act - Click Open Shell in welcome screen
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await welcomeScreen.getByRole('button', { name: /open shell/i }).click()

      // Assert - Terminal panel should now be visible
      await expect(page.locator('[data-testid="bottom-panel"]')).toBeVisible()
    })

    test('clicking Open Shell keeps terminal visible if already shown', async ({ page }) => {
      // Arrange - Terminal should be visible by default
      await expect(page.locator('[data-testid="bottom-panel"]')).toBeVisible()

      // Act - Click Open Shell
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await welcomeScreen.getByRole('button', { name: /open shell/i }).click()

      // Assert - Terminal panel should still be visible
      await expect(page.locator('[data-testid="bottom-panel"]')).toBeVisible()
    })
  })

  test.describe('Recent Files', () => {
    test('recent files appear after opening files', async ({ page }) => {
      // First expand the workspace
      await expandWorkspace(page)

      // Arrange - Create and open a file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: 5000 })
      await input.clear()
      await input.fill('test-file.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: 5000 })

      // Open the file
      const treeItem = page.getByRole('treeitem', { name: /test-file\.lua/i })
      await treeItem.click()
      await page.waitForTimeout(200)

      // Close the file tab
      const closeButton = page.getByRole('button', { name: /close test-file\.lua/i })
      await closeButton.click()
      await page.waitForTimeout(200)

      // Assert - Welcome screen should show the recent file
      await expect(page.locator('[data-testid="welcome-screen"]')).toBeVisible()
      // Check for file name in recent files section (use the button that contains the file)
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await expect(welcomeScreen.getByRole('button', { name: /test-file\.lua/i })).toBeVisible()
    })

    test('clicking recent file opens it', async ({ page }) => {
      // First expand the workspace
      await expandWorkspace(page)

      // Arrange - Create, open, and close a file to add it to recent files
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: 5000 })
      await input.clear()
      await input.fill('recent-test.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: 5000 })

      // Open the file
      const treeItem = page.getByRole('treeitem', { name: /recent-test\.lua/i })
      await treeItem.click()
      await page.waitForTimeout(200)

      // Close the file tab
      const closeButton = page.getByRole('button', { name: /close recent-test\.lua/i })
      await closeButton.click()
      await page.waitForTimeout(200)

      // Act - Click the recent file button in welcome screen
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await welcomeScreen.getByRole('button', { name: /recent-test\.lua/i }).click()
      await page.waitForTimeout(200)

      // Assert - File should be opened, welcome screen hidden
      await expect(page.locator('[data-testid="welcome-screen"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
      await expect(page.getByRole('tab', { name: /recent-test\.lua/i })).toBeVisible()
    })

    test('Clear button removes recent files', async ({ page }) => {
      // First expand the workspace
      await expandWorkspace(page)

      // Arrange - Create and open a file to add to recent files
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: 5000 })
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: 5000 })

      // Open the file (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await page.waitForTimeout(200)

      // Close the file tab
      const closeButton = page.getByRole('button', { name: /close/i })
      await closeButton.click()
      await page.waitForTimeout(200)

      // Verify recent file appears
      const welcomeScreen = page.locator('[data-testid="welcome-screen"]')
      await expect(welcomeScreen).toBeVisible()

      // Act - Click Clear button
      await welcomeScreen.getByRole('button', { name: /clear/i }).click()
      await page.waitForTimeout(100)

      // Assert - Should show "No recent files" again
      await expect(page.getByText(/no recent files/i)).toBeVisible()
    })
  })

  test.describe('Welcome Screen visibility', () => {
    test('Welcome Screen reappears when all tabs are closed', async ({ page }) => {
      // First expand the workspace
      await expandWorkspace(page)

      // Arrange - Create and open a file
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible({ timeout: 5000 })
      await input.press('Enter')
      await expect(input).not.toBeVisible({ timeout: 5000 })

      // Open the file (second treeitem after workspace)
      const treeItem = page.getByRole('treeitem').nth(1)
      await treeItem.click()
      await page.waitForTimeout(200)

      // Verify editor panel is shown
      await expect(page.locator('[data-testid="editor-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="welcome-screen"]')).not.toBeVisible()

      // Act - Close the tab
      const closeButton = page.getByRole('button', { name: /close/i })
      await closeButton.click()
      await page.waitForTimeout(200)

      // Assert - Welcome screen should reappear
      await expect(page.locator('[data-testid="welcome-screen"]')).toBeVisible()
      await expect(page.locator('[data-testid="editor-panel"]')).not.toBeVisible()
    })
  })
})
