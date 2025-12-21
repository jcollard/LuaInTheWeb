import { test, expect } from '@playwright/test'

// Helper to wait for Monaco editor to be ready
async function waitForMonacoReady(page: import('@playwright/test').Page) {
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 })
  // Wait a bit for Monaco to fully initialize
  await page.waitForTimeout(500)
}

// Helper to get the current scroll line number from Monaco
async function getCurrentScrollLine(page: import('@playwright/test').Page): Promise<number> {
  // Monaco shows line numbers - find the first visible line number
  const lineNumber = await page.evaluate(() => {
    const editor = (window as unknown as { monaco?: { editor?: { getEditors?: () => { getVisibleRanges?: () => { startLineNumber: number }[] }[] } } }).monaco?.editor?.getEditors?.()[0]
    if (editor && typeof editor.getVisibleRanges === 'function') {
      const ranges = editor.getVisibleRanges()
      return ranges[0]?.startLineNumber ?? 1
    }
    return 1
  })
  return lineNumber
}

// Helper to scroll to a specific line in Monaco
async function scrollToLine(page: import('@playwright/test').Page, lineNumber: number) {
  await page.evaluate((line) => {
    const editor = (window as unknown as { monaco?: { editor?: { getEditors?: () => { revealLineInCenter?: (line: number) => void }[] } } }).monaco?.editor?.getEditors?.()[0]
    if (editor && typeof editor.revealLineInCenter === 'function') {
      editor.revealLineInCenter(line)
    }
  }, lineNumber)
  // Wait for scroll to complete
  await page.waitForTimeout(300)
}

test.describe('Scroll Position Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for initial load
    await page.waitForTimeout(1000)
  })

  test('should maintain separate scroll positions for different editor tabs', async ({ page }) => {
    // Step 1: Expand libs workspace and open canvas.lua
    const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
    await libsWorkspace.getByTestId('folder-chevron').click()
    await page.waitForTimeout(300)

    // Open canvas.lua
    await page.getByRole('treeitem', { name: 'canvas.lua' }).dblclick()
    await waitForMonacoReady(page)

    // Step 2: Scroll down to line 100
    await scrollToLine(page, 100)
    await page.waitForTimeout(300)
    const canvasScrollLine = await getCurrentScrollLine(page)
    expect(canvasScrollLine).toBeGreaterThanOrEqual(80) // Should be around line 100

    // Step 3: Open shell.lua (same workspace, already expanded)
    await page.getByRole('treeitem', { name: 'shell.lua' }).dblclick()
    await waitForMonacoReady(page)
    await page.waitForTimeout(500)

    // shell.lua should start at line 1, NOT at line 100
    const shellScrollLine = await getCurrentScrollLine(page)
    expect(shellScrollLine).toBeLessThanOrEqual(10) // Should be near line 1

    // Step 4: Go back to canvas.lua - should still be at line 100
    const canvasTab = page.locator('[role="tab"]', { hasText: 'canvas.lua' })
    await canvasTab.click()
    await page.waitForTimeout(500)

    const canvasScrollLineAfter = await getCurrentScrollLine(page)
    expect(canvasScrollLineAfter).toBeGreaterThanOrEqual(80) // Should still be around line 100
  })

  test('should restore scroll position after viewing markdown and returning', async ({ page }) => {
    // Step 1: Expand libs workspace and open canvas.lua
    const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
    await libsWorkspace.getByTestId('folder-chevron').click()
    await page.waitForTimeout(300)

    await page.getByRole('treeitem', { name: 'canvas.lua' }).dblclick()
    await waitForMonacoReady(page)

    // Step 2: Scroll down to line 100
    await scrollToLine(page, 100)
    await page.waitForTimeout(300)
    const initialScrollLine = await getCurrentScrollLine(page)
    expect(initialScrollLine).toBeGreaterThanOrEqual(80) // Should be around line 100

    // Step 3: Open a markdown file (docs workspace)
    const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
    await docsWorkspace.getByTestId('folder-chevron').click()
    await page.waitForTimeout(300)

    await page.getByRole('treeitem', { name: 'shell.md' }).dblclick()
    await page.waitForTimeout(500)

    // Wait for markdown viewer
    await expect(page.getByTestId('markdown-viewer')).toBeVisible({ timeout: 10000 })

    // Step 4: Go back to canvas.lua tab
    const canvasTab = page.locator('[role="tab"]', { hasText: 'canvas.lua' })
    await canvasTab.click()
    await page.waitForTimeout(500)

    // Step 5: canvas.lua should be shown at line 100
    const restoredScrollLine = await getCurrentScrollLine(page)
    expect(restoredScrollLine).toBeGreaterThanOrEqual(80) // Should be back at line 100
  })

  test('should maintain scroll position after clicking back and forth between code and markdown tabs 5 times', async ({ page }) => {
    // Step 1: Expand libs workspace and open shell.lua
    const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
    await libsWorkspace.getByTestId('folder-chevron').click()
    await page.waitForTimeout(300)

    await page.getByRole('treeitem', { name: 'shell.lua' }).dblclick()
    await waitForMonacoReady(page)

    // Step 2: Scroll down to line 100
    await scrollToLine(page, 100)
    await page.waitForTimeout(300)
    const initialScrollLine = await getCurrentScrollLine(page)
    expect(initialScrollLine).toBeGreaterThanOrEqual(80) // Should be around line 100

    // Step 3: Open a markdown file
    const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
    await docsWorkspace.getByTestId('folder-chevron').click()
    await page.waitForTimeout(300)

    await page.getByRole('treeitem', { name: 'canvas.md' }).dblclick()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('markdown-viewer')).toBeVisible({ timeout: 10000 })

    // Step 4: Click back and forth 5 times (user reported this reproduces the bug)
    const shellTab = page.locator('[role="tab"]', { hasText: 'shell.lua' })
    const canvasTab = page.locator('[role="tab"]', { hasText: 'canvas.md' })

    for (let i = 0; i < 5; i++) {
      // Click shell.lua tab
      await shellTab.click()
      await page.waitForTimeout(200) // Shorter wait to simulate quick clicking

      // Verify scroll position is still around line 100
      const scrollLine = await getCurrentScrollLine(page)
      expect(scrollLine).toBeGreaterThanOrEqual(70) // Allow some tolerance

      // Click canvas.md tab
      await canvasTab.click()
      await page.waitForTimeout(200)
    }

    // Final verification: shell.lua should still be at line 100
    await shellTab.click()
    await page.waitForTimeout(500)
    const finalScrollLine = await getCurrentScrollLine(page)
    expect(finalScrollLine).toBeGreaterThanOrEqual(80) // Should still be around line 100
  })
})
