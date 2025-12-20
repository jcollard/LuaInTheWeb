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
  test('scroll position preserved after Ctrl+C with focus in shell (Issue #371)', async ({
    page,
  }) => {
    // This test replicates the bug reproduction steps from Issue #371:
    // 1. Open a lua file and scroll to line 50
    // 2. Start a canvas via the REPL
    // 3. Click into the shell
    // 4. Press Ctrl + C
    // 5. Canvas tab disappears
    // 6. File should still be scrolled to line 50 (was resetting to line 1)

    const terminal = createTerminalHelper(page)

    // Navigate to editor
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="shell-terminal-container"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()

    // Find and expand examples workspace
    const examplesWorkspace = page.getByRole('treeitem', { name: /^examples$/i })
    await expect(examplesWorkspace).toBeVisible()
    await examplesWorkspace.getByTestId('folder-chevron').click()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Open adventure.lua - it has 408 lines, plenty for scroll testing
    const adventureFile = page.getByRole('treeitem', { name: 'adventure.lua' })
    await expect(adventureFile).toBeVisible()
    await adventureFile.dblclick()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible()

    // Scroll to line 50
    await monacoEditor.click()
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)
    await page.keyboard.type('50')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // Wait for line 50 to be visible in the editor
    const line50 = page.locator('.monaco-editor .line-numbers').filter({ hasText: /^50$/ })
    await expect(line50).toBeVisible()

    // Start an infinite canvas
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

    // KEY STEP: Click into the shell (focus the terminal)
    await terminal.focus()
    await page.waitForTimeout(TIMEOUTS.ANIMATION)

    // KEY STEP: Press Ctrl+C to stop the process
    await page.keyboard.press('Control+c')

    // Wait for canvas to close
    await expect(canvasTab).not.toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

    // Wait for editor to be visible again (focus remains in shell)
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })

    // Give editor time to restore scroll position
    await page.waitForTimeout(1000)

    // Scroll position should be preserved at line 50
    await expect(line50).toBeVisible({ timeout: TIMEOUTS.ASYNC_OPERATION })
  })
})
