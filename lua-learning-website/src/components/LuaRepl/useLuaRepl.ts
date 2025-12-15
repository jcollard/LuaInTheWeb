import { useState, useEffect, useRef, useCallback } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupLuaFormatter } from './formatValue'

export interface UseLuaReplOptions {
  /** Callback when output is produced (from print or expression results) */
  onOutput?: (message: string) => void
  /** Callback when an error occurs */
  onError?: (message: string) => void
  /**
   * Callback when io.read is called (prompts for input).
   * @param charCount - If provided, read exactly this many characters (no Enter required).
   *                    If undefined, read a full line (wait for Enter).
   */
  onReadInput?: (charCount?: number) => Promise<string>
  /** Callback when clear() is called */
  onClear?: () => void
  /** Callback when help() is called */
  onShowHelp?: () => void
  /** Callback when reset completes */
  onReset?: () => void
  /** Callback when Lua reset() command is invoked (before reset happens) */
  onResetRequest?: () => void
}

export interface UseLuaReplReturn {
  /** Whether the Lua engine is ready */
  isReady: boolean
  /** Execute Lua code in the REPL */
  executeCode: (code: string) => Promise<void>
  /** Reset the REPL state */
  reset: () => Promise<void>
}

/**
 * Hook that provides a Lua REPL environment
 */
export function useLuaRepl(options: UseLuaReplOptions): UseLuaReplReturn {
  const { onOutput, onError, onReadInput, onClear, onShowHelp, onReset, onResetRequest } = options
  const [isReady, setIsReady] = useState(false)
  const engineRef = useRef<LuaEngine | null>(null)
  const initializedRef = useRef(false)

  // Store callbacks in refs so they're always current when called
  const onOutputRef = useRef(onOutput)
  onOutputRef.current = onOutput

  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const onReadInputRef = useRef(onReadInput)
  onReadInputRef.current = onReadInput

  const onClearRef = useRef(onClear)
  onClearRef.current = onClear

  const onShowHelpRef = useRef(onShowHelp)
  onShowHelpRef.current = onShowHelp

  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  const onResetRequestRef = useRef(onResetRequest)
  onResetRequestRef.current = onResetRequest

  const setupEngine = useCallback(async (lua: LuaEngine) => {
    // Setup the Lua formatter for value formatting
    await setupLuaFormatter(lua)

    // Override print to call onOutput
    lua.global.set('print', (...args: unknown[]) => {
      const message = args.map(arg => {
        if (arg === null) return 'nil'
        if (arg === undefined) return 'nil'
        return String(arg)
      }).join('\t')
      onOutputRef.current?.(message)
    })

    // Set up __js_read_input for io.read
    // Accepts optional charCount for character-mode input
    lua.global.set('__js_read_input', async (charCount?: number) => {
      if (onReadInputRef.current) {
        return await onReadInputRef.current(charCount)
      }
      return ''
    })

    // Set up io table with write and read functions
    // Implements Lua 5.4 io.read() argument handling
    await lua.doString(`
      io = io or {}
      io.write = function(...)
        local args = {...}
        local output = ""
        for i, v in ipairs(args) do
          output = output .. tostring(v)
        end
        print(output)
      end

      -- Helper to normalize format string (remove * prefix if present)
      local function __normalize_format(fmt)
        if type(fmt) == "string" and fmt:sub(1, 1) == "*" then
          return fmt:sub(2)
        end
        return fmt
      end

      -- Helper to read a single value based on format
      local function __read_one(fmt)
        -- Handle numeric argument: io.read(n) reads n characters
        if type(fmt) == "number" then
          if fmt == 0 then
            return ""
          end
          local input = __js_read_input(fmt):await()
          -- Return nil at EOF (empty input)
          if input == "" then
            return nil
          end
          -- Truncate to exactly n characters (defensive: in case callback returns more)
          return input:sub(1, fmt)
        end

        -- Normalize string format (remove * prefix)
        local normalized = __normalize_format(fmt)

        -- "n" or "*n" - read and parse number
        if normalized == "n" or normalized == "number" then
          local input = __js_read_input():await()
          -- Return nil at EOF
          if input == "" then
            return nil
          end
          -- tonumber handles leading whitespace and Lua number syntax
          local num = tonumber(input)
          return num  -- Returns nil if parsing fails
        end

        -- "a" or "*a" - read all remaining input
        if normalized == "a" or normalized == "all" then
          local input = __js_read_input():await()
          -- "a" format returns empty string at EOF, never nil
          return input
        end

        -- "L" or "*L" - read line, keep newline
        if normalized == "L" then
          local input = __js_read_input():await()
          -- Return nil at EOF
          if input == "" then
            return nil
          end
          return input .. "\\n"
        end

        -- Default: "l" or "*l" or nil - read line, strip newline
        local input = __js_read_input():await()
        -- Return nil at EOF
        if input == "" then
          return nil
        end
        return input
      end

      io.read = function(...)
        local args = {...}

        -- No arguments: default to "l" (line without newline)
        if #args == 0 then
          return __read_one("l")
        end

        -- Single argument
        if #args == 1 then
          return __read_one(args[1])
        end

        -- Multiple arguments: return multiple values
        local results = {}
        for i, fmt in ipairs(args) do
          results[i] = __read_one(fmt)
        end
        return table.unpack(results)
      end
    `)

    // Set up clear() command
    lua.global.set('clear', () => {
      onClearRef.current?.()
    })

    // Set up help() command
    lua.global.set('help', () => {
      onShowHelpRef.current?.()
    })

    // Set up reset() command - defers to callback for async reset
    lua.global.set('reset', () => {
      onResetRequestRef.current?.()
    })
  }, [])

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return
    initializedRef.current = true

    const initEngine = async () => {
      const factory = new LuaFactory()
      const lua = await factory.createEngine()
      await setupEngine(lua)
      engineRef.current = lua
      setIsReady(true)
    }

    initEngine()

    return () => {
      if (engineRef.current) {
        engineRef.current.global.close()
        engineRef.current = null
      }
    }
  }, [setupEngine])

  const executeCode = useCallback(async (code: string) => {
    if (!code.trim() || !engineRef.current) return

    try {
      // Try to execute as a statement first
      await engineRef.current.doString(code)
    } catch {
      // If it fails, try to evaluate as an expression and display the formatted result
      // We format directly in Lua to avoid JS/Lua value conversion issues
      try {
        const formatted = await engineRef.current.doString(
          `return __format_value((${code}))`
        )
        // Display the result if it's not nil
        if (formatted !== 'nil') {
          onOutputRef.current?.(String(formatted))
        }
      } catch (exprError: unknown) {
        // Show the error
        const errorMsg = exprError instanceof Error ? exprError.message : String(exprError)
        onErrorRef.current?.(errorMsg)
      }
    }
  }, [])

  const reset = useCallback(async () => {
    // Close current engine
    if (engineRef.current) {
      engineRef.current.global.close()
      engineRef.current = null
    }

    // Reinitialize engine
    const factory = new LuaFactory()
    const lua = await factory.createEngine()
    await setupEngine(lua)
    engineRef.current = lua

    // Call reset callback
    onResetRef.current?.()
  }, [setupEngine])

  return {
    isReady,
    executeCode,
    reset,
  }
}
