import { useState, useEffect, useRef, useCallback } from 'react'
import type { LuaEngine } from 'wasmoon'
import { LuaEngineFactory } from '@lua-learning/lua-runtime'

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
 * Hook that provides a Lua REPL environment.
 * Uses LuaEngineFactory for consistent io.read/io.write behavior.
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

  /**
   * Add REPL-specific commands to the engine (clear, help, reset).
   * These are not part of standard Lua but useful for the REPL.
   */
  const addReplCommands = useCallback((engine: LuaEngine) => {
    engine.global.set('clear', () => {
      onClearRef.current?.()
    })

    engine.global.set('help', () => {
      onShowHelpRef.current?.()
    })

    engine.global.set('reset', () => {
      onResetRequestRef.current?.()
    })
  }, [])

  /**
   * Create a new Lua engine using LuaEngineFactory.
   */
  const createEngine = useCallback(async (): Promise<LuaEngine> => {
    const engine = await LuaEngineFactory.create({
      onOutput: (msg) => onOutputRef.current?.(msg),
      onError: (msg) => onErrorRef.current?.(msg),
      onReadInput: async (charCount) => {
        if (onReadInputRef.current) {
          return await onReadInputRef.current(charCount)
        }
        return ''
      },
    })

    addReplCommands(engine)
    return engine
  }, [addReplCommands])

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return
    initializedRef.current = true

    const initEngine = async () => {
      const engine = await createEngine()
      engineRef.current = engine
      setIsReady(true)
    }

    initEngine()

    return () => {
      // Use deferred close to prevent WebAssembly memory errors
      LuaEngineFactory.closeDeferred(engineRef.current)
      engineRef.current = null
    }
  }, [createEngine])

  const executeCode = useCallback(async (code: string) => {
    if (!code.trim() || !engineRef.current) return

    try {
      // Try to execute as a statement first
      await engineRef.current.doString(code)
      // Flush any buffered output
      LuaEngineFactory.flushOutput(engineRef.current)
    } catch {
      // If it fails, try to evaluate as an expression and display the formatted result
      try {
        const formatted = await engineRef.current.doString(
          `return __format_value((${code}))`
        )
        // Flush any buffered output
        LuaEngineFactory.flushOutput(engineRef.current)
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
    // Use deferred close to prevent WebAssembly memory errors
    LuaEngineFactory.closeDeferred(engineRef.current)
    engineRef.current = null

    // Reinitialize engine
    const engine = await createEngine()
    engineRef.current = engine

    // Call reset callback
    onResetRef.current?.()
  }, [createEngine])

  return {
    isReady,
    executeCode,
    reset,
  }
}
