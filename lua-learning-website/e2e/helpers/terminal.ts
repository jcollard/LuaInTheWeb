import { Page, expect } from '@playwright/test'
import { TIMEOUTS } from '../constants'

/**
 * Interface for the test API exposed by ShellTerminal component
 */
interface ShellTerminalTestAPI {
  getBuffer: () => string[]
  getVisibleText: () => string
  getAllText: () => string
}

/**
 * Helper class for interacting with and asserting on terminal content in E2E tests.
 *
 * This provides reliable access to terminal buffer content, which is necessary
 * because xterm.js renders to canvas making DOM-based assertions unreliable.
 */
export class TerminalHelper {
  constructor(
    private page: Page,
    private selector = '[data-testid="shell-terminal-container"]'
  ) {}

  /** Click to focus the terminal */
  async focus(): Promise<void> {
    const terminal = this.page.locator(`${this.selector} .xterm-screen`)
    await terminal.click()
    await this.page.waitForTimeout(TIMEOUTS.BRIEF)
  }

  /** Type text in the terminal */
  async type(text: string): Promise<void> {
    await this.page.keyboard.type(text)
  }

  /** Press a key in the terminal */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key)
  }

  /** Execute a command (type + Enter) and wait for it to complete */
  async execute(command: string): Promise<void> {
    await this.type(command)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(TIMEOUTS.TRANSITION)
  }

  /** Get all text from terminal buffer */
  async getAllText(): Promise<string> {
    return this.page.evaluate(() => {
      const api = (window as unknown as { __shellTerminal?: ShellTerminalTestAPI })
        .__shellTerminal
      return api?.getAllText() ?? ''
    })
  }

  /** Get visible text from terminal viewport */
  async getVisibleText(): Promise<string> {
    return this.page.evaluate(() => {
      const api = (window as unknown as { __shellTerminal?: ShellTerminalTestAPI })
        .__shellTerminal
      return api?.getVisibleText() ?? ''
    })
  }

  /** Get terminal buffer as array of lines */
  async getBuffer(): Promise<string[]> {
    return this.page.evaluate(() => {
      const api = (window as unknown as { __shellTerminal?: ShellTerminalTestAPI })
        .__shellTerminal
      return api?.getBuffer() ?? []
    })
  }

  /**
   * Assert terminal contains text.
   * Uses polling to wait for the text to appear.
   */
  async expectToContain(text: string, options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUTS.ASYNC_OPERATION
    await expect
      .poll(
        async () => {
          const content = await this.getAllText()
          return content.includes(text)
        },
        { timeout, message: `Expected terminal to contain "${text}"` }
      )
      .toBe(true)
  }

  /** Assert terminal does NOT contain text */
  async expectNotToContain(text: string): Promise<void> {
    const content = await this.getAllText()
    expect(content).not.toContain(text)
  }

  /** Assert terminal output matches regex */
  async expectToMatch(pattern: RegExp): Promise<void> {
    const content = await this.getAllText()
    expect(content).toMatch(pattern)
  }

  /**
   * Wait for specific output to appear in terminal.
   * Useful for waiting on async command results.
   */
  async waitForOutput(text: string, timeout = TIMEOUTS.ASYNC_OPERATION): Promise<void> {
    await expect
      .poll(async () => (await this.getAllText()).includes(text), { timeout })
      .toBe(true)
  }

  /**
   * Get the terminal locator for additional assertions
   */
  getLocator() {
    return this.page.locator(this.selector)
  }
}

/**
 * Create a terminal helper for a page.
 *
 * @param page - Playwright page instance
 * @param selector - Optional custom selector for the terminal container
 * @returns TerminalHelper instance
 *
 * @example
 * ```typescript
 * const terminal = createTerminalHelper(page)
 * await terminal.focus()
 * await terminal.execute('ls')
 * await terminal.expectToContain('home')
 * ```
 */
export function createTerminalHelper(page: Page, selector?: string): TerminalHelper {
  return new TerminalHelper(page, selector)
}
