/**
 * Factory for creating and managing Lua engines with standard callbacks.
 * Provides consistent engine setup for REPL and script execution.
 */

import { LuaFactory, type LuaEngine } from 'wasmoon'
import { LUA_FORMATTER_CODE } from './lua/formatter'
import { LUA_SHELL_CODE } from './lua/shell.generated'
import { LUA_HC_CODE } from './lua/hc.generated'
import { LUA_LOCALSTORAGE_CODE } from './lua/localstorage.generated'
import { LUA_IO_CODE } from './lua/io'
import { generateExecutionControlCode } from './lua/executionControl'
import { transformLuaError } from './luaErrorTransformer'

/** Flush interval in milliseconds (~60fps). */
export const FLUSH_INTERVAL_MS = 16
/** Maximum buffer size before immediate flush. */
export const MAX_BUFFER_SIZE = 1000
/** WeakMap to store flush functions for each engine instance. */
const engineFlushMap = new WeakMap<LuaEngine, () => void>()
/** Default instruction limit before prompting user (10 million). */
export const DEFAULT_INSTRUCTION_LIMIT = 10_000_000
/** Default interval between instruction count checks. */
export const DEFAULT_INSTRUCTION_CHECK_INTERVAL = 1000

/**
 * Join path segments into a single path.
 * Handles leading/trailing slashes correctly.
 * @param segments - Path segments to join
 * @returns Joined path
 */
function joinPath(...segments: string[]): string {
  const parts: string[] = []
  for (const segment of segments) {
    const cleanSegment = segment.replace(/^\/+|\/+$/g, '')
    if (cleanSegment) {
      parts.push(cleanSegment)
    }
  }
  return '/' + parts.join('/')
}

/**
 * Estimate the remaining localStorage space in bytes.
 * Uses the 5MB typical limit and calculates usage from stored data.
 */
function getLocalStorageRemainingSpace(): number {
  const STORAGE_LIMIT = 5 * 1024 * 1024 // 5MB typical limit
  try {
    if (typeof localStorage === 'undefined') {
      return 0
    }
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null) {
        const value = localStorage.getItem(key)
        // Each character is 2 bytes in JavaScript strings (UTF-16)
        totalSize += key.length * 2
        if (value !== null) {
          totalSize += value.length * 2
        }
      }
    }
    return Math.max(0, STORAGE_LIMIT - totalSize)
  } catch {
    return 0
  }
}

/**
 * Options for configuring execution control behavior.
 * Shared by LuaReplProcess and LuaScriptProcess.
 */
export interface ExecutionControlOptions {
  /** Instruction limit before triggering callback (default: 10,000,000) */
  instructionLimit?: number
  /** Interval between instruction count checks (default: 1000) */
  instructionCheckInterval?: number
  /**
   * Called when instruction limit is reached.
   * Return true to continue execution, false to stop.
   * NOTE: Must be synchronous due to Lua debug hook limitations.
   */
  onInstructionLimitReached?: () => boolean
}

/**
 * Options for configuring Lua engine execution control.
 */
export interface LuaEngineOptions {
  /** Instruction limit before triggering callback (default: 10,000,000) */
  instructionLimit?: number
  /** Interval between instruction count checks (default: 1000) */
  instructionCheckInterval?: number
  /**
   * Path to the main script being executed.
   * Used to resolve relative require() paths.
   * If not provided, require() searches from root only.
   */
  scriptPath?: string
  /**
   * Current working directory for require() resolution.
   * Searched FIRST, before scriptPath directory, per standard Lua behavior.
   * If not provided, CWD is not searched (backward compatible).
   */
  cwd?: string
}

/**
 * Error thrown when Lua execution is stopped by user or instruction limit.
 * Provides type-safe error detection instead of string matching.
 */
export class ExecutionStoppedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExecutionStoppedError'
  }

  /**
   * Check if an error is an execution stopped error.
   * Handles both ExecutionStoppedError instances and wasmoon errors
   * that contain "Execution stopped" in the message.
   */
  static isExecutionStoppedError(error: unknown): boolean {
    if (error instanceof ExecutionStoppedError) return true
    const msg = error instanceof Error ? error.message : String(error)
    return msg.includes('Execution stopped')
  }
}

