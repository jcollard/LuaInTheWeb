import { test, expect } from '@playwright/test'

test.describe('Workspace UI', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test.describe('workspace tabs', () => {
    test('displays workspace tabs in file explorer', async ({ page }) => {
      // Assert - Workspace tabs should be visible in the sidebar
      await expect(page.getByTestId('workspace-tabs')).toBeVisible()
    })

    test('shows default workspace tab', async ({ page }) => {
      // Assert - At least one workspace tab should be visible
      const tabs = page.getByRole('tablist', { name: 'Workspaces' })
      await expect(tabs).toBeVisible()
      await expect(tabs.getByRole('tab')).toBeVisible()
    })

    test('displays add workspace button', async ({ page }) => {
      // Assert - Add workspace button should be visible
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
      await input.fill('My Test Workspace')
      await page.getByRole('button', { name: /create/i }).click()

      // Assert - Dialog closes and new workspace tab appears
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await expect(page.getByRole('tab', { name: /My Test Workspace/i })).toBeVisible()
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
      await input.fill('Workspace 1')
      await page.getByRole('button', { name: /create/i }).click()

      await page.getByRole('button', { name: /add workspace/i }).click()
      input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('Workspace 2')
      await page.getByRole('button', { name: /create/i }).click()

      // Assert - Both workspace tabs should be visible
      await expect(page.getByRole('tab', { name: /Workspace 1/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Workspace 2/i })).toBeVisible()
    })

    test('shows close button when multiple workspaces exist', async ({ page }) => {
      // Arrange - Add a second workspace
      await page.getByRole('button', { name: /add workspace/i }).click()
      const input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('Second Workspace')
      await page.getByRole('button', { name: /create/i }).click()

      // Assert - Close buttons should be visible
      const closeButtons = page.getByRole('button', { name: /close/i })
      await expect(closeButtons.first()).toBeVisible()
    })

    test('can close workspace by clicking close button', async ({ page }) => {
      // Arrange - Add a second workspace
      await page.getByRole('button', { name: /add workspace/i }).click()
      const input = page.getByLabel(/workspace name/i)
      await input.clear()
      await input.fill('Temporary Workspace')
      await page.getByRole('button', { name: /create/i }).click()
      await expect(page.getByRole('tab', { name: /Temporary Workspace/i })).toBeVisible()

      // Act - Click close on the new workspace
      const closeButton = page.getByRole('button', { name: /close temporary workspace/i })
      await closeButton.click()

      // Assert - Workspace tab should be removed
      await expect(page.getByRole('tab', { name: /Temporary Workspace/i })).not.toBeVisible()
    })

    test('cannot close last workspace (no close button)', async ({ page }) => {
      // Assert - With only one workspace, no close button should be visible
      await expect(page.getByRole('button', { name: /close/i })).not.toBeVisible()
    })
  })

  test.describe('accessibility', () => {
    test('workspace tabs use tablist role', async ({ page }) => {
      await expect(page.getByRole('tablist', { name: 'Workspaces' })).toBeVisible()
    })

    test('individual tabs use tab role', async ({ page }) => {
      const tabs = page.getByRole('tablist', { name: 'Workspaces' })
      await expect(tabs.getByRole('tab').first()).toBeVisible()
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
