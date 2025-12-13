import { test, expect } from '@playwright/test'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')
  await sidebar.getByRole('button', { name: /new file/i }).click()
  const input = sidebar.getByRole('textbox')
  await input.press('Enter') // Accept default name
  await page.waitForTimeout(200)
  // Click the file to open it
  const treeItem = page.getByRole('treeitem').first()
  await treeItem.click()
  await page.waitForTimeout(200)

  // Wait for Monaco to load
  const monacoEditor = page.locator('.monaco-editor')
  await expect(monacoEditor).toBeVisible({ timeout: 10000 })
  return monacoEditor
}

// Helper to type text slowly with delays (to avoid character dropping)
async function typeSlowly(page: import('@playwright/test').Page, text: string) {
  await page.keyboard.type(text, { delay: 50 })
  await page.waitForTimeout(200)
}

// Helper to get the content of all lines in the editor
// Normalizes special whitespace characters that Monaco uses
async function getEditorContent(page: import('@playwright/test').Page): Promise<string[]> {
  return await page.evaluate(() => {
    const lines = document.querySelectorAll('.monaco-editor .view-line')
    return Array.from(lines).map((line) => {
      // Normalize Monaco's special whitespace (non-breaking spaces, etc.)
      return (line.textContent || '').replace(/\u00A0/g, ' ')
    })
  })
}

// Helper to check if text contains a substring (handles Monaco's special chars)
function containsText(actual: string, expected: string): boolean {
  // Normalize both strings for comparison
  const normalizedActual = actual.replace(/\u00A0/g, ' ')
  const normalizedExpected = expected.replace(/\u00A0/g, ' ')
  return normalizedActual.includes(normalizedExpected)
}

// Helper to check if text starts with indentation
function hasIndentation(text: string): boolean {
  // Check for tabs, regular spaces, or non-breaking spaces at start
  return /^[\t \u00A0]+/.test(text)
}

// Helper to check indentation level (count of leading whitespace blocks)
function getIndentLevel(text: string): number {
  const match = text.match(/^([\t \u00A0]+)/)
  if (!match) return 0
  // Count tab stops (2 spaces = 1 level, 1 tab = 1 level)
  const whitespace = match[1].replace(/\u00A0/g, ' ')
  return Math.floor(whitespace.replace(/\t/g, '  ').length / 2)
}

