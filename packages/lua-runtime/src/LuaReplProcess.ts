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
  private _cursorPosition = 0
  private _currentLineIndex = 0
  private _currentLine = ''

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
   * Current cursor position within the current line.
   * @returns cursor position (0 = start of line)
   */
  get cursorPosition(): number {
    return this._cursorPosition
  }

  /**
   * Current line index within the input buffer during continuation mode.
   * In single-line mode, this is always 0.
   * @returns line index (0-based)
   */
  get currentLineIndex(): number {
    return this._currentLineIndex
  }

  /**
   * Current line content being edited.
   * @returns the current line string
   */
  get currentLine(): string {
    return this._currentLine
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
   * Handles arrow keys for cursor movement, history navigation, and character input.
   * @param key - The key identifier (e.g., 'ArrowUp', 'ArrowDown', 'a', 'Backspace')
   * @param _modifiers - Optional modifier key state (unused currently)
   */
  handleKey(key: string, _modifiers?: KeyModifiers): void {
    if (!this.running) return

    if (key === 'ArrowUp') {
      if (this._inContinuationMode && this._currentLineIndex > 0) {
        this.navigateLineUp()
      } else if (!this._inContinuationMode) {
        this.navigateHistoryUp()
      }
    } else if (key === 'ArrowDown') {
      if (this._inContinuationMode && this._currentLineIndex < this.inputBuffer.length - 1) {
        this.navigateLineDown()
      } else if (!this._inContinuationMode) {
        this.navigateHistoryDown()
      }
    } else if (key === 'ArrowLeft') {
      this.moveCursorLeft()
    } else if (key === 'ArrowRight') {
      this.moveCursorRight()
    } else if (key === 'Backspace') {
      this.handleBackspace()
    } else if (key.length === 1) {
      // Single printable character
      this.insertCharacter(key)
    }
  }

  /**
   * Move cursor left within current line.
   */
  private moveCursorLeft(): void {
    if (this._cursorPosition > 0) {
      this._cursorPosition--
      this.onOutput('\x1b[D') // ANSI cursor left
    }
  }

  /**
   * Move cursor right within current line.
   */
  private moveCursorRight(): void {
    if (this._cursorPosition < this._currentLine.length) {
      this._cursorPosition++
      this.onOutput('\x1b[C') // ANSI cursor right
    }
  }

  /**
   * Insert a character at the current cursor position.
   */
  private insertCharacter(char: string): void {
    const before = this._currentLine.slice(0, this._cursorPosition)
    const after = this._currentLine.slice(this._cursorPosition)
    this._currentLine = before + char + after
    this._cursorPosition++

    if (after.length === 0) {
      // Cursor at end - just output the character
      this.onOutput(char)
    } else {
      // Cursor in middle - need to redraw rest of line and reposition cursor
      this.onOutput(char + after + '\x1b[' + after.length + 'D')
    }

    // Update input buffer if in continuation mode
    if (this._inContinuationMode && this._currentLineIndex < this.inputBuffer.length) {
      this.inputBuffer[this._currentLineIndex] = this._currentLine
    }
  }

  /**
   * Handle backspace key - delete character before cursor or merge lines.
   */
  private handleBackspace(): void {
    if (this._cursorPosition > 0) {
      // Delete character before cursor
      const before = this._currentLine.slice(0, this._cursorPosition - 1)
      const after = this._currentLine.slice(this._cursorPosition)
      this._currentLine = before + after
      this._cursorPosition--

      // Move cursor back, clear to end, write rest of line, move cursor back
      if (after.length === 0) {
        this.onOutput('\b \b') // Simple backspace at end
      } else {
        this.onOutput('\b' + after + ' \x1b[' + (after.length + 1) + 'D')
      }

      // Update input buffer if in continuation mode
      if (this._inContinuationMode && this._currentLineIndex < this.inputBuffer.length) {
        this.inputBuffer[this._currentLineIndex] = this._currentLine
      }
    } else if (this._inContinuationMode && this._currentLineIndex > 0) {
      // At position 0 on a non-first line - merge with previous line
      this.mergeWithPreviousLine()
    }
  }

  /**
   * Merge current line with previous line (backspace at position 0).
   */
  private mergeWithPreviousLine(): void {
    const prevLineIndex = this._currentLineIndex - 1
    const prevLine = this.inputBuffer[prevLineIndex]
    const currentContent = this._currentLine

    // Merge lines
    const mergedLine = prevLine + currentContent
    this.inputBuffer[prevLineIndex] = mergedLine

    // Remove current line from buffer
    this.inputBuffer.splice(this._currentLineIndex, 1)

    // Update state
    this._currentLineIndex = prevLineIndex
    this._currentLine = mergedLine
    this._cursorPosition = prevLine.length

    // Redraw - move up, clear line, write merged content, position cursor
    this.onOutput('\x1b[A\r\x1b[K>> ' + mergedLine)
    // Position cursor at merge point
    const moveBack = mergedLine.length - this._cursorPosition
    if (moveBack > 0) {
      this.onOutput('\x1b[' + moveBack + 'D')
    }
  }

  /**
   * Navigate to previous line in continuation mode buffer.
   */
  private navigateLineUp(): void {
    // Save current line content (only if slot exists in buffer)
    if (this._currentLineIndex < this.inputBuffer.length) {
      this.inputBuffer[this._currentLineIndex] = this._currentLine
    } else if (this._currentLine !== '') {
      // We're on a new line that hasn't been added to buffer yet - add it
      this.inputBuffer.push(this._currentLine)
    }

    // Move to previous line
    this._currentLineIndex--
    this._currentLine = this.inputBuffer[this._currentLineIndex]

    // Clamp cursor position to new line length
    this._cursorPosition = Math.min(this._cursorPosition, this._currentLine.length)

    // Redraw - move cursor up, clear line, show prompt and line, position cursor
    const prompt = this._currentLineIndex === 0 ? '> ' : '>> '
    this.onOutput('\x1b[A\r\x1b[K' + prompt + this._currentLine)
    const moveBack = this._currentLine.length - this._cursorPosition
    if (moveBack > 0) {
      this.onOutput('\x1b[' + moveBack + 'D')
    }
  }

  /**
   * Navigate to next line in continuation mode buffer.
   */
  private navigateLineDown(): void {
    // Save current line content (should always exist since we're moving to next)
    this.inputBuffer[this._currentLineIndex] = this._currentLine

    // Move to next line
    this._currentLineIndex++
    this._currentLine = this.inputBuffer[this._currentLineIndex] ?? ''

    // Clamp cursor position to new line length
    this._cursorPosition = Math.min(this._cursorPosition, this._currentLine.length)

    // Redraw - move cursor down, clear line, show prompt and line, position cursor
    this.onOutput('\x1b[B\r\x1b[K>> ' + this._currentLine)
    const moveBack = this._currentLine.length - this._cursorPosition
    if (moveBack > 0) {
      this.onOutput('\x1b[' + moveBack + 'D')
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

      // Reset cursor state for new input
      this._currentLine = ''
      this._cursorPosition = 0
      this._currentLineIndex = 0

      // Execute the code
      await this.executeReplCode(code)
    } else if (result.error) {
      // Syntax error - report it and reset
      this._inContinuationMode = false
      this.inputBuffer = []

      // Reset cursor state for new input
      this._currentLine = ''
      this._cursorPosition = 0
      this._currentLineIndex = 0

      this.onError(formatLuaError(result.error) + '\n')
      this.showPrompt()
    } else {
      // Code is incomplete - wait for more input
      this._inContinuationMode = true

      // Set up cursor state for the next line
      // Note: we don't add to inputBuffer here - handleInput or handleKey will do that
      this._currentLineIndex = this.inputBuffer.length
      this._currentLine = ''
      this._cursorPosition = 0

      this.showPrompt()
    }
  }

  /**
   * Initialize the Lua engine with REPL callbacks.
   */
  private async initEngine(): Promise<void> {
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(formatLuaError(text) + '\n'),
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
      this.onError(formatLuaError(`Failed to initialize Lua engine: ${error}`) + '\n')
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
      onError: (text: string) => this.onError(formatLuaError(text) + '\n'),
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
