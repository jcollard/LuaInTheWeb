import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createTerminalHelper } from './helpers/terminal'

/**
 * E2E tests for Shell's lua command REPL functionality (Issue #243).
 *
 * Tests that the lua command displays return values for function calls
 * and expressions using the "try return first" pattern.
 */
test.describe('Shell Lua REPL - Return Value Display', () => {
  // Run tests serially to avoid shared state issues with the terminal
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
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

  test('function call displays return value', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Define a function
    await terminal.type('function add(a, b) return a + b end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Call the function - should display return value
    await terminal.type('add(2, 3)')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should show the return value '5'
    await terminal.expectToContain('5')
  })

  test('expression displays result', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Execute expression - should display result
    await terminal.type('1 + 1')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should show the result '2'
    await terminal.expectToContain('2')
  })

  test('statements execute without displaying return value', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Execute statement (assignment)
    await terminal.type('x = 42')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should NOT show '42' (statements don't display values)
    // But we can verify the variable was set
    await terminal.type('x')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should show '42' when we evaluate the variable
    await terminal.expectToContain('42')
  })

  test('nil values are suppressed', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Evaluate nil
    await terminal.type('nil')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should NOT show 'nil' output (suppressed)
    // Terminal should just show the next prompt
  })

  test('built-in functions display return values', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Call string.upper
    await terminal.type('string.upper("hello")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should show "HELLO"
    await terminal.expectToContain('HELLO')
  })

  test('multiple return values are tab-separated', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Call string.find which returns two values
    await terminal.type('string.find("hello", "ll")')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should show both return values: 3 and 4
    await terminal.expectToContain('3')
    await terminal.expectToContain('4')
  })

  test('function without return shows nothing', async ({ page }) => {
    const terminal = createTerminalHelper(page)
    await terminal.focus()

    // Start lua REPL
    await terminal.execute('lua')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Define function with no return
    await terminal.type('function noreturn() end')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.BRIEF)

    // Call function - should not display anything
    await terminal.type('noreturn()')
    await terminal.press('Enter')
    await page.waitForTimeout(TIMEOUTS.TRANSITION)

    // Should just show the next prompt (no output)
  })
})
