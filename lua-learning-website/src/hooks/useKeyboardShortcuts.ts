import { useEffect, useCallback } from 'react'

export interface UseKeyboardShortcutsOptions {
  toggleTerminal: () => void
  toggleSidebar: () => void
  saveFile: () => void
}

/**
 * Hook for IDE keyboard shortcuts
 * - Ctrl+`: Toggle terminal
 * - Ctrl+B: Toggle sidebar
 * - Ctrl+S: Save file
 */
export function useKeyboardShortcuts({
  toggleTerminal,
  toggleSidebar,
  saveFile,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts with Ctrl key
      if (!event.ctrlKey) return

      switch (event.key) {
        case '`':
          event.preventDefault()
          toggleTerminal()
          break
        case 'b':
        case 'B':
          event.preventDefault()
          toggleSidebar()
          break
        case 's':
        case 'S':
          event.preventDefault()
          saveFile()
          break
      }
    },
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
    [toggleTerminal, toggleSidebar, saveFile]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [handleKeyDown])
}
