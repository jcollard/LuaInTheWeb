/**
 * Interactive Lua REPL process implementing IProcess interface.
 * Provides a read-eval-print-loop for Lua code execution in the shell.
 */

import type { IProcess, KeyModifiers } from '@lua-learning/shell-core'
import type { LuaEngine } from 'wasmoon'
import {
  LuaEngineFactory,
  formatLuaError,
  type LuaEngineCallbacks,
} from './LuaEngineFactory'

/**
 * Interactive Lua REPL process.
 * Executes Lua code line by line and maintains state between inputs.
 */
export class LuaReplProcess implements IProcess {
  private engine: LuaEngine | null = null
  private running = false
  private inputQueue: Array<{
    resolve: (value: string) => void
    reject: (error: Error) => void
  }> = []
  private history: string[] = []
  private historyIndex = -1
  private inputBuffer: string[] = []
  private _inContinuationMode = false

  /**
   * Whether this process supports raw key input handling.
   * When true, the shell should forward raw key events to handleKey().
   */
  supportsRawInput = true

  /**
   * Whether the REPL is currently in continuation mode (awaiting more input).
   * When true, the REPL is collecting lines for a multi-line construct
   * (e.g., function definition, loop) and showing the `>>` prompt.
   * @returns true if awaiting more input for incomplete code
   */
  get inContinuationMode(): boolean {
    return this._inContinuationMode
  }

  /**
   * Callback invoked when the process produces output.
   */
  onOutput: (text: string) => void = () => {}

  /**
   * Callback invoked when the process produces an error.
   */
  onError: (text: string) => void = () => {}

  /**
   * Callback invoked when the process exits.
   */
  onExit: (code: number) => void = () => {}

  /**
   * Start the REPL process.
   * Initializes the Lua engine and displays a welcome message.
   */
  start(): void {
    if (this.running) return

    this.running = true
    this.initEngine()
  }

  /**
   * Stop the REPL process.
   * Closes the Lua engine and cleans up resources.
   */
  stop(): void {
    if (!this.running) return

    this.running = false

    // Reject any pending input requests
    for (const pending of this.inputQueue) {
      pending.reject(new Error('Process stopped'))
    }
    this.inputQueue = []

    // Defer engine cleanup using setTimeout(0) to allow the JS event loop to
    // drain pending wasmoon callbacks before closing. Closing immediately while
    // wasmoon is still processing causes "memory access out of bounds" errors
    // because WebAssembly memory is freed while still being referenced.
    const engineToClose = this.engine
    this.engine = null

    if (engineToClose) {
      setTimeout(() => {
        try {
          LuaEngineFactory.close(engineToClose)
        } catch {
          // Ignore errors during cleanup - engine may already be in invalid state
        }
      }, 0)
    }

    this.onExit(0)
  }

  /**
   * Check if the process is currently running.
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Handle input from the user.
   * Executes the input as Lua code in the REPL.
   * Supports multi-line input (e.g., from paste) by splitting on newlines.
   */
  handleInput(input: string): void {
    if (!this.running || !this.engine) return

    // Check if there's a pending io.read() request
    if (this.inputQueue.length > 0) {
      const pending = this.inputQueue.shift()
      if (pending) {
        pending.resolve(input)
        return
      }
    }

    // Check if user pressed Enter while viewing a history entry
    // When viewing history, the terminal shows the entry but input buffer is empty
    // So we need to use the history entry as the actual input
    if (this.historyIndex !== -1 && input === '') {
      const historyEntry = this.history[this.historyIndex]
      this.historyIndex = -1

      // For multi-line history entries, we need to add all lines to buffer
      const lines = historyEntry.split('\n')
      for (const line of lines) {
        this.inputBuffer.push(line)
      }

      // Check if code is complete (it should be, since it was executed before)
      // Fire-and-forget: runs async, results via onOutput/onError callbacks
      this.checkAndExecuteBuffer()
      return
    }

    // Reset history navigation index
    this.historyIndex = -1

    // Handle multi-line input (e.g., from paste)
    // Split by newlines, add all lines to buffer, then check once
    const lines = input.split('\n')
    for (const line of lines) {
      this.inputBuffer.push(line)
    }

    // Check if code is complete (only once for all lines)
    // Fire-and-forget: runs async, results via onOutput/onError callbacks
    this.checkAndExecuteBuffer()
  }

  /**
   * Cancel the current multi-line input and return to normal mode.
   * Clears the input buffer and exits continuation mode, displaying
   * a fresh prompt. Use this when the user wants to abandon an
   * incomplete multi-line construct (e.g., via Ctrl+C).
   */
  cancelInput(): void {
    this.inputBuffer = []
    this._inContinuationMode = false
    this.showPrompt()
  }

