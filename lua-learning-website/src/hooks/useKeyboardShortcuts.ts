import { useEffect, useCallback } from 'react'
import { hasModifierKey } from '../utils/platformShortcuts'

export interface UseKeyboardShortcutsOptions {
  toggleTerminal: () => void
  toggleSidebar: () => void
  saveFile: () => void
  saveAllFiles?: () => void
}

/**
 * Hook for IDE keyboard shortcuts (cross-platform: Cmd on Mac, Ctrl on Windows/Linux)
 * - Cmd/Ctrl+`: Toggle terminal
 * - Cmd/Ctrl+B: Toggle sidebar
 * - Cmd/Ctrl+S: Save file
 * - Cmd/Ctrl+Shift+S: Save all files
 */
export function useKeyboardShortcuts({
  toggleTerminal,
  toggleSidebar,
  saveFile,
  saveAllFiles,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts with platform modifier key (Cmd on Mac, Ctrl on Windows/Linux)
      if (!hasModifierKey(event)) return

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
          // Ctrl+Shift+S: Save All, Ctrl+S: Save current file
          if (event.shiftKey && saveAllFiles) {
            saveAllFiles()
          } else {
            saveFile()
          }
          break
      }
    },
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
    [toggleTerminal, toggleSidebar, saveFile, saveAllFiles]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [handleKeyDown])
}
