/**
 * E2E tests for canvas tab functionality.
 * Tests the "Run Canvas" button and canvas tab behavior.
 */
import { test, expect } from '@playwright/test'

// Helper to create and open a file so Monaco editor is visible
// Copied from ide-editor.spec.ts
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // First, expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  await page.waitForTimeout(200) // Wait for expansion animation

  // Now click New File button - the file will be created inside the expanded workspace
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: 5000 }) // Wait for rename input to appear
  await input.press('Enter') // Accept default name
  await expect(input).not.toBeVisible({ timeout: 5000 }) // Wait for rename to complete

  // Click the newly created file to open it (should be second treeitem after workspace)
  const fileItems = page.getByRole('treeitem')
  const count = await fileItems.count()
  if (count > 1) {
    await fileItems.nth(1).click() // Click the file inside the workspace
  } else {
    // Fallback: click first item
    await fileItems.first().click()
  }
  await page.waitForTimeout(200)
}

test.describe('Canvas Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render (ensures workspace is ready)
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
  })

  test('Run Canvas button appears in toolbar when file is open', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')
    await expect(editorPanel).toBeVisible()

    // Run Canvas button should be visible in the editor panel toolbar
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })
    await expect(runCanvasButton).toBeVisible()
  })

  test('Run Canvas button is disabled when code is empty', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')

    // Run Canvas button should be disabled with empty code
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })
    await expect(runCanvasButton).toBeDisabled()
  })

  test('Run Canvas button is enabled when code has content', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')

    // Click on editor and type code
    await monacoEditor.click()
    await page.keyboard.type('print("hello")')
    await page.waitForTimeout(200)

    // Run Canvas button should now be enabled
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })
    await expect(runCanvasButton).toBeEnabled()
  })

  test('clicking Run Canvas opens a canvas tab', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')

    // Type some code
    await monacoEditor.click()
    await page.keyboard.type('x=1')
    await page.waitForTimeout(300)

    // Click Run Canvas
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })
    await runCanvasButton.click()

    // A canvas tab should appear - canvas element in the page
    const canvas = page.locator('canvas[aria-label="Canvas game"]')
    await expect(canvas).toBeVisible({ timeout: 5000 })
  })

  test('canvas tab has Stop button when running', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')

    // Type some code
    await monacoEditor.click()
    await page.keyboard.type('print("stop test")')
    await page.waitForTimeout(200)

    // Click Run Canvas
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })
    await runCanvasButton.click()

    // Wait for canvas to appear
    const canvas = page.locator('canvas[aria-label="Canvas game"]')
    await expect(canvas).toBeVisible({ timeout: 5000 })

    // Stop button should be visible in the canvas panel
    const stopButton = page.getByRole('button', { name: /stop game/i })
    await expect(stopButton).toBeVisible({ timeout: 5000 })
  })

  test('Format button coexists with Run Canvas button', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')

    // Type some code
    await monacoEditor.click()
    await page.keyboard.type('print("format test")')
    await page.waitForTimeout(200)

    // Both Format and Run Canvas buttons should be visible in editor toolbar
    const formatButton = editorPanel.getByRole('button', { name: /format/i })
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })

    await expect(formatButton).toBeVisible()
    await expect(runCanvasButton).toBeVisible()
  })

  test('can close canvas tab', async ({ page }) => {
    // Create and open a file to show the editor
    await createAndOpenFile(page)

    // Wait for Monaco to load
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible({ timeout: 10000 })

    // Get the editor panel
    const editorPanel = page.getByTestId('editor-panel')

    // Type some code
    await monacoEditor.click()
    await page.keyboard.type('print("close test")')
    await page.waitForTimeout(200)

    // Click Run Canvas
    const runCanvasButton = editorPanel.getByRole('button', { name: /run canvas/i })
    await runCanvasButton.click()

    // Wait for canvas to appear
    const canvas = page.locator('canvas[aria-label="Canvas game"]')
    await expect(canvas).toBeVisible({ timeout: 5000 })

    // Find the Canvas tab button and click its close area
    const canvasTab = page.locator('button:has-text("Canvas")')
    await expect(canvasTab).toBeVisible()

    // Click the × inside the Canvas tab (the close area)
    const canvasTabClose = canvasTab.locator(':text("×")')
    await canvasTabClose.click()
    await page.waitForTimeout(300)

    // Canvas should no longer be visible
    await expect(canvas).not.toBeVisible()
  })
})