  /**
   * Get the command history.
   * @returns Array of previously executed commands
   */
  getHistory(): string[] {
    return [...this.history]
  }

  /**
   * Handle a raw key input event.
   * Handles arrow keys for history navigation.
   * @param key - The key identifier (e.g., 'ArrowUp', 'ArrowDown')
   * @param _modifiers - Optional modifier key state (unused currently)
   */
  handleKey(key: string, _modifiers?: KeyModifiers): void {
    if (!this.running) return

    if (key === 'ArrowUp') {
      this.navigateHistoryUp()
    } else if (key === 'ArrowDown') {
      this.navigateHistoryDown()
    }
  }

  /**
   * Navigate to previous (older) command in history.
   */
  private navigateHistoryUp(): void {
    if (this.history.length === 0) return

    if (this.historyIndex === -1) {
      // Start at most recent command
      this.historyIndex = this.history.length - 1
    } else if (this.historyIndex > 0) {
      // Go to older command
      this.historyIndex--
    }

    // Display the history entry
    this.displayHistoryEntry()
  }

  /**
   * Navigate to next (newer) command in history.
   */
  private navigateHistoryDown(): void {
    if (this.historyIndex === -1) return // Already at current input

    if (this.historyIndex < this.history.length - 1) {
      // Go to newer command
      this.historyIndex++
      this.displayHistoryEntry()
    } else {
      // Go past newest to empty current input
      this.historyIndex = -1
      this.onOutput('\r\x1b[K> ')
    }
  }

  /**
   * Display the current history entry.
   */
  private displayHistoryEntry(): void {
    const entry = this.history[this.historyIndex]
    // Clear line, move cursor to start, show prompt and entry
    this.onOutput(`\r\x1b[K> ${entry}`)
  }

  /**
   * Show the REPL prompt to indicate ready for input.
   */
  private showPrompt(): void {
    this.onOutput(this._inContinuationMode ? '>> ' : '> ')
  }

  /**
   * Check if the buffered code is complete and execute if so.
   */
  private async checkAndExecuteBuffer(): Promise<void> {
    if (!this.engine) return

    const code = this.inputBuffer.join('\n')

    // Check if code is complete
    const result = await LuaEngineFactory.isCodeComplete(this.engine, code)

    if (result.complete) {
      // Code is complete - execute it
      this._inContinuationMode = false

      // Add to history as a single entry (only if non-empty)
      if (code.trim() !== '') {
        const lastCommand = this.history[this.history.length - 1]
        if (code !== lastCommand) {
          this.history.push(code)
        }
      }

      // Clear buffer before execution
      this.inputBuffer = []

      // Execute the code
      await this.executeReplCode(code)
    } else if (result.error) {
      // Syntax error - report it and reset
      this._inContinuationMode = false
      this.inputBuffer = []
      this.onError(formatLuaError(result.error))
      this.showPrompt()
    } else {
      // Code is incomplete - wait for more input
      this._inContinuationMode = true
      this.showPrompt()
    }
  }

  /**
   * Initialize the Lua engine with REPL callbacks.
   */
  private async initEngine(): Promise<void> {
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(formatLuaError(text)),
      onReadInput: () => this.waitForInput(),
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks)

      // Setup exit() command
      this.engine.global.set('exit', () => {
        this.stop()
      })

      // Output welcome message and prompt
      this.onOutput('Lua 5.4 REPL - Type exit() to quit\n')
      this.showPrompt()
    } catch (error) {
      this.onError(formatLuaError(`Failed to initialize Lua engine: ${error}`))
      this.running = false
      this.onExit(1)
    }
  }

  /**
   * Execute code in REPL mode.
   * Handles both statements and expressions.
   */
  private async executeReplCode(code: string): Promise<void> {
    if (!this.engine) return

    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(formatLuaError(text)),
    }

    const result = await LuaEngineFactory.executeCode(this.engine, code, callbacks)

    // If expression returned a value (including nil), output it with newline
    // undefined means it was a statement (no return value)
    // 'nil' means the expression evaluated to nil (e.g., undefined variable)
    if (result !== undefined) {
      this.onOutput(result + '\n')
    }

    // Show prompt for next input (only if still running)
    if (this.running) {
      this.showPrompt()
    }
  }

  /**
   * Wait for user input (used by io.read()).
   * Returns a promise that resolves when input is provided.
   */
  private waitForInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.inputQueue.push({ resolve, reject })
    })
  }
}
