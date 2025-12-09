import { test, expect } from '@playwright/test'

test.describe('EmbeddableEditor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/embeddable-editor')
    // Wait for Monaco editor to be visible with extended timeout for slow CI environments
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30000 })
    // Wait for Lua WASM engine to initialize (no UI indicator, so we wait a bit)
    await page.waitForTimeout(1000)
  })

  test('renders Monaco editor', async ({ page }) => {
    // Monaco editor should be visible (already verified in beforeEach, but check again for test assertion)
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30000 })
  })

  test('executes Lua code and shows output', async ({ page }) => {
    // Click the Run button
    await page.click('button:has-text("Run")')

    // Wait for output to appear (with extended timeout for execution)
    const outputPanel = page.locator('[data-testid="output-panel"]').first()
    await expect(outputPanel).toContainText('Hello from Lua!', { timeout: 10000 })
  })

  test('Ctrl+Enter executes code', async ({ page }) => {
    // Focus the Monaco editor's internal textarea (where keystrokes are captured)
    const monacoTextarea = page.locator('.monaco-editor textarea').first()
    await monacoTextarea.focus()
    await page.keyboard.press('Control+Enter')

    // Wait for output (with extended timeout)
    const outputPanel = page.locator('[data-testid="output-panel"]').first()
    await expect(outputPanel).toContainText('Hello from Lua!', { timeout: 10000 })
  })

  test('Reset button restores initial code', async ({ page }) => {
    // Type some new code in the editor
    await page.locator('.monaco-editor').first().click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('print("modified")')

    // Click Reset button
    await page.click('button:has-text("Reset")')

    // Wait a bit for reset to take effect
    await page.waitForTimeout(500)

    // The editor should contain the original code
    const editorContent = page.locator('.monaco-editor').first()
    await expect(editorContent).toContainText('Hello from Lua!')
  })

  test('displays Lua errors without crashing', async ({ page }) => {
    // Type invalid Lua code
    await page.locator('.monaco-editor').first().click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('invalid lua syntax !!!')

    // Click Run
    await page.click('button:has-text("Run")')

    // Output should show an error message (case insensitive check)
    const outputPanel = page.locator('[data-testid="output-panel"]').first()
    await expect(outputPanel).toContainText(/error/i, { timeout: 10000 })
  })
})
