import { useRef, useEffect, useCallback } from 'react'
import type { editor, IDisposable } from 'monaco-editor'

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
  const pendingScrollRestoreRef = useRef<string | null>(null)
  const contentChangeListenerRef = useRef<IDisposable | null>(null)

  // Save scroll position for the previous tab before switching
  useEffect(() => {
    const monacoEditor = editorRef.current

    // Save scroll position for the previous tab (only if editor is mounted)
    if (monacoEditor && previousTabRef.current && previousTabRef.current !== activeTab) {
      scrollPositions.set(previousTabRef.current, monacoEditor.getScrollTop())
    }

    // Always mark that we need to restore scroll after content changes
    // This must happen even if editor isn't mounted yet (e.g., switching from markdown tab)
    if (activeTab) {
      pendingScrollRestoreRef.current = activeTab
    }

    previousTabRef.current = activeTab
  }, [activeTab])

  // Set editor reference and set up content change listener
  const setEditor = useCallback((monacoEditor: editor.IStandaloneCodeEditor | null) => {
    // Clean up previous listener
    if (contentChangeListenerRef.current) {
      contentChangeListenerRef.current.dispose()
      contentChangeListenerRef.current = null
    }

    editorRef.current = monacoEditor

    if (monacoEditor) {
      // Listen for content changes to restore scroll position after tab switch
      contentChangeListenerRef.current = monacoEditor.onDidChangeModelContent(() => {
        const pendingTab = pendingScrollRestoreRef.current
        if (pendingTab) {
          // Use requestAnimationFrame to ensure Monaco has finished rendering
          requestAnimationFrame(() => {
            const savedPosition = scrollPositions.get(pendingTab)
            if (savedPosition !== undefined) {
              monacoEditor.setScrollTop(savedPosition)
            } else {
              // First time opening this file - scroll to top
              monacoEditor.setScrollTop(0)
            }
          })
          pendingScrollRestoreRef.current = null
        }
      })
    }
  }, [])

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (contentChangeListenerRef.current) {
        contentChangeListenerRef.current.dispose()
      }
    }
  }, [])

  return { setEditor }
}
