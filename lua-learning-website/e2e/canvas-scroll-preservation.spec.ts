import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for scroll position preservation when returning from canvas tab.
 *
 * Issue #371: When the canvas closes, the scroll position in the editor
 * should be restored to where it was before the canvas opened.
 */
test.describe('Canvas Scroll Preservation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for the shell terminal to initialize
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
    // Wait for file tree to be visible
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Expand the workspace folder so files are visible
    await page.getByTestId('folder-chevron').first().click()
  })

  // Helper to create a file with content
  async function createFileWithContent(
    page: import('@playwright/test').Page,
    name: string,
    content: string
  ) {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Use echo to create file with content
    const escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    await terminal.execute(`echo "${escapedContent}" > /workspace/${name}`)
    await page.waitForTimeout(TIMEOUTS.TRANSITION)
  }

  // Helper to open file in editor
  async function openFile(page: import('@playwright/test').Page, name: string) {
    const file = page.getByRole('treeitem', { name: new RegExp(name, 'i') })
    await file.dblclick()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)
  }

  // Generate code with many lines for scrolling
  function generateLongCode(lines: number): string {
    const codeLines: string[] = []
    codeLines.push('-- Long file for scroll testing')
    codeLines.push('')
    for (let i = 1; i <= lines; i++) {
      codeLines.push(`-- Line ${i}: This is line number ${i}`)
      if (i % 10 === 0) {
        codeLines.push(`print("Checkpoint at line ${i}")`)
      }
    }
    codeLines.push('')
    codeLines.push('-- END OF FILE')
    return codeLines.join('\n')
  }

  test('scroll position is preserved when returning from canvas tab', async ({ page }) => {
    const terminal = createTerminalHelper(page)

    // Create a file with many lines to enable scrolling
    const longCode = generateLongCode(100)
    await createFileWithContent(page, 'scroll-test.lua', longCode)

    // Open the file in editor
    await openFile(page, 'scroll-test.lua')

    // Wait for editor to be visible
    const editorPanel = page.getByTestId('editor-panel')
    await expect(editorPanel).toBeVisible()

    // Find the Monaco editor
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible()

    // Scroll down in the editor using keyboard navigation
    // First, click to focus the editor
    await monacoEditor.click()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Use Ctrl+G to go to a specific line (line 50)
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Type the line number and press Enter
    await page.keyboard.type('50')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Verify we're at line 50 by checking the visible line numbers
    // Line 50 should be visible in the viewport
    const lineNumbers = page.locator('.monaco-editor .line-numbers')
    await expect(lineNumbers).toContainText('50')

    // Now start a canvas via the REPL
    await terminal.focus()
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    const stopButton = page.getByRole('button', { name: /stop process/i })
    await expect(stopButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Require canvas and set up quick stop
    await terminal.type('canvas = require("canvas")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.tick(function() if canvas.get_time() > 0.1 then canvas.stop() end end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Start canvas
    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    // Canvas tab should appear
    const canvasTab = page.locator('[class*="canvasTab"]').first()
    await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Wait for canvas to stop and close automatically
    await expect(canvasTab).not.toBeVisible({ timeout: 3000 })

    // Now click on the scroll-test.lua tab to return to it
    const fileTab = page.getByRole('tab', { name: /scroll-test\.lua/i })
    await expect(fileTab).toBeVisible()
    await fileTab.click()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Verify the scroll position is preserved - line 50 should still be visible
    await expect(lineNumbers).toContainText('50', { timeout: TIMEOUTS.ASYNC_OPERATION })
  })

  test('scroll position preserved when canvas is closed via stop button', async ({ page }) => {
    const terminal = createTerminalHelper(page)

    // Create a file with many lines
    const longCode = generateLongCode(100)
    await createFileWithContent(page, 'scroll-test2.lua', longCode)

    // Open the file
    await openFile(page, 'scroll-test2.lua')

    // Wait for editor
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible()

    // Scroll to line 75
    await monacoEditor.click()
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)
    await page.keyboard.type('75')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    const lineNumbers = page.locator('.monaco-editor .line-numbers')
    await expect(lineNumbers).toContainText('75')

    // Start infinite canvas
    await terminal.focus()
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    await terminal.type('canvas = require("canvas")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.tick(function() end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    // Canvas tab should appear
    const canvasTab = page.locator('[class*="canvasTab"]').first()
    await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Click stop button to close canvas
    const stopButton = page.getByRole('button', { name: /stop process/i })
    await expect(stopButton).toBeVisible()
    await stopButton.click()

    // Wait for canvas to close
    await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

    // Return to file tab
    const fileTab = page.getByRole('tab', { name: /scroll-test2\.lua/i })
    await expect(fileTab).toBeVisible()
    await fileTab.click()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Verify line 75 is still visible
    await expect(lineNumbers).toContainText('75', { timeout: TIMEOUTS.ASYNC_OPERATION })
  })

  test('multiple file scroll positions preserved during canvas session', async ({ page }) => {
    const terminal = createTerminalHelper(page)

    // Create two files
    const longCode1 = generateLongCode(100)
    const longCode2 = generateLongCode(100)
    await createFileWithContent(page, 'file1.lua', longCode1)
    await createFileWithContent(page, 'file2.lua', longCode2)

    // Open file1 and scroll to line 25
    await openFile(page, 'file1.lua')
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible()
    await monacoEditor.click()
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)
    await page.keyboard.type('25')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Open file2 and scroll to line 80
    await openFile(page, 'file2.lua')
    await expect(monacoEditor).toBeVisible()
    await monacoEditor.click()
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)
    await page.keyboard.type('80')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Start canvas
    await terminal.focus()
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    await terminal.type('canvas = require("canvas")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.tick(function() if canvas.get_time() > 0.1 then canvas.stop() end end)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    await terminal.type('canvas.start()')
    await terminal.press('Enter')

    // Wait for canvas to complete
    const canvasTab = page.locator('[class*="canvasTab"]').first()
    await expect(canvasTab).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await expect(canvasTab).not.toBeVisible({ timeout: 3000 })

    // Return to file1 and check scroll position
    const file1Tab = page.getByRole('tab', { name: /file1\.lua/i })
    await file1Tab.click()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    const lineNumbers = page.locator('.monaco-editor .line-numbers')
    await expect(lineNumbers).toContainText('25', { timeout: TIMEOUTS.ASYNC_OPERATION })

    // Switch to file2 and check scroll position
    const file2Tab = page.getByRole('tab', { name: /file2\.lua/i })
    await file2Tab.click()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    await expect(lineNumbers).toContainText('80', { timeout: TIMEOUTS.ASYNC_OPERATION })
  })
})
