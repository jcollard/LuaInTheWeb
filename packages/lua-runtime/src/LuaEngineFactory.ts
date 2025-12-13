/**
 * Factory for creating and managing Lua engines with standard callbacks.
 * Provides consistent engine setup for REPL and script execution.
 */

import { LuaFactory, type LuaEngine } from 'wasmoon'
import { LUA_FORMATTER_CODE } from './lua/formatter'

/**
 * Flush interval in milliseconds (~60fps).
 */
export const FLUSH_INTERVAL_MS = 16

/**
 * Maximum buffer size before immediate flush.
 */
export const MAX_BUFFER_SIZE = 1000

/**
 * WeakMap to store flush functions for each engine instance.
 * Used by close() and closeDeferred() to flush remaining output.
 */
const engineFlushMap = new WeakMap<LuaEngine, () => void>()

/**
 * Default instruction limit before prompting user (10 million).
 */
export const DEFAULT_INSTRUCTION_LIMIT = 10_000_000

/**
 * Default interval between instruction count checks.
 */
export const DEFAULT_INSTRUCTION_CHECK_INTERVAL = 1000

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
 */
export function formatLuaError(text: string): string {
  return `[error] ${text}`
}

/**
 * Callbacks for Lua engine output and input.
 */
export interface LuaEngineCallbacks {
  /** Called when Lua produces output (print, io.write) */
  onOutput: (text: string) => void
  /** Called when Lua produces an error */
  onError: (text: string) => void
  /** Called when Lua needs input (io.read) - optional */
  onReadInput?: () => Promise<string>
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
}

/**
 * Result of checking code completeness.
 */
export interface CodeCompletenessResult {
  /** Whether the code is syntactically complete */
  complete: boolean
  /** Error message if there's a syntax error (not just incomplete) */
  error?: string
}

/**
 * Generate Lua code for execution control infrastructure.
 * Note: Due to wasmoon limitations, debug hooks don't persist across doString calls.
 * The hook must be set up within each code execution using __setup_execution_hook().
 * @param lineLimit - Maximum lines before triggering callback
 * @param checkInterval - How often to check line count (every N lines)
 */
function generateExecutionControlCode(
  lineLimit: number,
  checkInterval: number
): string {
  return `
__stop_requested = false
__line_count = 0
__instruction_limit = ${lineLimit}
__check_interval = ${checkInterval}
__lines_since_check = 0

function __request_stop()
    __stop_requested = true
end

-- Internal helper for dynamic limit adjustment (used by processes)
function __set_instruction_limit(limit)
    __instruction_limit = limit
end

function __reset_instruction_count()
    __line_count = 0
    __lines_since_check = 0
end

-- Hook function that counts lines and checks for stop conditions
function __execution_hook()
    __line_count = __line_count + 1
    __lines_since_check = __lines_since_check + 1

    -- Only check conditions every check_interval lines for performance
    if __lines_since_check >= __check_interval then
        __lines_since_check = 0

        if __stop_requested then
            __stop_requested = false
            __line_count = 0
            error("Execution stopped by user", 0)
        end

        if __line_count >= __instruction_limit then
            -- Call synchronous JS callback that returns true to continue, false to stop
            -- Note: Cannot use async/await here due to Lua debug hook limitations
            local should_continue = __on_limit_reached_sync()
            if should_continue then
                __reset_instruction_count()
            else
                error("Execution stopped by instruction limit", 0)
            end
        end
    end
end

-- Set up the execution hook (must be called before executing user code)
function __setup_execution_hook()
    __reset_instruction_count()
    debug.sethook(__execution_hook, "l")
end

-- Clear the execution hook (call after user code completes)
function __clear_execution_hook()
    debug.sethook()
end
`
}

/**
 * Lua code for io.write and io.read setup.
 */
const LUA_IO_CODE = `
io = io or {}
io.write = function(...)
  local args = {...}
  local output = ""
  for i, v in ipairs(args) do
    output = output .. tostring(v)
  end
  -- Use __js_write for io.write (no automatic newline)
  __js_write(output)
end
io.read = function(format)
  local input = __js_read_input():await()
  if format == "*n" or format == "*number" then
    return tonumber(input)
  elseif format == "*a" or format == "*all" then
    return input
  else
    -- Default is "*l" or "*line"
    return input
  end
end
`

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
    let lastFlush = Date.now()

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

    // Setup io.read input handler if provided
    if (callbacks.onReadInput) {
      engine.global.set('__js_read_input', async () => {
        return await callbacks.onReadInput!()
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

    // Setup formatter, io functions, and execution control
    await engine.doString(LUA_FORMATTER_CODE)
    await engine.doString(LUA_IO_CODE)
    await engine.doString(generateExecutionControlCode(instructionLimit, checkInterval))

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
      if (errorStr.endsWith('<eof>') || errorStr.endsWith("<eof>'")) {
        return { complete: false }
      }

      // It's a real syntax error
      return { complete: false, error: errorStr }
    } catch (error) {
      // If the check itself fails, treat as syntax error
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { complete: false, error: errorMsg }
    }
  }
}