/**
 * Format an error message with standard prefix.
 * Used by REPL and script processes for consistent error display.
 * Transforms cryptic Lua errors into user-friendly messages with hints.
 */
export function formatLuaError(text: string): string {
  const transformed = transformLuaError(text)
  return `[error] ${transformed}`
}

/**
 * Result of a file open operation.
 */
export interface FileOpenResult {
  /** Whether the operation succeeded */
  success: boolean
  /** File handle ID if successful */
  handle?: number
  /** Error message if failed */
  error?: string
}

/**
 * Result of a file read operation.
 */
export interface FileReadResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Data read from file (null if EOF) */
  data?: string | null
  /** Error message if failed */
  error?: string
}

/**
 * Result of a file write operation.
 */
export interface FileWriteResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Result of a file close operation.
 */
export interface FileCloseResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Callbacks for file I/O operations.
 * Used by io.open(), file:read(), file:write(), etc.
 */
export interface FileOperationsCallbacks {
  /**
   * Open a file for reading or writing.
   * @param path - Path to the file
   * @param mode - Open mode: "r" (read), "w" (write), "a" (append), "r+", "w+", "a+"
   * @returns Result with handle on success, error on failure
   */
  open: (path: string, mode: string) => FileOpenResult

  /**
   * Read from a file.
   * @param handle - File handle from open()
   * @param format - Read format: "l" (line), "L" (line+newline), "a" (all), "n" (number), or number of chars
   * @returns Result with data on success (null if EOF), error on failure
   */
  read: (handle: number, format: string | number) => FileReadResult

  /**
   * Write to a file.
   * @param handle - File handle from open()
   * @param content - Content to write
   * @returns Result indicating success or failure
   */
  write: (handle: number, content: string) => FileWriteResult

  /**
   * Close a file.
   * Returns a Promise to allow awaiting filesystem flush operations.
   * @param handle - File handle from open()
   * @returns Promise resolving to result indicating success or failure
   */
  close: (handle: number) => Promise<FileCloseResult>
}

/**
 * Callbacks for Lua engine output and input.
 */
export interface LuaEngineCallbacks {
  /** Called when Lua produces output (print, io.write) */
  onOutput: (text: string) => void
  /** Called when Lua produces an error */
  onError: (text: string) => void
  /**
   * Called when Lua needs input (io.read) - optional.
   * @param charCount - If provided, read exactly this many characters (character mode).
   *                    If undefined, read a full line (line mode, wait for Enter).
   */
  onReadInput?: (charCount?: number) => Promise<string>
  /**
   * Called when instruction limit is reached.
   * Return true to continue execution, false to stop.
   * If not provided, execution continues indefinitely.
   *
   * NOTE: This callback is called synchronously from within a Lua debug hook.
   * Due to Lua limitations, async callbacks cannot be properly awaited.
   * Return a boolean directly (not a Promise) for reliable behavior.
   *
   * NOTE: Stop requests (including returning false) are checked every
   * `instructionCheckInterval` lines, so there may be slight latency.
   */
  onInstructionLimitReached?: () => boolean
  /**
   * Get terminal width in columns.
   * Used by shell.width() function.
   * Returns default of 80 if not provided.
   */
  getTerminalWidth?: () => number
  /**
   * Get terminal height in rows.
   * Used by shell.height() function.
   * Returns default of 24 if not provided.
   */
  getTerminalHeight?: () => number
  /**
   * Read a file from the virtual file system.
   * Used by require() to load modules.
   * @param path - Absolute path to the file
   * @returns File content as string, or null if file doesn't exist
   */
  fileReader?: (path: string) => string | null
  /**
   * File I/O operations for io.open(), file:read(), file:write(), etc.
   * When provided, enables full file I/O support in Lua scripts.
   */
  fileOperations?: FileOperationsCallbacks
}

/**
 * Result of checking code completeness.
 */
export interface CodeCompletenessResult {
  /** Whether the code is syntactically complete */
  complete: boolean
  /** Error message if there's a syntax error (not just incomplete) */
  error?: string
  /** Error message if the code is incomplete (e.g., unclosed parenthesis) */
  incompleteError?: string
}

/**
 * Factory for creating Lua engines with standard setup.
 */
