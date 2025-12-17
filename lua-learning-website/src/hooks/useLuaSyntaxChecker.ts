import { useState, useCallback, useEffect, useRef } from 'react'
import { LuaParser } from '../utils/LuaParser'

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
 * Uses luaparse (pure JavaScript) to parse code without executing it.
 * This avoids WASM-related errors that can occur with wasmoon.
 * Checks are debounced to avoid performance issues on rapid typing.
 *
 * @returns Functions and state for syntax checking
 */
export function useLuaSyntaxChecker(): UseLuaSyntaxCheckerReturn {
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Perform syntax check using luaparse
  const performCheck = useCallback((code: string) => {
    // Empty code is always valid
    if (!code.trim()) {
      setSyntaxError(null)
      return
    }

    setIsChecking(true)
    try {
      const result = LuaParser.checkSyntax(code)

      if (result.valid) {
        // Code is syntactically valid
        setSyntaxError(null)
      } else if (result.error) {
        // Code has a syntax error - format it nicely
        const { message, line, column } = result.error
        if (line !== undefined) {
          const colPart = column !== undefined ? `:${column}` : ''
          setSyntaxError(`[string "..."]:${line}${colPart}: ${message}`)
        } else {
          setSyntaxError(message)
        }
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
