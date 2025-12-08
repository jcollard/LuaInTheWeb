import { useEffect, useCallback } from 'react'

export interface UseKeyboardShortcutsOptions {
  runCode: () => void
  toggleTerminal: () => void
  toggleSidebar: () => void
}

/**
 * Hook for IDE keyboard shortcuts
 * - Ctrl+Enter: Run code
 * - Ctrl+`: Toggle terminal
 * - Ctrl+B: Toggle sidebar
 */
export function useKeyboardShortcuts({
  runCode,
  toggleTerminal,
  toggleSidebar,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts with Ctrl key
      if (!event.ctrlKey) return

      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          runCode()
          break
        case '`':
          event.preventDefault()
          toggleTerminal()
          break
        case 'b':
        case 'B':
          event.preventDefault()
          toggleSidebar()
          break
      }
    },
    [runCode, toggleTerminal, toggleSidebar]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
