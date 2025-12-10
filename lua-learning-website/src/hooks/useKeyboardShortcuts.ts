import { useEffect, useCallback } from 'react'

export interface UseKeyboardShortcutsOptions {
  runCode: () => void
  toggleTerminal: () => void
  toggleSidebar: () => void
  saveFile: () => void
  createFile?: () => void
}

/**
 * Hook for IDE keyboard shortcuts
 * - Ctrl+Enter: Run code
 * - Ctrl+`: Toggle terminal
 * - Ctrl+B: Toggle sidebar
 * - Ctrl+S: Save file
 * - Ctrl+N: Create new file
 */
export function useKeyboardShortcuts({
  runCode,
  toggleTerminal,
  toggleSidebar,
  saveFile,
  createFile,
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
        case 's':
        case 'S':
          event.preventDefault()
          saveFile()
          break
        case 'n':
        case 'N':
          if (createFile) {
            event.preventDefault()
            createFile()
          }
          break
      }
    },
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
    [runCode, toggleTerminal, toggleSidebar, saveFile, createFile]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [handleKeyDown])
}
