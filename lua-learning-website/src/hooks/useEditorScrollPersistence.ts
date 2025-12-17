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
 * Tracks scroll position on every scroll event so it's always up-to-date.
 * When the active tab changes, restores the saved position.
 *
 * @param options - Configuration options
 * @returns Object with setEditor callback
 */
export function useEditorScrollPersistence(
  options: UseEditorScrollPersistenceOptions
): UseEditorScrollPersistenceReturn {
  const { activeTab } = options
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const pendingScrollRestoreRef = useRef<string | null>(null)
  const contentChangeListenerRef = useRef<IDisposable | null>(null)
  const scrollListenerRef = useRef<IDisposable | null>(null)
  const activeTabRef = useRef<string | null>(activeTab)
  const previousActiveTabRef = useRef<string | null>(null)

  // Keep activeTabRef in sync (needed for scroll listener callback)
  activeTabRef.current = activeTab

  // CRITICAL: Set pendingScrollRestoreRef SYNCHRONOUSLY during render, not in useEffect
  // This is because Monaco's onMount effect (which calls setEditor) runs before our useEffect,
  // so if we set pendingScrollRestoreRef in useEffect, it won't be set when onDidChangeModelContent fires
  if (activeTab !== previousActiveTabRef.current) {
    if (activeTab) {
      pendingScrollRestoreRef.current = activeTab
    }
    previousActiveTabRef.current = activeTab
  }

  // Set editor reference and set up listeners
  const setEditor = useCallback((monacoEditor: editor.IStandaloneCodeEditor | null) => {
    // Clean up previous listeners
    if (contentChangeListenerRef.current) {
      contentChangeListenerRef.current.dispose()
      contentChangeListenerRef.current = null
    }
    if (scrollListenerRef.current) {
      scrollListenerRef.current.dispose()
      scrollListenerRef.current = null
    }

    editorRef.current = monacoEditor

    if (monacoEditor) {
      // Track scroll position on EVERY scroll event
      // This ensures we always have the latest position saved, even if
      // the editor unmounts before useEffect can save it
      scrollListenerRef.current = monacoEditor.onDidScrollChange(() => {
        const currentTab = activeTabRef.current
        if (currentTab) {
          scrollPositions.set(currentTab, monacoEditor.getScrollTop())
        }
      })

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

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (contentChangeListenerRef.current) {
        contentChangeListenerRef.current.dispose()
      }
      if (scrollListenerRef.current) {
        scrollListenerRef.current.dispose()
      }
    }
  }, [])

  return { setEditor }
}
