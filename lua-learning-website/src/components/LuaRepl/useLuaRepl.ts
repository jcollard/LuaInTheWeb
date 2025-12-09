import { useState, useEffect, useRef, useCallback } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'

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
      // If it fails, try to evaluate as an expression and display the result
      try {
        const result = await engineRef.current.doString(`return ${code}`)
        // Display the result if it's not nil
        if (result !== null && result !== undefined) {
          onOutputRef.current?.(String(result))
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
