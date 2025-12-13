import { test, expect } from '@playwright/test'

test.describe('Workspace UI', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test.describe('workspace display', () => {
    test('displays default workspace as root folder in tree', async ({ page }) => {
      // Assert - Default workspace (my-files) should be visible in the file tree
      // Workspaces appear as root-level folders with workspace icon
      await expect(page.getByRole('treeitem', { name: /my-files/i })).toBeVisible()
    })

    test('shows workspace icon for workspace folders', async ({ page }) => {
      // Assert - Workspace should have the workspace icon (virtual for default workspace)
      await expect(page.getByTestId('virtual-workspace-icon')).toBeVisible()
    })

    test('displays add workspace button in toolbar', async ({ page }) => {
      // Assert - Add workspace button should be visible in the toolbar
      await expect(page.getByRole('button', { name: /add workspace/i })).toBeVisible()
    })
  })

  test.describe('add workspace dialog', () => {
    test('opens add workspace dialog when add button is clicked', async ({ page }) => {
      // Act - Click add workspace button
      await page.getByRole('button', { name: /add workspace/i }).click()

      // Assert - Dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Add Workspace')).toBeVisible()
    })

    test('dialog has virtual workspace option selected by default', async ({ page }) => {
      // Act - Open dialog
      await page.getByRole('button', { name: /add workspace/i }).click()

      // Assert - Virtual workspace radio should be checked
      const virtualRadio = page.getByRole('radio', { name: /virtual workspace/i })
      await expect(virtualRadio).toBeVisible()
      await expect(virtualRadio).toBeChecked()
    })

    test('can close dialog with cancel button', async ({ page }) => {
      // Arrange - Open dialog
      await page.getByRole('button', { name: /add workspace/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Act - Click cancel
      await page.getByRole('button', { name: /cancel/i }).click()

      // Assert - Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('can close dialog with escape key', async ({ page }) => {
      // Arrange - Open dialog
      await page.getByRole('button', { name: /add workspace/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Act - Press escape
      await page.keyboard.press('Escape')

      // Assert - Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('can create virtual workspace', async ({ page }) => {
      // Act - Open dialog, enter name, create
      await page.getByRole('button', { name: /add workspace/i }).click()

      const input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('my-test')
      await page.getByRole('button', { name: /create/i }).click()

      // Assert - Dialog closes and new workspace folder appears in tree
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await expect(page.getByRole('treeitem', { name: /my-test/i })).toBeVisible()
    })

    test('create button is disabled when name is empty', async ({ page }) => {
      // Act - Open dialog and clear name
      await page.getByRole('button', { name: /add workspace/i }).click()

      const input = page.getByLabel(/workspace name/i)
      await input.clear()

      // Assert - Create button should be disabled
      await expect(page.getByRole('button', { name: /create/i })).toBeDisabled()
    })
  })

  test.describe('workspace management', () => {
    test('can add multiple workspaces', async ({ page }) => {
      // Act - Add two workspaces
      await page.getByRole('button', { name: /add workspace/i }).click()
      let input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('workspace-1')
      await page.getByRole('button', { name: /create/i }).click()

      await page.getByRole('button', { name: /add workspace/i }).click()
      input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('workspace-2')
      await page.getByRole('button', { name: /create/i }).click()

      // Assert - Both workspaces should be visible as root-level folders
      await expect(page.getByRole('treeitem', { name: /workspace-1/i })).toBeVisible()
      await expect(page.getByRole('treeitem', { name: /workspace-2/i })).toBeVisible()
    })

    test('workspaces display with workspace icon', async ({ page }) => {
      // Arrange - Add a new workspace
      await page.getByRole('button', { name: /add workspace/i }).click()
      const input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('test-workspace')
      await page.getByRole('button', { name: /create/i }).click()

      // Assert - Multiple workspace icons should be visible (default + new, both virtual)
      const workspaceIcons = page.getByTestId('virtual-workspace-icon')
      await expect(workspaceIcons).toHaveCount(2)
    })
  })

  test.describe('accessibility', () => {
    test('file tree uses tree role', async ({ page }) => {
      await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    })

    test('workspaces use treeitem role', async ({ page }) => {
      // Default workspace should be a treeitem
      await expect(page.getByRole('treeitem', { name: /my-files/i })).toBeVisible()
    })

    test('add workspace dialog is accessible', async ({ page }) => {
      // Open dialog
      await page.getByRole('button', { name: /add workspace/i }).click()

      // Assert - Dialog has proper ARIA attributes
      const dialog = page.getByRole('dialog')
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      await expect(dialog).toHaveAttribute('aria-labelledby')

      // Check dialog title is visible
      await expect(page.getByText('Add Workspace')).toBeVisible()
    })
  })
})
