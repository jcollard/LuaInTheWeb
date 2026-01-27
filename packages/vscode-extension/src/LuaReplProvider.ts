/**
 * Lua REPL Provider
 *
 * Provides an interactive Lua REPL using VS Code's pseudoterminal API.
 */

import * as vscode from 'vscode'
import { LuaEngineFactory, type LuaEngineCallbacks } from '@lua-learning/lua-runtime'
import type { LuaEngine } from 'wasmoon'
import { VSCodeFileSystem } from './adapters/VSCodeFileSystem'

export class LuaReplProvider {
  private context: vscode.ExtensionContext
  private terminal: vscode.Terminal | null = null
  private engine: LuaEngine | null = null
  private writeEmitter: vscode.EventEmitter<string> | null = null
  private inputBuffer = ''
  private historyBuffer: string[] = []
  private historyIndex = -1
  private multilineBuffer: string[] = []

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  /**
   * Open the Lua REPL in a new terminal.
   */
  openRepl(): void {
    if (this.terminal) {
      this.terminal.show()
      return
    }

    this.createRepl()
  }

  /**
   * Create a new REPL terminal.
   */
  private async createRepl(): Promise<void> {
    this.writeEmitter = new vscode.EventEmitter<string>()
    const closeEmitter = new vscode.EventEmitter<number>()

    const pty: vscode.Pseudoterminal = {
      onDidWrite: this.writeEmitter.event,
      onDidClose: closeEmitter.event,
      open: () => this.initRepl(),
      close: () => this.closeRepl(),
      handleInput: (data: string) => this.handleInput(data),
    }

    this.terminal = vscode.window.createTerminal({
      name: 'Lua REPL',
      pty,
    })

    this.terminal.show()
  }

  /**
   * Initialize the REPL engine.
   */
  private async initRepl(): Promise<void> {
    if (!this.writeEmitter) return

    // Get workspace root for file system
    const workspaceFolders = vscode.workspace.workspaceFolders
    const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()
    const fileSystem = new VSCodeFileSystem(workspaceRoot)

    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => {
        // Convert newlines to \r\n for terminal
        const terminalText = text.replace(/\n/g, '\r\n')
        this.writeEmitter?.fire(terminalText)
      },
      onError: (text: string) => {
        this.writeEmitter?.fire(`\x1b[31m${text.replace(/\n/g, '\r\n')}\x1b[0m\r\n`)
      },
      fileReader: (path: string) => {
        try {
          return fileSystem.readFile(path)
        } catch {
          return null
        }
      },
      getTerminalWidth: () => 120,
      getTerminalHeight: () => 40,
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks, {
        cwd: workspaceRoot,
      })

