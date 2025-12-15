import { useState, useEffect, useRef, useCallback } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupLuaFormatter } from './formatValue'
import { LUA_SHELL_CODE } from '@lua-learning/lua-runtime'

export interface UseLuaReplOptions {
  /** Callback when output is produced (from print or expression results) */
  onOutput?: (message: string) => void
  /** Callback when an error occurs */
  onError?: (message: string) => void
  /** Callback when io.read is called (prompts for input) */
  onReadInput?: () => Promise<string>
  /** Callback when clear() is called */
  onClear?: () => void
  /** Callback when help() is called */
  onShowHelp?: () => void
  /** Callback when reset completes */
  onReset?: () => void
  /** Callback when Lua reset() command is invoked (before reset happens) */
  onResetRequest?: () => void
  /** Get terminal width in columns (for shell.width()) */
  getTerminalWidth?: () => number
  /** Get terminal height in rows (for shell.height()) */
  getTerminalHeight?: () => number
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
  const {
    onOutput,
    onError,
    onReadInput,
    onClear,
    onShowHelp,
    onReset,
    onResetRequest,
    getTerminalWidth,
    getTerminalHeight,
  } = options
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

  const getTerminalWidthRef = useRef(getTerminalWidth)
  getTerminalWidthRef.current = getTerminalWidth

  const getTerminalHeightRef = useRef(getTerminalHeight)
  getTerminalHeightRef.current = getTerminalHeight

  const setupEngine = useCallback(async (lua: LuaEngine) => {
    // Setup the Lua formatter for value formatting
    await setupLuaFormatter(lua)

    // Override print to call onOutput (adds newline like standard Lua print)
    lua.global.set('print', (...args: unknown[]) => {
      const message = args.map(arg => {
        if (arg === null) return 'nil'
        if (arg === undefined) return 'nil'
        return String(arg)
      }).join('\t')
      onOutputRef.current?.(message + '\n')
    })

    // Set up __js_read_input for io.read
    lua.global.set('__js_read_input', async () => {
      if (onReadInputRef.current) {
        return await onReadInputRef.current()
      }
      return ''
    })

    // Set up io table with write and read functions
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

    // Set up terminal dimension bridge functions for shell library
    lua.global.set('__shell_get_width', () => {
      return getTerminalWidthRef.current?.() ?? 80
    })
    lua.global.set('__shell_get_height', () => {
      return getTerminalHeightRef.current?.() ?? 24
    })

    // Set up __js_write for shell library (outputs without newline, for ANSI sequences)
    lua.global.set('__js_write', (text: string) => {
      onOutputRef.current?.(text)
    })

    // Register shell library in package.preload for require('shell')
    await lua.doString(`
      package.preload['shell'] = function()
        ${LUA_SHELL_CODE}
      end
    `)
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
