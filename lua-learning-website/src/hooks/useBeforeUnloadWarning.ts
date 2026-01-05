import { useEffect, useCallback } from 'react'

/**
 * Hook to warn users before leaving the page.
 * Always shows browser's native "Leave site?" dialog when attempting to close/navigate.
 *
 * Note: Modern browsers show a generic message like "Changes you made may not be saved."
 * Custom messages are ignored for security reasons.
 */
export function useBeforeUnloadWarning(): void {
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    // Standard way to trigger browser's leave confirmation
    event.preventDefault()
    // Legacy browsers require returnValue to be set
    // Stryker disable next-line StringLiteral: Browser requires empty string, not null/undefined
    event.returnValue = ''
  }, [])

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array
  }, [handleBeforeUnload])
}