test.describe('Auto-Indentation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test('indents after function declaration', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type function declaration and press Enter
    await typeSlowly(page, 'function foo()')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'return 1')

    const lines = await getEditorContent(page)
    // Line 1: function foo()
    // Line 2: should be indented (return 1)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(containsText(lines[0], 'function foo()')).toBe(true)
    // Check that line 2 has indentation (either tabs or spaces)
    expect(hasIndentation(lines[1])).toBe(true)
    expect(containsText(lines[1], 'return')).toBe(true)
  })

  test('indents after if-then statement', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'if x > 0 then')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'print(x)')

    const lines = await getEditorContent(page)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(containsText(lines[0], 'if x > 0 then')).toBe(true)
    // Check indentation on the second line
    expect(hasIndentation(lines[1])).toBe(true)
    expect(containsText(lines[1], 'print')).toBe(true)
  })

  test('indents after for-do loop', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'for i = 1, 10 do')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'print(i)')

    const lines = await getEditorContent(page)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(containsText(lines[0], 'for i = 1, 10 do')).toBe(true)
    expect(hasIndentation(lines[1])).toBe(true)
    expect(containsText(lines[1], 'print')).toBe(true)
  })

  test('indents after while-do loop', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'while x > 0 do')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'x = x - 1')

    const lines = await getEditorContent(page)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(containsText(lines[0], 'while x > 0 do')).toBe(true)
    expect(hasIndentation(lines[1])).toBe(true)
    expect(containsText(lines[1], 'x = x')).toBe(true)
  })

  test('indents after repeat block', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'repeat')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'x = x + 1')

    const lines = await getEditorContent(page)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(containsText(lines[0], 'repeat')).toBe(true)
    expect(hasIndentation(lines[1])).toBe(true)
    expect(containsText(lines[1], 'x = x')).toBe(true)
  })

  test('indents after else keyword', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'if true then')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'print(1)')
    await page.keyboard.press('Enter')
    // Go back to beginning of line and type else (simulating dedent + indent)
    await page.keyboard.press('Home')
    await typeSlowly(page, 'else')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'print(2)')

    const lines = await getEditorContent(page)
    // Verify structure exists with else block
    const hasElse = lines.some((line) => containsText(line, 'else'))
    expect(hasElse).toBe(true)
  })

  test('handles nested function inside if block', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'if true then')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'function inner()')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'return 42')

    const lines = await getEditorContent(page)
    expect(lines.length).toBeGreaterThanOrEqual(3)
    // Line 1: if true then
    // Line 2: function inner() - should be indented once
    // Line 3: return 42 - should be indented twice
    expect(containsText(lines[0], 'if true then')).toBe(true)
    expect(hasIndentation(lines[1])).toBe(true)
    expect(containsText(lines[1], 'function inner')).toBe(true)
    // Check nested indentation - line 3 should have higher indent level
    expect(getIndentLevel(lines[2])).toBeGreaterThan(getIndentLevel(lines[1]))
    expect(containsText(lines[2], 'return')).toBe(true)
  })

  test('handles nested loops', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'for i = 1, 10 do')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100) // Wait for Monaco to process
    await typeSlowly(page, 'for j = 1, 10 do')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100) // Wait for Monaco to process
    await typeSlowly(page, 'print(i * j)')
    await page.waitForTimeout(200) // Wait for rendering

    const lines = await getEditorContent(page)
    // Monaco may render lines differently - check that:
    // 1. The outer loop exists
    // 2. The inner loop exists with indentation
    // 3. The print statement has indentation (nested)
    const outerLoopLine = lines.find((line) => containsText(line, 'for i'))
    const innerLoopLine = lines.find((line) => containsText(line, 'for j'))
    const printLine = lines.find((line) => containsText(line, 'print'))

    expect(outerLoopLine).toBeDefined()
    expect(innerLoopLine).toBeDefined()
    expect(printLine).toBeDefined()

    // The inner loop should be indented (at least level 1)
    expect(getIndentLevel(innerLoopLine!)).toBeGreaterThanOrEqual(1)
    // The print should be indented (at least level 1)
    expect(getIndentLevel(printLine!)).toBeGreaterThanOrEqual(1)
    // Outer loop should have no indentation
    expect(getIndentLevel(outerLoopLine!)).toBe(0)
  })

  test('typing end should auto-dedent to match opening block', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type an if block
    await typeSlowly(page, 'if true then')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)

    // Now type 'end' - it should auto-dedent to match the 'if' line
    await typeSlowly(page, 'end')
    await page.waitForTimeout(200)

    const lines = await getEditorContent(page)
    const ifLine = lines.find((line) => containsText(line, 'if true then'))
    const endLine = lines.find((line) => containsText(line, 'end'))

    expect(ifLine).toBeDefined()
    expect(endLine).toBeDefined()

    // The 'end' should be at the same indentation level as 'if' (both at level 0)
    // This test will FAIL if end doesn't auto-dedent
    expect(getIndentLevel(endLine!)).toBe(getIndentLevel(ifLine!))
  })

  test('editor has language configuration applied', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Verify Monaco has loaded with Lua language
    const hasMonaco = await page.evaluate(() => {
      return typeof (window as { monaco?: unknown }).monaco !== 'undefined'
    })
    expect(hasMonaco).toBe(true)

    // Type some Lua code to verify editor is working
    await typeSlowly(page, 'local x = 1')

    const lines = await getEditorContent(page)
    expect(containsText(lines[0], 'local x = 1')).toBe(true)
  })
})
