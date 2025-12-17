import { useRef, useEffect, useCallback } from 'react'
import type { editor } from 'monaco-editor'

// Module-level map to persist scroll positions across re-renders
const scrollPositions = new Map<string, number>()

/**
 * Options for the useEditorScrollPersistence hook
 */
export interface UseEditorScrollPersistenceOptions {
  /** Currently active file path */
  activeTab: string | null
}

/**
 * Return type for the useEditorScrollPersistence hook
 */
export interface UseEditorScrollPersistenceReturn {
  /** Call this when editor instance is ready */
  setEditor: (editor: editor.IStandaloneCodeEditor | null) => void
}

/**
 * Hook that persists and restores scroll positions when switching between editor tabs.
 *
 * Stores scroll positions in a module-level Map so they persist across re-renders.
 * When the active tab changes, saves the current position and restores the new tab's position.
 *
 * @param options - Configuration options
 * @returns Object with setEditor callback
 */
export function useEditorScrollPersistence(
  options: UseEditorScrollPersistenceOptions
): UseEditorScrollPersistenceReturn {
  const { activeTab } = options
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const previousTabRef = useRef<string | null>(null)

  // Save scroll position for the previous tab before switching
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    // Save scroll position for the previous tab
    if (previousTabRef.current && previousTabRef.current !== activeTab) {
      scrollPositions.set(previousTabRef.current, editor.getScrollTop())
    }

    // Restore scroll position for the new tab (after a microtask to ensure content is loaded)
    if (activeTab) {
      // Use setTimeout to ensure the editor content has been updated
      const timeoutId = setTimeout(() => {
        const savedPosition = scrollPositions.get(activeTab)
        if (savedPosition !== undefined) {
          editor.setScrollTop(savedPosition)
        } else {
          // First time opening this file - scroll to top
          editor.setScrollTop(0)
        }
      }, 0)

      previousTabRef.current = activeTab
      return () => clearTimeout(timeoutId)
    }

    previousTabRef.current = activeTab
  }, [activeTab])

  // Set editor reference
  const setEditor = useCallback((editor: editor.IStandaloneCodeEditor | null) => {
    editorRef.current = editor
  }, [])

  return { setEditor }
}