      // Print welcome message
      this.writeEmitter.fire('\x1b[36mLua REPL (VS Code)\x1b[0m\r\n')
      this.writeEmitter.fire('Type Lua code and press Enter to execute.\r\n')
      this.writeEmitter.fire('Use Ctrl+C to cancel input, Ctrl+D to exit.\r\n')
      this.writeEmitter.fire('\r\n')
      this.printPrompt()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.writeEmitter.fire(`\x1b[31mFailed to initialize Lua engine: ${errorMsg}\x1b[0m\r\n`)
    }
  }

  /**
   * Close the REPL.
   */
  private closeRepl(): void {
    if (this.engine) {
      LuaEngineFactory.closeDeferred(this.engine)
      this.engine = null
    }
    this.terminal = null
    this.writeEmitter = null
    this.inputBuffer = ''
    this.multilineBuffer = []
  }

  /**
   * Handle terminal input.
   */
  private async handleInput(data: string): Promise<void> {
    if (!this.writeEmitter || !this.engine) return

    // Handle special keys
    switch (data) {
      case '\r': // Enter
        this.writeEmitter.fire('\r\n')
        await this.executeInput()
        return

      case '\x7f': // Backspace
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1)
          this.writeEmitter.fire('\b \b')
        }
        return

      case '\x03': // Ctrl+C
        this.inputBuffer = ''
        this.multilineBuffer = []
        this.writeEmitter.fire('^C\r\n')
        this.printPrompt()
        return

      case '\x04': // Ctrl+D
        if (this.inputBuffer.length === 0) {
          this.terminal?.dispose()
        }
        return

      case '\x1b[A': // Up arrow
        this.navigateHistory(-1)
        return

      case '\x1b[B': // Down arrow
        this.navigateHistory(1)
        return

      default:
        // Regular character input
        if (data >= ' ' || data === '\t') {
          this.inputBuffer += data
          this.writeEmitter.fire(data)
        }
    }
  }

  /**
   * Execute the current input.
   */
  private async executeInput(): Promise<void> {
    if (!this.engine || !this.writeEmitter) return

    const input = this.inputBuffer.trim()
    this.inputBuffer = ''

    if (input === '') {
      if (this.multilineBuffer.length > 0) {
        // Empty line in multiline mode - try to execute
        const fullCode = this.multilineBuffer.join('\n')
        this.multilineBuffer = []
        await this.executeCode(fullCode)
      }
      this.printPrompt()
      return
    }

    // Add to multiline buffer
    this.multilineBuffer.push(input)
    const fullCode = this.multilineBuffer.join('\n')

    // Check if code is complete
    const completeness = await LuaEngineFactory.isCodeComplete(this.engine, fullCode)

    if (completeness.complete) {
      // Execute complete code
      this.multilineBuffer = []
      this.addToHistory(fullCode)
      await this.executeCode(fullCode)
      this.printPrompt()
    } else if (completeness.error) {
      // Syntax error - show it
      this.multilineBuffer = []
      this.writeEmitter.fire(`\x1b[31m${completeness.error}\x1b[0m\r\n`)
      this.printPrompt()
    } else {
      // Incomplete - wait for more input
      this.printContinuationPrompt()
    }
  }

  /**
   * Execute Lua code.
   */
  private async executeCode(code: string): Promise<void> {
    if (!this.engine || !this.writeEmitter) return

    try {
      // Try as expression first (with return)
      let result: unknown
      try {
        result = await this.engine.doString(`return ${code}`)
        if (result !== undefined && result !== null) {
          // Format and print result
          const formatted = await this.engine.doString(`return __format_value((${code}))`)
          this.writeEmitter.fire(`\x1b[33m${String(formatted)}\x1b[0m\r\n`)
        }
      } catch {
        // Try as statement
        await this.engine.doString(code)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.writeEmitter.fire(`\x1b[31m${errorMsg}\x1b[0m\r\n`)
    }

    // Flush any buffered output
    LuaEngineFactory.flushOutput(this.engine)
  }

  /**
   * Print the REPL prompt.
   */
  private printPrompt(): void {
    this.writeEmitter?.fire('\x1b[32m> \x1b[0m')
  }

  /**
   * Print the continuation prompt for multiline input.
   */
  private printContinuationPrompt(): void {
    this.writeEmitter?.fire('\x1b[32m>> \x1b[0m')
  }

  /**
   * Add input to history.
   */
  private addToHistory(input: string): void {
    // Don't add duplicates
    if (this.historyBuffer[this.historyBuffer.length - 1] !== input) {
      this.historyBuffer.push(input)
    }
    this.historyIndex = this.historyBuffer.length
  }

  /**
   * Navigate through history.
   */
  private navigateHistory(direction: number): void {
    if (!this.writeEmitter) return

    const newIndex = this.historyIndex + direction
    if (newIndex < 0 || newIndex > this.historyBuffer.length) {
      return
    }

    // Clear current input
    while (this.inputBuffer.length > 0) {
      this.writeEmitter.fire('\b \b')
      this.inputBuffer = this.inputBuffer.slice(0, -1)
    }

    this.historyIndex = newIndex
    if (newIndex < this.historyBuffer.length) {
      this.inputBuffer = this.historyBuffer[newIndex]
      this.writeEmitter.fire(this.inputBuffer)
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.terminal?.dispose()
    this.closeRepl()
  }
}
