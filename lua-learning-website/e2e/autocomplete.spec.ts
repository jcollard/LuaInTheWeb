import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'
import { createAndOpenFile } from './helpers/editor'

test.describe('IDE Editor - Autocomplete Behavior', () => {
  test.beforeEach(async ({ editorPage: page }) => {
    // Create and open a file so Monaco editor is visible
    await createAndOpenFile(page)
    // Wait for Monaco to load
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  })

  test('autocomplete does not appear automatically while typing', async ({ editorPage: page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // Type a Lua keyword prefix slowly to ensure Monaco processes each character
    await page.keyboard.type('pri', { delay: 50 })
    // Wait for Monaco to stabilize
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Give autocomplete time to appear (if it would) - use longer timeout for negative test
    await page.waitForTimeout(TIMEOUTS.INIT)

    // Autocomplete popup (suggest-widget) should NOT be visible
    const suggestWidget = page.locator('.monaco-editor .suggest-widget')
    await expect(suggestWidget).not.toBeVisible()
  })

  test('autocomplete appears when Ctrl+Space is pressed', async ({ editorPage: page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()
    // Ensure editor is focused
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Type some text first slowly
    await page.keyboard.type('pri', { delay: 50 })
    // Wait for Monaco to stabilize
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Press Ctrl+Space to trigger autocomplete
    await page.keyboard.press('Control+Space')

    // Autocomplete popup (suggest-widget) should be visible
    // Use a more specific selector that Monaco uses for visible suggestions
    const suggestWidget = page.locator('.monaco-editor .suggest-widget')
    await expect(suggestWidget).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    // Also verify it has the visible class (Monaco adds this when widget is active)
    await expect(suggestWidget).toHaveClass(/visible/, { timeout: TIMEOUTS.ASYNC_OPERATION })
  })

  test('autocomplete does not appear on trigger characters like dot', async ({ editorPage: page }) => {
    // Click on the editor to focus it
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()
    // Ensure editor is focused
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Type something that would trigger autocomplete on '.' if enabled
    // Type slowly to ensure Monaco processes each character
    await page.keyboard.type('string.', { delay: 50 })
    // Wait for Monaco to stabilize after typing the dot
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Give autocomplete time to appear (if it would) - use longer timeout for negative test
    await page.waitForTimeout(TIMEOUTS.INIT)

    // Autocomplete popup should NOT be visible (since suggestOnTriggerCharacters is false)
    const suggestWidget = page.locator('.monaco-editor .suggest-widget')
    await expect(suggestWidget).not.toBeVisible()
  })
})
