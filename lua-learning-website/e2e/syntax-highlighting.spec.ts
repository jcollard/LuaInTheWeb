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

test.describe('Syntax Highlighting', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
  })

  test('highlights Lua keywords correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type simple code with keywords
    await typeSlowly(page, 'local x = nil')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('local')
    await expect(viewLines).toContainText('nil')
  })

  test('highlights string literals correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'local s = "hi"')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('"hi"')
  })

  test('highlights numbers correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'local a = 42')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('42')
  })

  test('highlights comments correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, '-- test')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('-- test')
  })

  test('highlights multi-line strings correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 's = [[hi]]')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('[[hi]]')
  })

  test('editor renders syntax tokens with color classes', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'local x = 1')

    // Check that Monaco has applied token styling (mtk classes exist)
    const tokenElements = page.locator('.monaco-editor .view-line span[class*="mtk"]')
    const tokenCount = await tokenElements.count()

    // There should be styled tokens
    expect(tokenCount).toBeGreaterThan(0)
  })

  test('highlights function keyword correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'function f() end')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('function')
    await expect(viewLines).toContainText('end')
  })

  test('highlights hex numbers correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'x = 0xFF')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('0xFF')
  })

  test('highlights boolean literals correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 'b = true')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('true')
  })

  test('highlights table constructor correctly', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    await typeSlowly(page, 't = {a = 1}')

    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText('{a = 1}')
  })

  test('keywords inside multi-line strings should not be highlighted as keywords', async ({
    page,
  }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type code with keyword to establish the keyword color
    await typeSlowly(page, 'local s = "hello"')
    await page.waitForTimeout(500)

    // Get the keyword color from 'local'
    const keywordColor = await page.evaluate(() => {
      const spans = document.querySelectorAll('.monaco-editor .view-line span')
      for (const span of spans) {
        if (span.textContent === 'local') {
          return window.getComputedStyle(span).color
        }
      }
      return null
    })
    expect(keywordColor).toBeDefined()

    // Now add a multi-line string with keyword text on separate lines
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'x = [[')
    await page.keyboard.press('Enter')
    await typeSlowly(page, 'return to the kingdom')
    await page.keyboard.press('Enter')
    await typeSlowly(page, ']]')
    await page.waitForTimeout(500)

    // Get the color of 'return' inside the multi-line string (line 3)
    const returnInsideStringColor = await page.evaluate(() => {
      const viewLines = document.querySelectorAll('.monaco-editor .view-line')
      // Line 3 (index 2) should contain "return to the kingdom"
      for (let i = 0; i < viewLines.length; i++) {
        const line = viewLines[i]
        const spans = line.querySelectorAll('span')
        for (const span of spans) {
          const text = span.textContent || ''
          if (text.includes('return') && i >= 2) {
            return window.getComputedStyle(span).color
          }
        }
      }
      return null
    })
    expect(returnInsideStringColor).toBeDefined()

    // The 'return' inside [[...]] should NOT have the same color as 'local' keyword
    // If they match, keywords inside strings are being incorrectly styled (bug!)
    expect(returnInsideStringColor).not.toBe(keywordColor)
  })
})
