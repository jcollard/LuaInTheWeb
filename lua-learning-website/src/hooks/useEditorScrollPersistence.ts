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
  /** Current code content - used to detect when Monaco has loaded new content */
  code?: string
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
  const { activeTab, code } = options
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const pendingScrollRestoreRef = useRef<string | null>(null)
  const isRestoringRef = useRef<boolean>(false)
  const contentChangeListenerRef = useRef<IDisposable | null>(null)
  const scrollListenerRef = useRef<IDisposable | null>(null)
  const modelChangeListenerRef = useRef<IDisposable | null>(null)
  const activeTabRef = useRef<string | null>(activeTab)
  const previousActiveTabRef = useRef<string | null>(null)

  // Keep activeTabRef in sync (needed for scroll listener callback)
  activeTabRef.current = activeTab

  // CRITICAL: Set pendingScrollRestoreRef SYNCHRONOUSLY during render, not in useEffect
  // This is because Monaco's onMount effect (which calls setEditor) runs before our useEffect,
  // so if we set pendingScrollRestoreRef in useEffect, it won't be set when onDidChangeModelContent fires
  if (activeTab !== previousActiveTabRef.current) {
    // Save scroll position for the OLD tab before switching
    // This must happen before we change anything, while the editor still has old content
    const previousTab = previousActiveTabRef.current
    if (previousTab && editorRef.current) {
      scrollPositions.set(previousTab, editorRef.current.getScrollTop())
    }

    if (activeTab) {
      pendingScrollRestoreRef.current = activeTab
      // Prevent saving scroll positions until restoration is complete
      // This is critical because onDidScrollChange fires during content loading
      // and would overwrite the saved position before we can restore it
      // Only set this flag on actual tab switches, not initial mount
      if (previousActiveTabRef.current !== null) {
        isRestoringRef.current = true
      }
    }
    previousActiveTabRef.current = activeTab
  }

  // Helper to restore scroll position for the current active tab
  const restoreScrollForTab = useCallback((monacoEditor: editor.IStandaloneCodeEditor, tab: string) => {
    // Use RAF to ensure Monaco has finished rendering
    requestAnimationFrame(() => {
      const savedPosition = scrollPositions.get(tab)
      if (savedPosition !== undefined) {
        monacoEditor.setScrollTop(savedPosition)
      } else {
        // First time opening this file - scroll to top
        monacoEditor.setScrollTop(0)
      }
      // Clear the restoring flag after a brief delay to allow the scroll to settle
      // This ensures onDidScrollChange doesn't save until user actually scrolls
      requestAnimationFrame(() => {
        isRestoringRef.current = false
      })
    })
  }, [])

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
    if (modelChangeListenerRef.current) {
      modelChangeListenerRef.current.dispose()
      modelChangeListenerRef.current = null
    }

    editorRef.current = monacoEditor

    if (monacoEditor) {
      // Track scroll position on EVERY scroll event
      // This ensures we always have the latest position saved, even if
      // the editor unmounts before useEffect can save it
      scrollListenerRef.current = monacoEditor.onDidScrollChange(() => {
        // Skip saving during restoration - onDidScrollChange fires when content loads
        // and we don't want to overwrite the saved position
        if (isRestoringRef.current) {
          return
        }
        const currentTab = activeTabRef.current
        if (currentTab) {
          scrollPositions.set(currentTab, monacoEditor.getScrollTop())
        }
      })

      // Listen for content changes to restore scroll position after tab switch
      // This handles the case where Monaco's content changes trigger a model update
      contentChangeListenerRef.current = monacoEditor.onDidChangeModelContent(() => {
        const pendingTab = pendingScrollRestoreRef.current
        if (pendingTab) {
          restoreScrollForTab(monacoEditor, pendingTab)
          pendingScrollRestoreRef.current = null
        }
      })

      // Also listen for model changes (when the entire model is replaced)
      // This handles cases where @monaco-editor/react creates a new model
      modelChangeListenerRef.current = monacoEditor.onDidChangeModel(() => {
        const pendingTab = pendingScrollRestoreRef.current
        if (pendingTab) {
          restoreScrollForTab(monacoEditor, pendingTab)
          pendingScrollRestoreRef.current = null
        }
      })

      // IMPORTANT: If there's a pending scroll restore when the editor mounts,
      // restore it after content loads. Don't restore immediately as content
      // hasn't been set yet.
    }
  }, [restoreScrollForTab])

  // Track previous code to detect content changes
  const previousCodeRef = useRef<string | undefined>(undefined)

  // Restore scroll when code changes (fallback mechanism)
  // Monaco events (onDidChangeModelContent/onDidChangeModel) should handle this,
  // but as a fallback, we also watch for code prop changes
  useEffect(() => {
    // Skip if no activeTab, no editor, or code hasn't changed
    if (!activeTab || !editorRef.current || code === previousCodeRef.current) {
      previousCodeRef.current = code
      return
    }

    previousCodeRef.current = code

    // Check if we have a pending scroll restore for this tab
    const pendingTab = pendingScrollRestoreRef.current
    if (pendingTab === activeTab) {
      // Use setTimeout + RAF to ensure Monaco has fully rendered the new content
      const timeoutId = setTimeout(() => {
        if (!editorRef.current) return

        requestAnimationFrame(() => {
          if (!editorRef.current) return

          const savedPosition = scrollPositions.get(activeTab)
          if (savedPosition !== undefined) {
            editorRef.current.setScrollTop(savedPosition)
          } else {
            editorRef.current.setScrollTop(0)
          }
          pendingScrollRestoreRef.current = null
          // Clear the restoring flag after scroll settles
          requestAnimationFrame(() => {
            isRestoringRef.current = false
          })
        })
      }, 50) // Small delay for Monaco to process

      return () => clearTimeout(timeoutId)
    }
  }, [code, activeTab])

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (contentChangeListenerRef.current) {
        contentChangeListenerRef.current.dispose()
      }
      if (scrollListenerRef.current) {
        scrollListenerRef.current.dispose()
      }
      if (modelChangeListenerRef.current) {
        modelChangeListenerRef.current.dispose()
      }
    }
  }, [])

  return { setEditor }
}
