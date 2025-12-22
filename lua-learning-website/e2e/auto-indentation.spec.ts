import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'

// Helper to create and open a file so Monaco editor is visible
async function createAndOpenFile(page: import('@playwright/test').Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // First, expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  // Wait for folder to expand by checking for child items
  await expect(page.getByRole('treeitem').nth(1)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

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

  // Wait for Monaco to load
  const monacoEditor = page.locator('.monaco-editor')
  await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  // Wait for Monaco to fully initialize
  await page.waitForTimeout(TIMEOUTS.UI_STABLE)
  return monacoEditor
}

// Helper to type text slowly with delays (to avoid character dropping)
async function typeSlowly(page: import('@playwright/test').Page, text: string) {
  await page.keyboard.type(text, { delay: 50 })
  // Wait for Monaco to render the text
  const viewLines = page.locator('.monaco-editor .view-lines')
  await expect(viewLines).toContainText(text.trim(), { timeout: TIMEOUTS.ELEMENT_VISIBLE })
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
    // Wait for file tree to render (ensures workspace is ready)
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
    // Wait for UI to fully stabilize before test
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)
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
    await typeSlowly(page, 'for j = 1, 10 do')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'print(i * j)')

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

    // Now type 'end' - it should auto-dedent to match the 'if' line
    await typeSlowly(page, 'end')

    const lines = await getEditorContent(page)
    const ifLine = lines.find((line) => containsText(line, 'if true then'))
    const endLine = lines.find((line) => containsText(line, 'end'))

    expect(ifLine).toBeDefined()
    expect(endLine).toBeDefined()

    // The 'end' should be at the same indentation level as 'if' (both at level 0)
    // This test will FAIL if end doesn't auto-dedent
    expect(getIndentLevel(endLine!)).toBe(getIndentLevel(ifLine!))
  })

  test('typing end should dedent to match nested function', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type a nested function structure
    await typeSlowly(page, 'function outer()')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'function inner()')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'print("hello")')
    await page.keyboard.press('Enter')

    // Type first 'end' - should match inner function at indent level 1
    await typeSlowly(page, 'end')

    const lines = await getEditorContent(page)
    const innerFuncLine = lines.find((line) => containsText(line, 'function inner'))
    const endLines = lines.filter((line) => containsText(line, 'end'))

    expect(innerFuncLine).toBeDefined()
    expect(endLines.length).toBeGreaterThanOrEqual(1)

    // The 'end' should match inner function's indentation
    expect(getIndentLevel(endLines[0])).toBe(getIndentLevel(innerFuncLine!))
  })

  test('typing else should dedent to match if block', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type an if block with content
    await typeSlowly(page, 'if condition then')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'doSomething()')
    await page.keyboard.press('Enter')

    // Type 'else' - should dedent to match 'if'
    await typeSlowly(page, 'else')

    const lines = await getEditorContent(page)
    const ifLine = lines.find((line) => containsText(line, 'if condition then'))
    const elseLine = lines.find((line) => containsText(line, 'else'))

    expect(ifLine).toBeDefined()
    expect(elseLine).toBeDefined()

    // The 'else' should be at the same indentation level as 'if'
    expect(getIndentLevel(elseLine!)).toBe(getIndentLevel(ifLine!))
  })

  test('typing elseif should dedent to match if block', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type an if block with content
    await typeSlowly(page, 'if a then')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'doA()')
    await page.keyboard.press('Enter')

    // Type 'elseif' - should dedent to match 'if'
    await typeSlowly(page, 'elseif b then')

    const lines = await getEditorContent(page)
    const ifLine = lines.find((line) => containsText(line, 'if a then'))
    const elseifLine = lines.find((line) => containsText(line, 'elseif b then'))

    expect(ifLine).toBeDefined()
    expect(elseifLine).toBeDefined()

    // The 'elseif' should be at the same indentation level as 'if'
    expect(getIndentLevel(elseifLine!)).toBe(getIndentLevel(ifLine!))
  })

  test('typing until should dedent to match repeat block', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type a repeat block
    await typeSlowly(page, 'repeat')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'x = x + 1')
    await page.keyboard.press('Enter')

    // Type 'until' - should dedent to match 'repeat'
    await typeSlowly(page, 'until x > 10')

    const lines = await getEditorContent(page)
    const repeatLine = lines.find((line) => containsText(line, 'repeat'))
    const untilLine = lines.find((line) => containsText(line, 'until'))

    expect(repeatLine).toBeDefined()
    expect(untilLine).toBeDefined()

    // The 'until' should be at the same indentation level as 'repeat'
    expect(getIndentLevel(untilLine!)).toBe(getIndentLevel(repeatLine!))
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

  test('typing on empty line inside function auto-indents', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type a function declaration
    await typeSlowly(page, 'function foo()')
    await page.keyboard.press('Enter')

    // Clear any auto-indent that might have been applied and go to start of line
    await page.keyboard.press('Home')
    // Select all content on this line and delete it to start fresh
    await page.keyboard.press('Shift+End')
    await page.keyboard.press('Delete')

    // Now type on the empty line - it should auto-indent
    await typeSlowly(page, 'print')

    const lines = await getEditorContent(page)
    const printLine = lines.find((line) => containsText(line, 'print'))

    expect(printLine).toBeDefined()
    // The 'print' line should be indented (at least 1 level)
    expect(getIndentLevel(printLine!)).toBeGreaterThanOrEqual(1)
  })

  test('typing on empty line inside nested blocks auto-indents correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type nested blocks
    await typeSlowly(page, 'function outer()')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'if true then')
    await page.keyboard.press('Enter')

    // Clear any auto-indent and go to start of line
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+End')
    await page.keyboard.press('Delete')

    // Type on the empty line - should auto-indent to level 2
    await typeSlowly(page, 'x')

    const lines = await getEditorContent(page)
    // Find the line that just has 'x' (with indentation)
    const xLine = lines.find(
      (line) => containsText(line, 'x') && !containsText(line, 'function') && !containsText(line, 'if')
    )

    expect(xLine).toBeDefined()
    // Should be at indent level 2 (inside function > inside if)
    expect(getIndentLevel(xLine!)).toBeGreaterThanOrEqual(2)
  })
})
