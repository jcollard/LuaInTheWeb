import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for Lua file I/O operations (Issue #300).
 *
 * Tests that io.open(), file:read(), file:write(), file:close(), and io.lines()
 * work correctly with the virtual file system when running Lua scripts.
 *
 * These tests create files dynamically using shell commands rather than
 * pre-populating the filesystem, to properly test the integration.
 */
test.describe('Lua File I/O', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the editor
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })

    // Switch to Shell tab (in the bottom panel)
    await page.getByRole('tab', { name: /shell/i }).click()
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    // Wait for the Shell terminal to initialize
    const shellContainer = page.locator('[data-testid="shell-terminal-container"]')
    await expect(shellContainer).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    // Wait for xterm to initialize
    await expect(
      page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    ).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test.describe('io.open() for reading', () => {
    test('should read file content with io.open and file:read("a")', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Create a test file using io.open for writing
      await terminal.type('f = io.open("test-read.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("Hello from file!")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Now read the file back
      await terminal.type('f = io.open("test-read.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('content = f:read("a")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("CONTENT:" .. content)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('CONTENT:Hello from file!')

      await terminal.type('f:close()')
      await terminal.press('Enter')
    })

    test('should return nil and error for non-existent file', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Try to open non-existent file
      await terminal.type('f, err = io.open("nonexistent.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print(f)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // f should be nil
      await terminal.expectToContain('nil')

      await terminal.type('print(err)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // error should mention file not found
      await terminal.expectToContain('No such file')
    })
  })

  test.describe('io.open() for writing', () => {
    test('should write content to a new file', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Write to a file
      await terminal.type('f = io.open("output.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("Test output line 1\\n")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("Test output line 2\\n")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("WRITE_SUCCESS")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('WRITE_SUCCESS')

      // Now read the file back to verify it was written using io.open
      await terminal.type('f = io.open("output.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print(f:read("a"))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('Test output line 1')
      await terminal.expectToContain('Test output line 2')

      await terminal.type('f:close()')
      await terminal.press('Enter')
    })

    test('should support file:write chaining', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Use write chaining
      await terminal.type('f = io.open("chain.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("A"):write("B"):write("C")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify the file content by reading with io.open
      await terminal.type('f = io.open("chain.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print("CHAINED:" .. f:read("a"))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('CHAINED:ABC')

      await terminal.type('f:close()')
      await terminal.press('Enter')
    })
  })

  test.describe('io.lines()', () => {
    test('should iterate over file lines', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a multi-line test file
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      await terminal.type('f = io.open("lines-test.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("Line 1\\nLine 2\\nLine 3\\n")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Now iterate using io.lines
      await terminal.type('count = 0')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('for line in io.lines("lines-test.txt") do count = count + 1; print("LINE_" .. count .. ":" .. line) end')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

      await terminal.expectToContain('LINE_1:Line 1')
      await terminal.expectToContain('LINE_2:Line 2')
      await terminal.expectToContain('LINE_3:Line 3')

      await terminal.type('print("TOTAL:" .. count)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('TOTAL:3')
    })

    test('should error for non-existent file in io.lines()', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Try to iterate over non-existent file
      await terminal.type('for line in io.lines("missing.txt") do print(line) end')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.ASYNC_OPERATION)

      // Should show error
      await terminal.expectToContain('cannot open file')
    })
  })

  test.describe('file:read() formats', () => {
    test('should read line by line with "l" format', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a test file first
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      await terminal.type('f = io.open("read-test.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("First line\\nSecond line\\nThird line\\n")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Now read line by line
      await terminal.type('f = io.open("read-test.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Read first line
      await terminal.type('print(f:read("l"))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('First line')

      // Read second line
      await terminal.type('print(f:read("l"))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('Second line')

      await terminal.type('f:close()')
      await terminal.press('Enter')
    })

    test('should read n characters with numeric format', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Create a test file first
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      await terminal.type('f = io.open("num-read.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("Hello World!")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Now read specific number of characters
      await terminal.type('f = io.open("num-read.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Read first 5 characters
      await terminal.type('print(f:read(5))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)
      await terminal.expectToContain('Hello')

      await terminal.type('f:close()')
      await terminal.press('Enter')
    })
  })

  test.describe('io.close()', () => {
    test('should close file with file:close()', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Create and open a file
      await terminal.type('f = io.open("close-test.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("test")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('result = f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print(result)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Should return true on success
      await terminal.expectToContain('true')
    })

    test('should close file with io.close(file)', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Create and open a file
      await terminal.type('f = io.open("ioclose-test.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("test")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('result = io.close(f)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print(result)')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Should return true on success
      await terminal.expectToContain('true')
    })
  })

  test.describe('append mode', () => {
    test('should append to existing file with "a" mode', async ({ page }) => {
      const terminal = createTerminalHelper(page)
      await terminal.focus()

      // Start Lua REPL
      await terminal.execute('lua')
      await page.waitForTimeout(TIMEOUTS.ANIMATION)

      // Create a file first
      await terminal.type('f = io.open("append.txt", "w")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("First line\\n")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Now append to it
      await terminal.type('f = io.open("append.txt", "a")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:write("Appended line\\n")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('f:close()')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      // Verify both lines are in the file using io.open
      await terminal.type('f = io.open("append.txt", "r")')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.type('print(f:read("a"))')
      await terminal.press('Enter')
      await page.waitForTimeout(TIMEOUTS.TRANSITION)

      await terminal.expectToContain('First line')
      await terminal.expectToContain('Appended line')

      await terminal.type('f:close()')
      await terminal.press('Enter')
    })
  })
})
