/**
 * Lua script execution process implementing IProcess interface.
 * Executes a Lua script file and exits when complete.
 */

import type { IProcess, ShellContext } from '@lua-learning/shell-core'
import type { LuaEngine } from 'wasmoon'
import {
  LuaEngineFactory,
  formatLuaError,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
  type ExecutionControlOptions,
} from './LuaEngineFactory'
import { resolvePath } from '@lua-learning/shell-core'
import { CanvasController, type CanvasCallbacks } from './CanvasController'
import { setupCanvasAPI } from './setupCanvasAPI'
import { setupAudioAPI } from './setupAudioAPI'
import { FileOperationsHandler } from './FileOperationsHandler'
import type { CanvasMode, ScreenMode } from './LuaCommand'

/**
 * Options for configuring the Lua script process.
 */
export interface LuaScriptProcessOptions extends ExecutionControlOptions {
  /** Callbacks for canvas tab management (enables canvas.start()/stop()) */
  canvasCallbacks?: CanvasCallbacks
  /** Canvas display mode: 'tab' (default) or 'window' (popup) */
  canvasMode?: CanvasMode
  /** Screen mode for canvas window scaling */
  screenMode?: ScreenMode
  /** If true, hide the toolbar in canvas window mode */
  noToolbar?: boolean
  /** Callback when filesystem changes (for UI refresh) */
  onFileSystemChange?: () => void
}

/**
 * Process that executes a Lua script file.
 * Reads the script from the filesystem, executes it, and exits.
 */
export class LuaScriptProcess implements IProcess {
  private engine: LuaEngine | null = null
  private running = false
  private inputQueue: Array<{
    resolve: (value: string) => void
    reject: (error: Error) => void
    charCount?: number
  }> = []
  private hasError = false
  private readonly options: LuaScriptProcessOptions
  private canvasController: CanvasController | null = null

  /** File operations handler for io.open() support */
  private fileOpsHandler: FileOperationsHandler | null = null

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

  constructor(
    private readonly filename: string,
    private readonly context: ShellContext,
    options?: LuaScriptProcessOptions
  ) {
    this.options = options ?? {}
  }

  /**
   * Start the script process.
   * Reads and executes the Lua script file.
   */
  start(): void {
    if (this.running) return

    this.running = true
    this.hasError = false
    this.executeScript()
  }