export class LuaEngineFactory {
  /**
   * Create a new Lua engine with callbacks configured.
   * @param callbacks - Output/error/input handlers
   * @param options - Optional execution control options
   * @returns Configured Lua engine
   */
  static async create(
    callbacks: LuaEngineCallbacks,
    options?: LuaEngineOptions
  ): Promise<LuaEngine> {
    const factory = new LuaFactory()
    const engine = await factory.createEngine()

    // Apply options with defaults
    const instructionLimit = options?.instructionLimit ?? DEFAULT_INSTRUCTION_LIMIT
    const checkInterval = options?.instructionCheckInterval ?? DEFAULT_INSTRUCTION_CHECK_INTERVAL

    // Output buffering state
    let outputBuffer: string[] = []
    // Initialize to null - timing starts on first output, not engine creation
    // This prevents premature flushes on slow CI machines where engine creation
    // to first output might exceed FLUSH_INTERVAL_MS
    let lastFlush: number | null = null

    // Flush buffered output to callback
    const flushOutput = () => {
      if (outputBuffer.length > 0) {
        callbacks.onOutput(outputBuffer.join(''))
        outputBuffer = []
        lastFlush = Date.now()
      }
    }

    // Store flush function for close() and closeDeferred()
    engineFlushMap.set(engine, flushOutput)

    // Check if buffer should be flushed (time or size threshold)
    const maybeFlush = () => {
      const now = Date.now()
      // If this is the first output, start timing from now (don't flush yet)
      if (lastFlush === null) {
        lastFlush = now
        return
      }
      if (now - lastFlush >= FLUSH_INTERVAL_MS || outputBuffer.length >= MAX_BUFFER_SIZE) {
        flushOutput()
      }
    }

    // Setup print function (adds newline like standard Lua print)
    engine.global.set('print', (...args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (arg === null) return 'nil'
          if (arg === undefined) return 'nil'
          return String(arg)
        })
        .join('\t')
      outputBuffer.push(message + '\n')
      maybeFlush()
    })

    // Setup io.write output (no newline, unlike print)
    engine.global.set('__js_write', (text: string) => {
      outputBuffer.push(text)
      maybeFlush()
    })

    // Setup flush function for io.read to call before blocking
    engine.global.set('__js_flush', () => {
      flushOutput()
    })

    // Setup io.read input handler if provided
    if (callbacks.onReadInput) {
      engine.global.set('__js_read_input', async (charCount?: number) => {
        return await callbacks.onReadInput!(charCount)
      })
    } else {
      // Default handler returns empty string
      engine.global.set('__js_read_input', async () => '')
    }

    // Setup execution control callback (synchronous)
    // Note: Cannot use async callbacks in debug hooks due to Lua limitations
    // ("attempt to yield across a C-call boundary")
    if (callbacks.onInstructionLimitReached) {
      engine.global.set('__on_limit_reached_sync', () => {
        // Call the callback synchronously - it should return a boolean immediately
        // If the callback is async, this will return a Promise object which is truthy
        // so async callbacks effectively mean "always continue"
        return callbacks.onInstructionLimitReached!()
      })
    } else {
      // Default: return true to continue execution indefinitely
      engine.global.set('__on_limit_reached_sync', () => true)
    }

    // Setup terminal dimension bridge functions for shell library
    engine.global.set('__shell_get_width', () => {
      return callbacks.getTerminalWidth?.() ?? 80
    })
    engine.global.set('__shell_get_height', () => {
      return callbacks.getTerminalHeight?.() ?? 24
    })

    // Setup file I/O bridge functions if fileOperations callbacks are provided
    if (callbacks.fileOperations) {
      const fileOps = callbacks.fileOperations

      // Store last operation result for Lua to retrieve
      let lastFileResult: {
        success: boolean
        handle?: number
        data?: string | null
        error?: string
      } = { success: false }

      // Bridge function for io.open
      engine.global.set('__js_file_open', (path: string, mode: string): boolean => {
        lastFileResult = fileOps.open(path, mode)
        return lastFileResult.success
      })

      // Bridge function for file:read
      engine.global.set('__js_file_read', (handle: number, format: string | number): boolean => {
        lastFileResult = fileOps.read(handle, format)
        return lastFileResult.success
      })

      // Bridge function for file:write
      engine.global.set('__js_file_write', (handle: number, content: string): boolean => {
        lastFileResult = fileOps.write(handle, content)
        return lastFileResult.success
      })

      // Bridge function for file:close (async to allow awaiting flush)
      engine.global.set('__js_file_close', async (handle: number): Promise<boolean> => {
        lastFileResult = await fileOps.close(handle)
        return lastFileResult.success
      })

      // Getter for handle from last open
      engine.global.set('__js_file_get_handle', (): number => {
        return lastFileResult.handle ?? 0
      })

      // Check if last read returned EOF (null data)
      engine.global.set('__js_file_is_eof', (): boolean => {
        return lastFileResult.data === null || lastFileResult.data === undefined
      })

      // Getter for data from last read (returns empty string for EOF, use __js_file_is_eof to check)
      engine.global.set('__js_file_get_data', (): string => {
        return lastFileResult.data ?? ''
      })

      // Getter for error from last operation
      engine.global.set('__js_file_get_error', (): string => {
        return lastFileResult.error ?? ''
      })
    }

    // Setup require() with virtual file system support
    if (callbacks.fileReader) {
      // CWD for require resolution (standard Lua ./?.lua behavior)
      const cwdDir = options?.cwd ?? null

      // Store fileReader in a ref so it's accessible from the closure
      const fileReaderRef = callbacks.fileReader

      // Store module content and path separately to avoid JSON parsing issues
      // Using a simple table-like approach with two global vars
      let lastModuleContent: string | null = null
      let lastModulePath: string | null = null

      // Helper to try loading a module from a specific path
      const tryPath = (fullPath: string): boolean => {
        const content = fileReaderRef(fullPath)
        if (content !== null) {
          lastModuleContent = content
          lastModulePath = fullPath
          return true
        }
        return false
      }

      // Helper to try both .lua and /init.lua variants in a directory
      const tryDirectory = (dir: string, modulePath: string): boolean => {
        // Try dir/module.lua
        if (tryPath(joinPath(dir, modulePath + '.lua'))) return true
        // Try dir/module/init.lua
        if (tryPath(joinPath(dir, modulePath, 'init.lua'))) return true
        return false
      }

      // Setup __js_require_lookup to find and store module data
      // Standard Lua behavior: search CWD first, then root fallback
      // No relative-to-calling-module search (matches standard Lua package.path)
      engine.global.set(
        '__js_require_lookup',
        (moduleName: string, _currentModulePath: string | undefined): boolean => {
          // Convert module name to relative path
          // Support both "lib/utils" and "lib.utils" formats
          const modulePath = moduleName.replace(/\./g, '/')

          // 1. Search CWD first (standard Lua ./?.lua behavior)
          if (cwdDir !== null) {
            if (tryDirectory(cwdDir, modulePath)) return true
          }

          // 2. Fall back to root if different from CWD
          if (cwdDir !== '/') {
            if (tryDirectory('/', modulePath)) return true
          }

          lastModuleContent = null
          lastModulePath = null
          return false
        }
      )

      // Setup getter for module content
      engine.global.set('__js_get_module_content', (): string => {
        return lastModuleContent ?? ''
      })

      // Setup getter for module path
      engine.global.set('__js_get_module_path', (): string => {
        return lastModulePath ?? ''
      })

      // Setup the Lua require function
      // __loaded_modules stores: { module = result, filepath = path, content = source }
      // This enables content-based hot reload (only reload if file changed)
      await engine.doString(`
        __loaded_modules = {}
        __module_path_stack = {}

        -- Large file threshold for hot reload tracking (50KB)
        __hot_reload_max_size = 50000

        function require(modname)
          -- Check cache first
          if __loaded_modules[modname] ~= nil then
            return __loaded_modules[modname].module
          end

          -- Check package.preload (for built-in modules like 'shell')
          if package.preload[modname] then
            local result = package.preload[modname]()
            -- Built-in modules don't need filepath/content tracking
            __loaded_modules[modname] = { module = result or true, builtin = true }
            return __loaded_modules[modname].module
          end

          -- Get current module path (top of stack) for relative resolution
          local currentPath = ""
          if #__module_path_stack > 0 then
            currentPath = __module_path_stack[#__module_path_stack]
          end

          -- Lookup module in JavaScript
          local found = __js_require_lookup(modname, currentPath)
          if not found then
            error("module '" .. modname .. "' not found")
          end

          -- Get the content and path from JavaScript
          local content = __js_get_module_content()
          local modulePath = __js_get_module_path()

          -- Push current module path onto stack for nested requires
          table.insert(__module_path_stack, modulePath)

          -- Load and execute the module
          local fn, err = load(content, modname)
          if not fn then
            table.remove(__module_path_stack)
            error("error loading module '" .. modname .. "': " .. (err or "unknown error"))
          end

          local ok, result = pcall(fn)
          table.remove(__module_path_stack)

          if not ok then
            error("error running module '" .. modname .. "': " .. tostring(result))
          end

          -- Cache the result with filepath and content for hot reload
          -- Skip content tracking for large files to save memory
          local contentToStore = nil
          if #content <= __hot_reload_max_size then
            contentToStore = content
          end

          __loaded_modules[modname] = {
            module = result or true,
            filepath = modulePath,
            content = contentToStore
          }
          return __loaded_modules[modname].module
        end
      `)
    }

    // Setup formatter, io functions, and execution control
    await engine.doString(LUA_FORMATTER_CODE)
    await engine.doString(LUA_IO_CODE)
    await engine.doString(generateExecutionControlCode(instructionLimit, checkInterval))

    // Register shell library in package.preload for require('shell')
    await engine.doString(`
      package.preload['shell'] = function()
        ${LUA_SHELL_CODE}
      end
    `)

    // Register HC collision detection library in package.preload for require('hc')
    await engine.doString(`
      package.preload['hc'] = function()
        ${LUA_HC_CODE}
      end
    `)

    // Setup localStorage bridge functions (must be before package.preload['localstorage'])
    // These are registered inside the factory to ensure consistent engine state,
    // matching the pattern used for shell and other APIs.
    //
    // NOTE: We return `undefined` instead of `null` because wasmoon's PromiseTypeExtension
    // tries to call .then() on return values to detect Promises, and null.then() throws.
    // Both undefined and null become `nil` in Lua, so this is semantically equivalent.
    engine.global.set('__localstorage_getItem', (key: string): string | undefined => {
      try {
        if (typeof localStorage === 'undefined') {
          return undefined
        }
        const value = localStorage.getItem(key)
        return value === null ? undefined : value
      } catch {
        return undefined
      }
    })

    // NOTE: Return undefined instead of null for the error field (same wasmoon issue)
    engine.global.set(
      '__localstorage_setItem',
      (key: string, value: string): [boolean, string | undefined] => {
        try {
          if (typeof localStorage === 'undefined') {
            return [false, 'localStorage not available']
          }
          localStorage.setItem(key, value)
          return [true, undefined]
        } catch (error) {
          if (
            error instanceof Error &&
            (error.name === 'QuotaExceededError' || error.message.includes('quota'))
          ) {
            return [false, 'Storage quota exceeded']
          }
          return [false, error instanceof Error ? error.message : 'Unknown error']
        }
      }
    )

    engine.global.set('__localstorage_removeItem', (key: string): void => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key)
        }
      } catch {
        // Silently ignore errors
      }
    })

    engine.global.set('__localstorage_clear', (): void => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear()
        }
      } catch {
        // Silently ignore errors
      }
    })

    engine.global.set('__localstorage_clearWithPrefix', (prefix: string): void => {
      try {
        if (typeof localStorage === 'undefined') return
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key))
      } catch {
        // Silently ignore errors
      }
    })

    engine.global.set('__localstorage_getRemainingSpace', (): number => {
      return getLocalStorageRemainingSpace()
    })

    // Register localStorage library in package.preload for require('localstorage')
    await engine.doString(`
      package.preload['localstorage'] = function()
        ${LUA_LOCALSTORAGE_CODE}
      end
    `)

    return engine
  }

  /**
   * Execute Lua code in the engine.
   * For statements, executes directly.
   * For expressions, returns the formatted result.
   *
   * @param engine - The Lua engine
   * @param code - Lua code to execute
   * @param callbacks - Callbacks for error handling
   * @returns Formatted expression result, or undefined for statements
   */
  static async executeCode(
    engine: LuaEngine,
    code: string,
    callbacks: LuaEngineCallbacks
  ): Promise<string | undefined> {
    if (!code.trim()) return undefined

    try {
      // Try to execute as a statement first
      await engine.doString(code)
      return undefined
    } catch {
      // If it fails, try to evaluate as an expression
      try {
        const formatted = await engine.doString(`return __format_value((${code}))`)
        return String(formatted)
      } catch (exprError: unknown) {
        // Both statement and expression parsing failed - report error
        const errorMsg = exprError instanceof Error ? exprError.message : String(exprError)
        callbacks.onError(errorMsg)
        return undefined
      }
    }
  }

  /**
   * Flush any buffered output for the given engine.
   * Call this after code execution to ensure all output is delivered.
   * @param engine - The engine whose buffer to flush
   */
  static flushOutput(engine: LuaEngine): void {
    const flushFn = engineFlushMap.get(engine)
    if (flushFn) {
      flushFn()
    }
  }

  /**
   * Close the Lua engine and release resources.
   * Flushes any remaining buffered output before closing.
   * @param engine - The engine to close
   */
  static close(engine: LuaEngine): void {
    // Flush any remaining buffered output
    const flushFn = engineFlushMap.get(engine)
    if (flushFn) {
      flushFn()
      engineFlushMap.delete(engine)
    }
    engine.global.close()
  }

  /**
   * Defer engine cleanup using setTimeout(0).
   * Allows JS event loop to drain pending wasmoon callbacks before closing.
   * Prevents "memory access out of bounds" errors from WebAssembly.
   * Flushes any remaining buffered output immediately before deferring close.
   *
   * @param engine - The engine to close (will be closed asynchronously), or null
   */
  static closeDeferred(engine: LuaEngine | null): void {
    if (!engine) return
    // Flush immediately before deferring close
    const flushFn = engineFlushMap.get(engine)
    if (flushFn) {
      flushFn()
      engineFlushMap.delete(engine)
    }
    setTimeout(() => {
      try {
        engine.global.close()
      } catch {
        // Ignore errors during cleanup - engine may already be in invalid state
      }
    }, 0)
  }

  /**
   * Check if Lua code is syntactically complete.
   * Used for multi-line REPL input to determine if more lines are needed.
   *
   * @param engine - The Lua engine to use for parsing
   * @param code - The code to check
   * @returns Result indicating completeness and any syntax error
   */
  static async isCodeComplete(
    engine: LuaEngine,
    code: string
  ): Promise<CodeCompletenessResult> {
    // Empty code is considered complete
    if (!code.trim()) {
      return { complete: true }
    }

    try {
      // Use Lua's load() to check syntax without executing
      // Try both as statement and as expression (with return prefix)
      // load() returns a function if successful, or nil and error message if not
      // Note: Using level-2 long string [==[...]==] to handle code containing ]=]
      const checkResult = await engine.doString(`
        local code = [==[${code}]==]
        -- Try as statement first
        local fn, err = load(code)
        if fn then
          return "complete"
        end
        -- Try as expression (like REPL does)
        local fn2, err2 = load("return (" .. code .. ")")
        if fn2 then
          return "complete"
        end
        -- Return the original error (from statement parsing)
        return err
      `)

      if (checkResult === 'complete') {
        return { complete: true }
      }

      // Check if error indicates incomplete input
      // Lua returns errors ending with "near <eof>" or "near '<eof>'" when code is incomplete
      // Real syntax errors end with "near 'X'" where X is the problematic token
      const errorStr = String(checkResult)

      // Incomplete code errors end with: near <eof> (with or without quotes)
      // This pattern is reliable because complete code with syntax errors
      // will say "near 'token'" where token is the problematic code
      const isIncomplete =
        errorStr.endsWith('<eof>') || errorStr.endsWith("<eof>'")

      // Always return the error string - callers can decide whether to show it
      // For REPL: check `complete` to determine if more input is needed
      // For file editing: show the error regardless of `complete` status
      return { complete: false, error: isIncomplete ? undefined : errorStr, incompleteError: isIncomplete ? errorStr : undefined }
    } catch (error) {
      // If the check itself fails, treat as syntax error
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { complete: false, error: errorMsg }
    }
  }
}
