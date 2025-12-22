import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // First, expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  await page.waitForTimeout(TIMEOUTS.ANIMATION) // Wait for expansion animation

  // Now click New File button - the file will be created inside the expanded workspace
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE }) // Wait for rename input to appear
  await input.press('Enter') // Accept default name
  await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE }) // Wait for rename to complete

  // Click the newly created file to open it (should be second treeitem after workspace)
  const fileItems = page.getByRole('treeitem')
  const count = await fileItems.count()
  if (count > 1) {
    await fileItems.nth(1).click() // Click the file inside the workspace
  } else {
    // Fallback: click first item
    await fileItems.first().click()
  }
  await page.waitForTimeout(TIMEOUTS.ANIMATION)
}

test.describe('Theme - Monaco Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    // Wait for IDE layout to be ready
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render (ensures workspace is ready)
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Wait for async workspaces to finish loading to avoid race conditions
    await expect(page.getByTestId('library-workspace-icon')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('Monaco editor uses vs-dark theme in dark mode', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor to be visible
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Monaco adds theme class to the editor element
    // vs-dark theme adds 'vs-dark' class
    await expect(monacoEditor).toHaveClass(/vs-dark/)
  })

  test('Monaco editor uses vs theme in light mode', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor to be visible
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // vs (light) theme should NOT have vs-dark class
    await expect(monacoEditor).not.toHaveClass(/vs-dark/)
  })

  test('Monaco editor background matches theme in dark mode', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Check background color - vs-dark uses #1e1e1e
    const bgColor = await monacoEditor.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // #1e1e1e = rgb(30, 30, 30)
    expect(bgColor).toBe('rgb(30, 30, 30)')
  })

  test('Monaco editor background matches theme in light mode', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()

    // Create and open a file to show Monaco editor
    await createAndOpenFile(page)

    // Wait for Monaco editor
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Check background color - vs (light) uses #fffffe (near white)
    const bgColor = await monacoEditor.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // Monaco vs light theme uses #fffffe = rgb(255, 255, 254)
    expect(bgColor).toBe('rgb(255, 255, 254)')
  })

  test('Monaco editor theme persists after page reload', async ({ page }) => {
    // Helper to open shell.lua from libs workspace (always exists, no file creation needed)
    async function openShellLua() {
      // Wait for libs workspace to be visible
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await expect(libsWorkspace).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Check if shell.lua is already visible (libs already expanded)
      const shellLuaItem = page.getByRole('treeitem', { name: 'shell.lua' })
      const isShellVisible = await shellLuaItem.isVisible().catch(() => false)

      if (!isShellVisible) {
        // Expand libs folder by clicking its chevron
        await libsWorkspace.getByTestId('folder-chevron').click()
        await page.waitForTimeout(TIMEOUTS.ANIMATION)
        await expect(shellLuaItem).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      }

      // Click shell.lua to open it
      await shellLuaItem.click()

      // Wait for Monaco editor to fully load (not just "Loading editor...")
      const monacoEditor = page.locator('.monaco-editor')
      await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    }

    // Start in dark mode
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'dark'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for async workspaces to finish loading
    await expect(page.getByTestId('library-workspace-icon')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Open shell.lua to show Monaco editor
    await openShellLua()

    // Wait for Monaco editor and verify dark theme
    let monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await expect(monacoEditor).toHaveClass(/vs-dark/)

    // Change theme to light and reload (simulating user switching themes)
    await page.evaluate(() => localStorage.setItem('lua-ide-theme', 'light'))
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for async workspaces to finish loading after second reload
    await expect(page.getByTestId('library-workspace-icon')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Open shell.lua again
    await openShellLua()

    // Monaco should now have vs (light) theme
    monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await expect(monacoEditor).not.toHaveClass(/vs-dark/)
  })
})
