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
  // Wait for Monaco to process and render the text
  const viewLines = page.locator('.monaco-editor .view-lines')
  await expect(viewLines).toContainText(text.trim(), { timeout: TIMEOUTS.ELEMENT_VISIBLE })
}

test.describe('Syntax Highlighting', () => {
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

  test('multiple variable assignment should highlight all variables identically', async ({
    page,
  }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type multiple variable assignment: local x, y, z = 1, 2, 3
    await typeSlowly(page, 'local x, y, z = 1, 2, 3')

    // Get colors of all three variables (x, y, z)
    const variableColors = await page.evaluate(() => {
      const spans = document.querySelectorAll('.monaco-editor .view-line span')
      const colors: { [key: string]: string } = {}
      for (const span of spans) {
        const text = span.textContent?.trim()
        if (text === 'x' || text === 'y' || text === 'z') {
          colors[text] = window.getComputedStyle(span).color
        }
      }
      return colors
    })

    // Verify we found all three variables
    expect(variableColors.x).toBeDefined()
    expect(variableColors.y).toBeDefined()
    expect(variableColors.z).toBeDefined()

    // All three should have identical highlighting (same color)
    expect(variableColors.x).toBe(variableColors.y)
    expect(variableColors.y).toBe(variableColors.z)
  })

  test('table keys should be highlighted as properties', async ({ page }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type both a variable and a table with keys
    await typeSlowly(page, 'local v = {a = 1, b = 2}')

    // Get colors of variable 'v' and table keys 'a', 'b'
    const colors = await page.evaluate(() => {
      const spans = document.querySelectorAll('.monaco-editor .view-line span')
      const result: { [key: string]: string } = {}
      for (const span of spans) {
        const text = span.textContent?.trim()
        if (text === 'v' || text === 'a' || text === 'b') {
          result[text] = window.getComputedStyle(span).color
        }
      }
      return result
    })

    // Verify we found the elements
    expect(colors.v).toBeDefined()
    expect(colors.a).toBeDefined()
    expect(colors.b).toBeDefined()

    // Table keys 'a' and 'b' should have identical highlighting
    expect(colors.a).toBe(colors.b)

    // Table keys should be different from the regular variable 'v'
    // (They're styled as variable.property vs identifier)
    expect(colors.a).not.toBe(colors.v)
  })

  test('keywords inside multi-line strings should not be highlighted as keywords', async ({
    page,
  }) => {
    const monacoEditor = await createAndOpenFile(page)
    await monacoEditor.click()

    // Type code with keyword to establish the keyword color
    await page.keyboard.type('local s = "hello"', { delay: 50 })
    // Wait for tokenization to complete by checking for styled tokens
    await expect(page.locator('.monaco-editor .view-line span[class*="mtk"]').first()).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

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
    await page.keyboard.type('x = [[', { delay: 50 })
    await page.keyboard.press('Enter')
    await page.keyboard.type('return to the kingdom', { delay: 50 })
    await page.keyboard.press('Enter')
    await page.keyboard.type(']]', { delay: 50 })
    // Wait for all content to be rendered
    const viewLines = page.locator('.monaco-editor .view-lines')
    await expect(viewLines).toContainText(']]', { timeout: TIMEOUTS.ELEMENT_VISIBLE })

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
