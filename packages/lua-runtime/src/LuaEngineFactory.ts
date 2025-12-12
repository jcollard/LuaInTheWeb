/**
 * Factory for creating and managing Lua engines with standard callbacks.
 * Provides consistent engine setup for REPL and script execution.
 */

import { LuaFactory, type LuaEngine } from 'wasmoon'
import { LUA_FORMATTER_CODE } from './lua/formatter'

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
   * @returns Configured Lua engine
   */
  static async create(callbacks: LuaEngineCallbacks): Promise<LuaEngine> {
    const factory = new LuaFactory()
    const engine = await factory.createEngine()

    // Setup print function (adds newline like standard Lua print)
    engine.global.set('print', (...args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (arg === null) return 'nil'
          if (arg === undefined) return 'nil'
          return String(arg)
        })
        .join('\t')
      callbacks.onOutput(message + '\n')
    })

    // Setup io.write output (no newline, unlike print)
    engine.global.set('__js_write', (text: string) => {
      callbacks.onOutput(text)
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

    // Setup formatter and io functions
    await engine.doString(LUA_FORMATTER_CODE)
    await engine.doString(LUA_IO_CODE)

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
   * Close the Lua engine and release resources.
   * @param engine - The engine to close
   */
  static close(engine: LuaEngine): void {
    engine.global.close()
  }
}
