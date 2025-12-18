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
  type FileOperationsCallbacks,
  type FileOpenResult,
  type FileReadResult,
  type FileWriteResult,
  type FileCloseResult,
} from './LuaEngineFactory'
import { resolvePath } from '@lua-learning/shell-core'
import { CanvasController, type CanvasCallbacks } from './CanvasController'
import { setupCanvasAPI } from './setupCanvasAPI'

/**
 * Options for configuring the Lua script process.
 */
export interface LuaScriptProcessOptions extends ExecutionControlOptions {
  /** Callbacks for canvas tab management (enables canvas.start()/stop()) */
  canvasCallbacks?: CanvasCallbacks
}

/**
 * Process that executes a Lua script file.
 * Reads the script from the filesystem, executes it, and exits.
 */
/**
 * Represents an open file handle with its state.
 */
interface FileHandle {
  /** Unique handle ID */
  id: number
  /** Resolved absolute path to the file */
  path: string
  /** File open mode */
  mode: string
  /** Current file content (for reading) or buffer (for writing) */
  content: string
  /** Current read position */
  position: number
  /** Whether the file has been modified (needs flush on close) */
  dirty: boolean
}

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

  /** Open file handles for io.open() support */
  private fileHandles: Map<number, FileHandle> = new Map()
  /** Next available file handle ID */
  private nextHandleId = 1

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
    this.closeAllFileHandles()

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
      fileOperations: this.createFileOperations(),
    }

    const engineOptions: LuaEngineOptions = {
      instructionLimit: this.options.instructionLimit,
      instructionCheckInterval: this.options.instructionCheckInterval,
      scriptPath: filepath,
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
    this.closeAllFileHandles()

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
   * Create file operations callbacks for io.open() support.
   * Maps Lua file operations to the virtual filesystem.
   */
  private createFileOperations(): FileOperationsCallbacks {
    return {
      open: (path: string, mode: string): FileOpenResult => {
        return this.fileOpen(path, mode)
      },
      read: (handle: number, format: string | number): FileReadResult => {
        return this.fileRead(handle, format)
      },
      write: (handle: number, content: string): FileWriteResult => {
        return this.fileWrite(handle, content)
      },
      close: (handle: number): FileCloseResult => {
        return this.fileClose(handle)
      },
    }
  }

  /**
   * Open a file for reading or writing.
   */
  private fileOpen(path: string, mode: string): FileOpenResult {
    // Resolve relative paths
    const resolvedPath = this.resolvePath(path)

    // Check mode and handle accordingly
    const isRead = mode === 'r' || mode === 'r+'
    const isWrite = mode === 'w' || mode === 'w+'
    const isAppend = mode === 'a' || mode === 'a+'

    if (isRead) {
      // Read mode: file must exist
      if (!this.context.filesystem.exists(resolvedPath)) {
        return { success: false, error: `${path}: No such file or directory` }
      }
      if (this.context.filesystem.isDirectory(resolvedPath)) {
        return { success: false, error: `${path}: Is a directory` }
      }
      try {
        const content = this.context.filesystem.readFile(resolvedPath)
        const handle: FileHandle = {
          id: this.nextHandleId++,
          path: resolvedPath,
          mode,
          content,
          position: 0,
          dirty: false,
        }
        this.fileHandles.set(handle.id, handle)
        return { success: true, handle: handle.id }
      } catch (error) {
        return { success: false, error: `${path}: ${error}` }
      }
    }

    if (isWrite) {
      // Write mode: create or truncate file
      try {
        // Ensure parent directory exists
        const parentPath = resolvedPath.substring(0, resolvedPath.lastIndexOf('/'))
        if (parentPath && !this.context.filesystem.exists(parentPath)) {
          return { success: false, error: `${path}: No such file or directory` }
        }

        const handle: FileHandle = {
          id: this.nextHandleId++,
          path: resolvedPath,
          mode,
          content: '',
          position: 0,
          dirty: true, // Will need to write on close
        }
        this.fileHandles.set(handle.id, handle)
        return { success: true, handle: handle.id }
      } catch (error) {
        return { success: false, error: `${path}: ${error}` }
      }
    }

    if (isAppend) {
      // Append mode: open or create, position at end
      try {
        let content = ''
        if (this.context.filesystem.exists(resolvedPath)) {
          if (this.context.filesystem.isDirectory(resolvedPath)) {
            return { success: false, error: `${path}: Is a directory` }
          }
          content = this.context.filesystem.readFile(resolvedPath)
        }

        const handle: FileHandle = {
          id: this.nextHandleId++,
          path: resolvedPath,
          mode,
          content,
          position: content.length,
          dirty: false, // Only dirty when written to
        }
        this.fileHandles.set(handle.id, handle)
        return { success: true, handle: handle.id }
      } catch (error) {
        return { success: false, error: `${path}: ${error}` }
      }
    }

    return { success: false, error: `Invalid mode: ${mode}` }
  }

  /**
   * Read from a file handle.
   */
  private fileRead(handleId: number, format: string | number): FileReadResult {
    const handle = this.fileHandles.get(handleId)
    if (!handle) {
      return { success: false, error: 'Bad file descriptor' }
    }

    // Check if mode allows reading
    if (handle.mode === 'w' || handle.mode === 'a') {
      return { success: false, error: 'File not open for reading' }
    }

    // Handle different read formats
    if (typeof format === 'number') {
      // Read n characters
      if (handle.position >= handle.content.length) {
        return { success: true, data: null } // EOF
      }
      const data = handle.content.substring(handle.position, handle.position + format)
      handle.position += data.length
      return { success: true, data }
    }

    // String formats
    switch (format) {
      case 'a':
      case '*a': {
        // Read all remaining content
        const data = handle.content.substring(handle.position)
        handle.position = handle.content.length
        return { success: true, data }
      }

      case 'l':
      case '*l': {
        // Read line without newline
        if (handle.position >= handle.content.length) {
          return { success: true, data: null } // EOF
        }
        const remaining = handle.content.substring(handle.position)
        const newlineIndex = remaining.indexOf('\n')
        if (newlineIndex === -1) {
          // No more newlines, return rest of content
          handle.position = handle.content.length
          return { success: true, data: remaining }
        }
        const line = remaining.substring(0, newlineIndex)
        handle.position += newlineIndex + 1 // Skip the newline
        return { success: true, data: line }
      }

      case 'L':
      case '*L': {
        // Read line with newline
        if (handle.position >= handle.content.length) {
          return { success: true, data: null } // EOF
        }
        const remaining = handle.content.substring(handle.position)
        const newlineIndex = remaining.indexOf('\n')
        if (newlineIndex === -1) {
          // No more newlines, return rest of content with newline
          handle.position = handle.content.length
          return { success: true, data: remaining + '\n' }
        }
        const line = remaining.substring(0, newlineIndex + 1) // Include newline
        handle.position += newlineIndex + 1
        return { success: true, data: line }
      }

      case 'n':
      case '*n': {
        // Read number
        if (handle.position >= handle.content.length) {
          return { success: true, data: null } // EOF
        }
        const remaining = handle.content.substring(handle.position)
        // Skip whitespace
        const trimmed = remaining.trimStart()
        const whitespaceSkipped = remaining.length - trimmed.length
        // Match number pattern
        const match = trimmed.match(/^[-+]?(\d+\.?\d*|\d*\.?\d+)([eE][-+]?\d+)?/)
        if (!match) {
          return { success: true, data: null } // No valid number
        }
        handle.position += whitespaceSkipped + match[0].length
        return { success: true, data: match[0] }
      }

      default:
        return { success: false, error: `Invalid read format: ${format}` }
    }
  }

  /**
   * Write to a file handle.
   */
  private fileWrite(handleId: number, content: string): FileWriteResult {
    const handle = this.fileHandles.get(handleId)
    if (!handle) {
      return { success: false, error: 'Bad file descriptor' }
    }

    // Check if mode allows writing
    if (handle.mode === 'r') {
      return { success: false, error: 'File not open for writing' }
    }

    // For append mode, always write at end
    if (handle.mode === 'a' || handle.mode === 'a+') {
      handle.content += content
      handle.position = handle.content.length
    } else {
      // For write mode, write at current position
      handle.content =
        handle.content.substring(0, handle.position) +
        content +
        handle.content.substring(handle.position + content.length)
      handle.position += content.length
    }

    handle.dirty = true
    return { success: true }
  }

  /**
   * Close a file handle.
   */
  private fileClose(handleId: number): FileCloseResult {
    const handle = this.fileHandles.get(handleId)
    if (!handle) {
      return { success: false, error: 'Bad file descriptor' }
    }

    // Flush any pending writes
    if (handle.dirty) {
      try {
        this.context.filesystem.writeFile(handle.path, handle.content)
      } catch (error) {
        this.fileHandles.delete(handleId)
        return { success: false, error: `Failed to write file: ${error}` }
      }
    }

    this.fileHandles.delete(handleId)
    return { success: true }
  }

  /**
   * Close all open file handles (called on process exit).
   */
  private closeAllFileHandles(): void {
    for (const [handleId] of this.fileHandles) {
      this.fileClose(handleId)
    }
    this.fileHandles.clear()
  }
}
