/**
 * Development hook for testing the ErrorBoundary.
 *
 * In development mode, exposes window.__triggerErrorBoundary()
 * which can be called from the browser console to test error recovery.
 */

import { useState, useEffect } from 'react'

/**
 * Hook that listens for error trigger events and throws during render.
 *
 * Usage from browser console:
 *   window.__triggerErrorBoundary()
 *   window.__triggerErrorBoundary("Custom error message")
 */
export function useDevErrorTrigger(): void {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Only expose in development
    if (import.meta.env.DEV) {
      const trigger = (message?: string) => {
        const errorMsg = message ?? 'Test error triggered from console via __triggerErrorBoundary()'
        console.info(
          '%c[DevErrorTrigger] Triggering ErrorBoundary with message:',
          'color: orange; font-weight: bold',
          errorMsg
        )
        setErrorMessage(errorMsg)
      }

      // Expose on window for console access
      ;(window as unknown as { __triggerErrorBoundary: typeof trigger }).__triggerErrorBoundary = trigger

      console.info(
        '%c[DevErrorTrigger] ErrorBoundary test function available. Call window.__triggerErrorBoundary() to test.',
        'color: #888; font-style: italic'
      )

      return () => {
        delete (window as unknown as { __triggerErrorBoundary?: typeof trigger }).__triggerErrorBoundary
      }
    }
  }, [])

  // Throw during render to trigger ErrorBoundary
  if (errorMessage) {
    throw new Error(errorMessage)
  }
}
