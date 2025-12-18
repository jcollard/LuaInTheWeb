/**
 * Interactive Lua REPL process implementing IProcess interface.
 * Provides a read-eval-print-loop for Lua code execution in the shell.
 */

import type { IProcess, KeyModifiers, IFileSystem } from '@lua-learning/shell-core'
import { resolvePath } from '@lua-learning/shell-core'
import type { LuaEngine } from 'wasmoon'
import {
  LuaEngineFactory,
  formatLuaError,
  ExecutionStoppedError,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
  type ExecutionControlOptions,
} from './LuaEngineFactory'
import { CanvasController, type CanvasCallbacks } from './CanvasController'
import { setupCanvasAPI } from './setupCanvasAPI'
import { FileOperationsHandler } from './FileOperationsHandler'

/**
 * Options for configuring the Lua REPL process.
 */
export interface LuaReplProcessOptions extends ExecutionControlOptions {
  /** Canvas callbacks for canvas.start()/stop() integration */
  canvasCallbacks?: CanvasCallbacks
  /** File system for io.open() support (optional) */
  fileSystem?: IFileSystem
  /** Current working directory for relative path resolution (defaults to '/') */
  cwd?: string
}

/**
 * Interactive Lua REPL process.
 * Executes Lua code line by line and maintains state between inputs.
 */
export class LuaReplProcess implements IProcess {
  /** Maximum number of commands to keep in history */
  private static readonly MAX_HISTORY_SIZE = 1000

  private engine: LuaEngine | null = null
  private running = false
  private inputQueue: Array<{
    resolve: (value: string) => void
    reject: (error: Error) => void
    charCount?: number
  }> = []
  private history: string[] = []
  private historyIndex = -1
  private inputBuffer: string[] = []
  private _inContinuationMode = false
  private readonly options: LuaReplProcessOptions
  /** Canvas controller for canvas.start()/stop() functionality */
  private canvasController: CanvasController | null = null

  /** File operations handler for io.open() support */
  private fileOpsHandler: FileOperationsHandler | null = null

  /**
   * Whether this process supports raw key input handling.
   * When true, the shell should forward raw key events to handleKey().
   */
  supportsRawInput = true

  /**
   * Create a new Lua REPL process.
   * @param options - Optional configuration for execution control
   */
  constructor(options?: LuaReplProcessOptions) {
    this.options = options ?? {}
  }

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
   * Callback invoked when the process requests input (io.read).
   * @param charCount - If provided, the process expects exactly this many characters
   *                    (character mode - no Enter required). If undefined, expects
   *                    a full line (line mode - wait for Enter).
   */
  onRequestInput: (charCount?: number) => void = () => {}

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
   * Requests cooperative stop for any running code via debug hook.
   */
  stop(): void {
    if (!this.running) return

    this.running = false

    // Close all open file handles (flushes pending writes)
    this.fileOpsHandler?.closeAll()

    // Stop any running canvas
    if (this.canvasController?.isActive()) {
      this.canvasController.stop()
    }
    this.canvasController = null

    // Request stop from any running Lua code via debug hook
    // This sets a flag that the debug hook checks periodically
    if (this.engine) {
      try {
        this.engine.doString('__request_stop()')
      } catch {
        // Ignore errors - engine may be in invalid state
      }
    }

    // Reject any pending input requests
    for (const pending of this.inputQueue) {
      pending.reject(new Error('Process stopped'))
    }
    this.inputQueue = []

    const engineToClose = this.engine
    this.engine = null
    LuaEngineFactory.closeDeferred(engineToClose)

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
          // Enforce history size limit
          if (this.history.length > LuaReplProcess.MAX_HISTORY_SIZE) {
            this.history.shift()
          }
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
      this.onError(formatLuaError(result.error) + '\n')
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
    // Create file operations handler if filesystem is provided
    if (this.options.fileSystem) {
      this.fileOpsHandler = new FileOperationsHandler(
        this.options.fileSystem,
        (path: string) => this.resolvePath(path)
      )
    }

    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(formatLuaError(text) + '\n'),
      onReadInput: (charCount?: number) => this.waitForInput(charCount),
      onInstructionLimitReached: this.options.onInstructionLimitReached,
      // Enable io.open() to read/write files from the virtual file system if provided
      fileOperations: this.fileOpsHandler?.createCallbacks(),
    }

    const engineOptions: LuaEngineOptions = {
      instructionLimit: this.options.instructionLimit,
      instructionCheckInterval: this.options.instructionCheckInterval,
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks, engineOptions)

      // Setup exit() command
      this.engine.global.set('exit', () => {
        this.stop()
      })

