import { useRef, useCallback, useLayoutEffect } from 'react'
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
  // The "confirmed" active tab - only updated in useEffect, safe for scroll listener to use
  const confirmedTabRef = useRef<string | null>(null)
  // Flag to prevent saving scroll during restoration or tab transitions
  const isRestoringRef = useRef<boolean>(false)

  // Handle tab changes: save scroll for old tab, prepare for restoration
  // Using useLayoutEffect to run synchronously BEFORE Monaco processes the new model
  useLayoutEffect(() => {
    const previousTab = confirmedTabRef.current
    const newTab = activeTab

    log('Tab change effect', { previousTab, newTab })

    // If switching tabs (not initial mount), prepare for restoration
    if (previousTab !== null && previousTab !== newTab) {
      // CRITICAL: Save the scroll position for the outgoing tab FIRST
      // This must happen before Monaco changes models and fires scroll events
      if (editorRef.current && !previousTab.startsWith('canvas://')) {
        const scrollTop = editorRef.current.getScrollTop()
        scrollPositions.set(previousTab, scrollTop)
        log('Saved scroll for outgoing tab', { previousTab, scrollTop })
      }

      // Set restoring flag to prevent scroll events from overwriting saved positions
      // during the transition.
      isRestoringRef.current = true
      log('Tab switch detected, restoration mode enabled')

      // IMPORTANT: Monaco may not fire onDidChangeModel when switching between
      // already-loaded tabs. Schedule restoration manually after a brief delay
      // to ensure Monaco has updated its view.
      if (editorRef.current && newTab && !newTab.startsWith('canvas://')) {
        const editor = editorRef.current
        requestAnimationFrame(() => {
          log('Manual restoration check', { newTab, hasEditor: !!editorRef.current, sameEditor: editorRef.current === editor })
          // Only proceed if editor hasn't been replaced (e.g., by remount)
          if (editorRef.current === editor && confirmedTabRef.current === newTab) {
            const savedPosition = scrollPositions.get(newTab)
            if (savedPosition !== undefined) {
              log('Manual restoration applying', { newTab, savedPosition })
              editor.setScrollTop(savedPosition)
            }
            requestAnimationFrame(() => {
              // Only clear restoring flag if editor is still the same
              // If editor was replaced, let the new editor's initial mount handle it
              if (editorRef.current === editor) {
                isRestoringRef.current = false
                log('Manual restoration complete')
              } else {
                log('Manual restoration skipped clear - editor replaced')
              }
            })
          } else {
            log('Manual restoration aborted - editor or tab changed')
          }
        })
      }
    }

    // Update confirmed tab ref - scroll listener will now save to the new tab
    confirmedTabRef.current = newTab
  }, [activeTab])

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
    log('setEditor called', { hasEditor: !!monacoEditor, activeTab: confirmedTabRef.current })

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
        // Skip saving during restoration or tab transitions
        if (isRestoringRef.current) {
          log('Skipping scroll save (restoring in progress)')
          return
        }
        // Use confirmedTabRef - this is only updated in useEffect, so it won't
        // get confused during the React render -> Monaco model change -> useEffect sequence
        const currentTab = confirmedTabRef.current
        if (currentTab && !currentTab.startsWith('canvas://')) {
          const scrollTop = monacoEditor.getScrollTop()
          scrollPositions.set(currentTab, scrollTop)
          log('Saved scroll position', { tab: currentTab, scrollTop })
        }
      })

      // Restore scroll position when the model (document) changes
      modelChangeListenerRef.current = monacoEditor.onDidChangeModel(() => {
        const currentTab = confirmedTabRef.current
        log('onDidChangeModel fired', { currentTab })
        if (currentTab) {
          restoreScrollPosition(currentTab, monacoEditor)
        }
      })

      // Also restore scroll position on initial mount
      // (onDidChangeModel may not fire if model is already set)
      const currentTab = confirmedTabRef.current
      log('Initial mount, will restore in 50ms', { currentTab })
      if (currentTab && !currentTab.startsWith('canvas://')) {
        // Set flag immediately to prevent Monaco init scroll events from overwriting saved position
        isRestoringRef.current = true
        log('Set restoring flag for initial mount')
        // Small delay to ensure Monaco has fully initialized
        setTimeout(() => {
          log('setTimeout fired', { currentTab: confirmedTabRef.current, savedPositions: Array.from(scrollPositions.entries()) })
          if (editorRef.current && confirmedTabRef.current) {
            restoreScrollPosition(confirmedTabRef.current, editorRef.current)
          }
        }, 50)
      }
    }
  }, [restoreScrollPosition])

  return { setEditor }
}
