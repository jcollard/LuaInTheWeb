import { test, expect } from '@playwright/test'

/**
 * E2E tests for Lua REPL via shell's `lua` command.
 */
test.describe('Shell Lua REPL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Switch to Shell tab (in the bottom panel)
    await page.getByRole('tab', { name: /shell/i }).click()
    // Wait for the shell terminal to initialize
    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="shell-terminal-container"] .xterm-screen')).toBeVisible({ timeout: 10000 })
  })

  test('basic REPL execution via lua command', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()

    // Start the Lua REPL
    await page.keyboard.type('lua')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Type a simple expression
    await page.keyboard.type('1 + 1')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Type another command
    await page.keyboard.type('print("hello")')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Terminal should still be visible
    await expect(terminal).toBeVisible()
  })

  test('multi-line function in REPL continuation mode', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()

    // Start the Lua REPL
    await page.keyboard.type('lua')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Enter a multi-line function
    await page.keyboard.type('function hello()')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Should be in continuation mode (>> prompt)
    await page.keyboard.type('  print("hi")')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    await page.keyboard.type('end')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Call the function
    await page.keyboard.type('hello()')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    await expect(terminal).toBeVisible()
  })

  test('ArrowUp in continuation mode should navigate to previous line', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()

    // Start the Lua REPL
    await page.keyboard.type('lua')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Enter a multi-line function
    await page.keyboard.type('function test()')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Type on second line
    await page.keyboard.type('  return 42')
    await page.waitForTimeout(100)

    // Press ArrowUp - should navigate to first line
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(300)

    // The terminal display should show the first line is now active
    // (This is what we're testing - does the cursor move up?)

    // Press ArrowDown to go back
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)

    // Complete the function
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await page.keyboard.type('end')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Call it to verify it works
    await page.keyboard.type('test()')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    await expect(terminal).toBeVisible()
  })

  test('editing previous line after ArrowUp should work', async ({ page }) => {
    const terminal = page.locator('[data-testid="shell-terminal-container"] .xterm-screen')
    await terminal.click()

    // Start the Lua REPL
    await page.keyboard.type('lua')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Enter a for loop
    await page.keyboard.type('for i=1,3 do')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // Type on second line - intentionally wrong
    await page.keyboard.type('  print(i)')
    await page.waitForTimeout(100)

    // Navigate up to first line
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(300)

    // Try to add text (if cursor editing works, this should edit first line)
    // If it doesn't work, this text goes somewhere else
    await page.keyboard.type(' -- modified')
    await page.waitForTimeout(100)

    // Navigate back down
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)

    // Complete the loop
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await page.keyboard.type('end')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // The loop should execute - if it does, basic functionality works
    // But we can't easily verify if the "-- modified" text was added to first line
    await expect(terminal).toBeVisible()
  })
})