      // Setup canvas API if canvas callbacks are provided
      if (this.options.canvasCallbacks) {
        this.initCanvasAPI()
      }

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
   * Set up the canvas API for canvas.start(), canvas.stop(), and drawing functions.
   */
  private initCanvasAPI(): void {
    if (!this.engine || !this.options.canvasCallbacks) return

    // Create canvas controller with error reporting wired to process onError
    const callbacksWithError = {
      ...this.options.canvasCallbacks,
      onError: (error: string) => {
        this.onError(formatLuaError(error) + '\n')
      },
    }
    this.canvasController = new CanvasController(callbacksWithError)

    // Use shared setup function
    setupCanvasAPI(this.engine, () => this.canvasController)
  }

  /**
   * Execute code in REPL mode.
   * Uses "try return first" pattern to display function return values.
   * Wraps execution with debug hooks for instruction limiting.
   *
   * NOTE: Due to wasmoon limitations, debug hooks don't persist across doString calls.
   * We must wrap user code with hook setup/teardown in a single Lua chunk.
   * If execution is stopped by instruction limit, the error propagates directly.
   */
  private async executeReplCode(code: string): Promise<void> {
    if (!this.engine) return

    if (!code.trim()) {
      this.showPrompt()
      return
    }

    try {
      // Try "return <code>" first to capture function calls and expressions
      // Use __format_results to handle multiple return values tab-separated
      const formatted = await this.engine.doString(`
        __setup_execution_hook()
        local result = __format_results(${code})
        __clear_execution_hook()
        return result
      `)

      // Flush any buffered output from the execution
      LuaEngineFactory.flushOutput(this.engine)

      // Display the result if it's not nil
      if (formatted !== 'nil') {
        this.onOutput(String(formatted) + '\n')
      }

      // Show prompt for next input
      if (this.running) {
        this.showPrompt()
      }
    } catch (returnError: unknown) {
      // Check if this was an execution control error (stop request or limit)
      if (ExecutionStoppedError.isExecutionStoppedError(returnError)) {
        // Execution was stopped - flush output and report
        LuaEngineFactory.flushOutput(this.engine)
        const errorMsg = returnError instanceof Error ? returnError.message : String(returnError)
        this.onError(formatLuaError(errorMsg) + '\n')
        if (this.running) {
          this.showPrompt()
        }
        return
      }

      // "return <code>" failed, try as statement
      try {
        await this.engine.doString(`
          __setup_execution_hook()
          ${code}
          __clear_execution_hook()
        `)

        // Flush any buffered output from the execution
        LuaEngineFactory.flushOutput(this.engine)

        // Statement executed successfully, show prompt
        if (this.running) {
          this.showPrompt()
        }
      } catch (statementError: unknown) {
        const statementErrorMsg = statementError instanceof Error ? statementError.message : String(statementError)

        // Check if this was an execution control error
        if (ExecutionStoppedError.isExecutionStoppedError(statementError)) {
          LuaEngineFactory.flushOutput(this.engine)
          this.onError(formatLuaError(statementErrorMsg) + '\n')
          if (this.running) {
            this.showPrompt()
          }
          return
        }

        // Both return and statement failed - report error
        LuaEngineFactory.flushOutput(this.engine)
        this.onError(formatLuaError(statementErrorMsg) + '\n')

        // Show prompt for next input
        if (this.running) {
          this.showPrompt()
        }
      }
    }
  }

  /**
   * Wait for user input (used by io.read()).
   * Returns a promise that resolves when input is provided.
   * @param charCount - If provided, requests exactly this many characters (character mode).
   *                    If undefined, requests a full line (line mode).
   */
  private waitForInput(charCount?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.inputQueue.push({ resolve, reject, charCount })
      // Notify UI that input is requested
      this.onRequestInput(charCount)
    })
  }

  /**
   * Get the expected character count for the current pending input request.
   * Returns undefined if no input is pending or if in line mode.
   */
  getPendingInputCharCount(): number | undefined {
    if (this.inputQueue.length === 0) return undefined
    return this.inputQueue[0].charCount
  }

  /**
   * Check if there's a pending input request.
   */
  hasPendingInput(): boolean {
    return this.inputQueue.length > 0
  }

  /**
   * Resolve a path relative to the current working directory.
   */
  private resolvePath(path: string): string {
    const cwd = this.options.cwd ?? '/'
    // If path starts with /, it's absolute
    if (path.startsWith('/')) {
      return path
    }
    // Otherwise, resolve relative to cwd
    return resolvePath(cwd, path)
  }

}
