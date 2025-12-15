import { useState, useCallback, useEffect, useRef } from 'react'
import { LuaEngineFactory } from '@lua-learning/lua-runtime'
import type { LuaEngine } from 'wasmoon'

/** Debounce delay for syntax checking (ms) */
const DEBOUNCE_DELAY = 300

/**
 * Return type for the useLuaSyntaxChecker hook
 */
export interface UseLuaSyntaxCheckerReturn {
  /** Trigger a syntax check for the given code */
  checkSyntax: (code: string) => void
  /** Current syntax error message, or null if no error */
  syntaxError: string | null
  /** Whether a syntax check is currently in progress */
  isChecking: boolean
}

/**
 * Hook for real-time Lua syntax checking
 *
 * Uses a dedicated Lua engine to parse code without executing it.
 * Checks are debounced to avoid performance issues on rapid typing.
 *
 * @returns Functions and state for syntax checking
 */
export function useLuaSyntaxChecker(): UseLuaSyntaxCheckerReturn {
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const engineRef = useRef<LuaEngine | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize Lua engine for syntax checking
  useEffect(() => {
    let mounted = true

    const initEngine = async () => {
      try {
        const engine = await LuaEngineFactory.create({
          onOutput: () => {},
          onError: () => {},
          onReadInput: () => Promise.resolve(''),
        })
        if (mounted) {
          engineRef.current = engine
        } else {
          LuaEngineFactory.closeDeferred(engine)
        }
      } catch {
        // Engine creation failed - syntax checking won't work
        // but this is not critical functionality
      }
    }

    initEngine()

    return () => {
      mounted = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (engineRef.current) {
        LuaEngineFactory.closeDeferred(engineRef.current)
        engineRef.current = null
      }
    }
  }, [])

  // Perform syntax check
  const performCheck = useCallback(async (code: string) => {
    const engine = engineRef.current
    if (!engine) return

    // Empty code is always valid
    if (!code.trim()) {
      setSyntaxError(null)
      return
    }

    setIsChecking(true)
    try {
      const result = await LuaEngineFactory.isCodeComplete(engine, code)

      if (result.complete) {
        // Code is syntactically complete and valid
        setSyntaxError(null)
      } else if (result.error) {
        // Code has a syntax error
        setSyntaxError(result.error)
      } else if (result.incompleteError) {
        // Code is incomplete (e.g., unclosed parenthesis)
        // For file editing, show this as an error too
        setSyntaxError(result.incompleteError)
      } else {
        // No error information available
        setSyntaxError(null)
      }
    } catch {
      // Check failed - don't show error to user
      setSyntaxError(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  // Debounced syntax check
  const checkSyntax = useCallback(
    (code: string) => {
      // Clear any pending check
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Clear error immediately for empty code
      if (!code.trim()) {
        setSyntaxError(null)
        return
      }

      // Schedule debounced check
      debounceTimerRef.current = setTimeout(() => {
        performCheck(code)
      }, DEBOUNCE_DELAY)
    },
    [performCheck]
  )

  return {
    checkSyntax,
    syntaxError,
    isChecking,
  }
}