  /**
   * Stop the script process.
   * Interrupts script execution and cleans up.
   * Requests cooperative stop for any running code via debug hook.
   */
  stop(): void {
    if (!this.running) return

    this.running = false

    // Close all open file handles (flushes pending writes)
    this.fileOpsHandler?.closeAll()

    // Stop any running canvas first
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
   * Routes input to io.read() if the script is waiting.
   */
  handleInput(input: string): void {
    if (!this.running) return

    // If there's a pending io.read(), resolve it
    if (this.inputQueue.length > 0) {
      const pending = this.inputQueue.shift()
      if (pending) {
        pending.resolve(input)
      }
    }
  }

  /**
   * Execute the script file.
   * Wraps execution with debug hooks for instruction limiting.
   *
   * NOTE: Due to wasmoon limitations, debug hooks don't persist across doString calls.
   * We wrap the script content with hook setup/teardown in a single Lua chunk.
   */
  private async executeScript(): Promise<void> {
    // Resolve the file path
    const filepath = this.resolvePath(this.filename)

    // Check if file exists
    if (!this.context.filesystem.exists(filepath)) {
      this.onError(formatLuaError(`File not found: ${this.filename}`) + '\n')
      this.exitWithCode(1)
      return
    }

    // Check if it's a file (not a directory)
    if (this.context.filesystem.isDirectory(filepath)) {
      this.onError(formatLuaError(`${this.filename} is not a file`) + '\n')
      this.exitWithCode(1)
      return
    }

    // Read the script content
    let scriptContent: string
    try {
      scriptContent = this.context.filesystem.readFile(filepath)
    } catch (error) {
      this.onError(formatLuaError(`Failed to read file: ${error}`) + '\n')
      this.exitWithCode(1)
      return
    }

    // Create engine and execute
    // With load(), the script content has its own chunk name so line numbers are preserved
    const LINE_OFFSET = 0

    // Create file operations handler for io.open() support
    this.fileOpsHandler = new FileOperationsHandler(
      this.context.filesystem,
      (path: string) => this.resolvePath(path),
      this.context.onFileSystemChange
    )

    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => {
        this.hasError = true
        // Adjust line numbers in error messages to account for wrapper lines
        const adjustedError = this.adjustErrorLineNumber(text, LINE_OFFSET)
        this.onError(formatLuaError(adjustedError) + '\n')
      },
      onReadInput: (charCount?: number) => this.waitForInput(charCount),
      onInstructionLimitReached: this.options.onInstructionLimitReached,
      // Enable require() to load modules from the virtual file system
      fileReader: (path: string): string | null => {
        if (!this.context.filesystem.exists(path)) {
          return null
        }
        if (this.context.filesystem.isDirectory(path)) {
          return null
        }
        try {
          return this.context.filesystem.readFile(path)
        } catch {
          return null
        }
      },
      // Enable io.open() to read/write files from the virtual file system
      fileOperations: this.fileOpsHandler.createCallbacks(),
    }

    const engineOptions: LuaEngineOptions = {
      instructionLimit: this.options.instructionLimit,
      instructionCheckInterval: this.options.instructionCheckInterval,
      scriptPath: filepath,
      cwd: this.context.cwd,
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks, engineOptions)

      // Set up canvas API if callbacks are provided
      this.initCanvasAPI()

      // Set up a helper function to execute script content with hooks
      // Using load() allows scripts to have top-level return statements
      this.engine.global.set('__script_content', scriptContent)
      this.engine.global.set('__script_name', this.filename)

      // Execute the script wrapped with hooks using load()
      // This ensures the debug hook is active during the entire script execution
      // and properly handles scripts with top-level return statements
      // The wrapper adds 4 lines before the script content (via load), which we adjust for in error messages
      await this.engine.doString(`
__setup_execution_hook()
local __fn, __err = load(__script_content, "@" .. __script_name)
if not __fn then
  error(__err)
end
__fn()
__clear_execution_hook()
`)

      // Flush any buffered output from the execution
      LuaEngineFactory.flushOutput(this.engine)

      // Script completed successfully
      if (this.running) {
        this.exitWithCode(this.hasError ? 1 : 0)
      }
    } catch (error) {
      // Flush any buffered output before reporting error
      if (this.engine) {
        LuaEngineFactory.flushOutput(this.engine)
      }
      // Script failed with error
      const errorMsg = error instanceof Error ? error.message : String(error)
      // Adjust line numbers in error messages to account for wrapper lines
      const adjustedError = this.adjustErrorLineNumber(errorMsg, LINE_OFFSET)
      this.onError(formatLuaError(adjustedError) + '\n')
      this.exitWithCode(1)
    }
  }

  /**
   * Resolve a path relative to the current working directory.
   */
  private resolvePath(path: string): string {
    // If path starts with /, it's absolute
    if (path.startsWith('/')) {
      return path
    }
    // Otherwise, resolve relative to cwd
    return resolvePath(this.context.cwd, path)
  }

  /**
   * Wait for user input (used by io.read()).
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
   * Exit the process with the given code.
   */
  private exitWithCode(code: number): void {
    this.running = false

    // Close all open file handles (flushes pending writes)
    this.fileOpsHandler?.closeAll()

    // Stop any running canvas
    if (this.canvasController?.isActive()) {
      this.canvasController.stop()
    }
    this.canvasController = null

    const engineToClose = this.engine
    this.engine = null
    LuaEngineFactory.closeDeferred(engineToClose)

    this.onExit(code)
  }

  /**
   * Adjust line numbers in Lua error messages to account for wrapper code.
   * Lua errors have format: [string "..."]:LINE: message
   * or: filename.lua:LINE: message
   *
   * Also adjusts line numbers mentioned in error message body (e.g., "at line 5")
   * and hides internal wrapper function names from user-facing errors.
   */
  private adjustErrorLineNumber(error: string, offset: number): string {
    let adjusted = error

    // Adjust line numbers in source:line: format (e.g., [string "..."]:5:)
    adjusted = adjusted.replace(
      /(\[string "[^"]*"\]|[^:\s]+\.lua):(\d+):/g,
      (_match, source, lineStr) => {
        const line = parseInt(lineStr, 10)
        const adjustedLine = Math.max(1, line - offset)
        return `${source}:${adjustedLine}:`
      }
    )

    // Adjust line numbers mentioned in message body (e.g., "at line 5", "line 3")
    adjusted = adjusted.replace(
      /\b(at line|line)\s+(\d+)\b/gi,
      (_match, prefix, lineStr) => {
        const line = parseInt(lineStr, 10)
        const adjustedLine = Math.max(1, line - offset)
        return `${prefix} ${adjustedLine}`
      }
    )

    // Hide internal wrapper function names from user-facing errors
    // Replace references to wrapper functions with <end of file>
    adjusted = adjusted.replace(
      /'__(?:setup|clear)_execution_hook'/g,
      '<end of file>'
    )
    adjusted = adjusted.replace(
      /near\s+__(?:setup|clear)_execution_hook/g,
      'near <end of file>'
    )

    return adjusted
  }

  /**
   * Set up the canvas API if canvas callbacks are provided.
   * This enables canvas.start(), canvas.stop(), and all drawing/input functions.
   * Routes to tab or window callbacks based on canvasMode option.
   */
  private initCanvasAPI(): void {
    if (!this.engine || !this.options.canvasCallbacks) return

    const originalCallbacks = this.options.canvasCallbacks
    const canvasMode = this.options.canvasMode ?? 'tab'
    const screenMode = this.options.screenMode
    const noToolbar = this.options.noToolbar ?? false

    // Route callbacks based on canvas mode
    // If mode is 'window', use window callbacks (with fallback to tab)
    // If mode is 'tab', use tab callbacks
    // When routing to window, inject the screenMode and noToolbar parameters
    const routedCallbacks: CanvasCallbacks = {
      ...originalCallbacks,
      onRequestCanvasTab:
        canvasMode === 'window' && originalCallbacks.onRequestCanvasWindow
          ? (canvasId: string) =>
              originalCallbacks.onRequestCanvasWindow!(canvasId, screenMode, noToolbar)
          : originalCallbacks.onRequestCanvasTab,
      onCloseCanvasTab:
        canvasMode === 'window' && originalCallbacks.onCloseCanvasWindow
          ? originalCallbacks.onCloseCanvasWindow
          : originalCallbacks.onCloseCanvasTab,
      // Route close handlers: window mode uses registerWindowCloseHandler
      registerCanvasCloseHandler:
        canvasMode === 'window' && originalCallbacks.registerWindowCloseHandler
          ? originalCallbacks.registerWindowCloseHandler
          : originalCallbacks.registerCanvasCloseHandler,
      unregisterCanvasCloseHandler:
        canvasMode === 'window' && originalCallbacks.unregisterWindowCloseHandler
          ? originalCallbacks.unregisterWindowCloseHandler
          : originalCallbacks.unregisterCanvasCloseHandler,
      // Route reload handlers: window mode uses registerWindowReloadHandler
      registerCanvasReloadHandler:
        canvasMode === 'window' && originalCallbacks.registerWindowReloadHandler
          ? originalCallbacks.registerWindowReloadHandler
          : originalCallbacks.registerCanvasReloadHandler,
      unregisterCanvasReloadHandler:
        canvasMode === 'window' && originalCallbacks.unregisterWindowReloadHandler
          ? originalCallbacks.unregisterWindowReloadHandler
          : originalCallbacks.unregisterCanvasReloadHandler,
      onError: (error: string) => {
        this.onError(formatLuaError(error) + '\n')
      },
    }

    this.canvasController = new CanvasController(routedCallbacks)

    // Use shared setup functions
    setupCanvasAPI(this.engine, () => this.canvasController)
    setupAudioAPI(this.engine, () => this.canvasController?.getAudioEngine() ?? null)
  }

}
