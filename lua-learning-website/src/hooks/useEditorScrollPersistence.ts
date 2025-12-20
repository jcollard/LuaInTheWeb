import { useRef, useCallback } from 'react'
import type { editor, IDisposable } from 'monaco-editor'

// Module-level map to persist scroll positions across re-renders
const scrollPositions = new Map<string, number>()

// Debug logging (set to true for troubleshooting)
const DEBUG = false
const log = (...args: unknown[]) => DEBUG && console.log('[ScrollPersistence]', ...args)

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
 * Hook that persists and restores scroll positions for editor tabs.
 *
 * Simple approach:
 * 1. Saves scroll position on every scroll event
 * 2. Restores scroll position after document loads (via onDidChangeModel)
 *
 * @param options - Configuration options
 * @returns Object with setEditor callback
 */
export function useEditorScrollPersistence(
  options: UseEditorScrollPersistenceOptions
): UseEditorScrollPersistenceReturn {
  const { activeTab } = options
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const scrollListenerRef = useRef<IDisposable | null>(null)
  const modelChangeListenerRef = useRef<IDisposable | null>(null)
  const activeTabRef = useRef<string | null>(activeTab)
  // Flag to prevent saving scroll during restoration (Monaco fires scroll events during init)
  const isRestoringRef = useRef<boolean>(false)

  // Keep activeTabRef in sync (needed for scroll listener callback)
  activeTabRef.current = activeTab

  // Restore scroll position for a given file path
  const restoreScrollPosition = useCallback((filePath: string, monacoEditor: editor.IStandaloneCodeEditor) => {
    log('restoreScrollPosition called', { filePath, savedPosition: scrollPositions.get(filePath) })

    // Set flag to prevent saving scroll during restoration
    isRestoringRef.current = true

    // Skip canvas tabs - they don't have scroll positions
    if (filePath.startsWith('canvas://')) {
      log('Skipping canvas tab')
      isRestoringRef.current = false
      return
    }

    // Use requestAnimationFrame to ensure Monaco has finished rendering
    requestAnimationFrame(() => {
      const savedPosition = scrollPositions.get(filePath)
      if (savedPosition !== undefined) {
        log('Restoring scroll position', { filePath, savedPosition })
        monacoEditor.setScrollTop(savedPosition)
      } else {
        log('No saved position for', filePath)
      }
      // Clear restoring flag after a brief delay to let scroll settle
      requestAnimationFrame(() => {
        isRestoringRef.current = false
        log('Restoration complete, saving enabled')
      })
    })
  }, [])

  // Set editor reference and set up listeners
  const setEditor = useCallback((monacoEditor: editor.IStandaloneCodeEditor | null) => {
    log('setEditor called', { hasEditor: !!monacoEditor, activeTab: activeTabRef.current })

    // Clean up previous listeners
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
      // Track scroll position on every scroll event
      scrollListenerRef.current = monacoEditor.onDidScrollChange(() => {
        // Skip saving during restoration (Monaco fires scroll events during init)
        if (isRestoringRef.current) {
          log('Skipping scroll save (restoring in progress)')
          return
        }
        const currentTab = activeTabRef.current
        if (currentTab && !currentTab.startsWith('canvas://')) {
          const scrollTop = monacoEditor.getScrollTop()
          scrollPositions.set(currentTab, scrollTop)
          log('Saved scroll position', { tab: currentTab, scrollTop })
        }
      })

      // Restore scroll position when the model (document) changes
      modelChangeListenerRef.current = monacoEditor.onDidChangeModel(() => {
        const currentTab = activeTabRef.current
        log('onDidChangeModel fired', { currentTab })
        if (currentTab) {
          restoreScrollPosition(currentTab, monacoEditor)
        }
      })

      // Also restore scroll position on initial mount
      // (onDidChangeModel may not fire if model is already set)
      const currentTab = activeTabRef.current
      log('Initial mount, will restore in 50ms', { currentTab })
      if (currentTab && !currentTab.startsWith('canvas://')) {
        // Set flag immediately to prevent Monaco init scroll events from overwriting saved position
        isRestoringRef.current = true
        log('Set restoring flag for initial mount')
        // Small delay to ensure Monaco has fully initialized
        setTimeout(() => {
          log('setTimeout fired', { currentTab: activeTabRef.current, savedPositions: Array.from(scrollPositions.entries()) })
          if (editorRef.current && activeTabRef.current) {
            restoreScrollPosition(activeTabRef.current, editorRef.current)
          }
        }, 50)
      }
    }
  }, [restoreScrollPosition])

  return { setEditor }
}
