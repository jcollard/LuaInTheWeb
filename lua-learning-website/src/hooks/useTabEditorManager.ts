import { useState, useCallback, useRef, useEffect } from 'react'
import type { TabInfo } from '../components/TabBar/types'

/** Maximum number of editors to mount simultaneously */
const MAX_MOUNTED = 10

/** Per-tab content state */
interface TabContentState {
  content: string
  originalContent: string
}

/** Minimal filesystem interface for the hook */
export interface TabEditorFileSystem {
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => void
}

/** Props for useTabEditorManager hook */
export interface UseTabEditorManagerProps {
  /** All open tabs */
  tabs: TabInfo[]
  /** Currently active tab path */
  activeTab: string | null
  /** Filesystem for reading/writing content */
  filesystem: TabEditorFileSystem
  /** Optional callback to check if a path is read-only */
  isPathReadOnly?: (path: string) => boolean
  /** Optional callback when a tab's dirty state changes */
  onDirtyChange?: (path: string, isDirty: boolean) => void
}

/** Return type for useTabEditorManager hook */
export interface UseTabEditorManagerReturn {
  /** Array of tab paths that should have mounted editors (max 5) */
  mountedTabs: string[]
  /** Get content for a specific tab */
  getContent: (path: string | null) => string
  /** Get content of the active tab */
  getActiveContent: () => string
  /** Update content for a specific tab */
  updateContent: (path: string, content: string) => void
  /** Check if a tab has unsaved changes */
  isDirty: (path: string) => boolean
  /** Save a specific tab to filesystem. Returns false if read-only or failed. */
  saveTab: (path: string) => boolean
  /** Save all dirty tabs */
  saveAllTabs: () => void
  /** Dispose a tab (remove from memory and MRU) */
  disposeTab: (path: string) => void
  /** Reload content from filesystem (for non-dirty tabs only) */
  refreshFromFilesystem: (path: string) => void
}

/**
 * Hook that manages per-tab editor content and MRU-based virtualization.
 *
 * Responsibilities:
 * - Track content for each file tab (Map<path, { content, originalContent }>)
 * - Maintain MRU (most recently used) list for virtualization
 * - Compute which tabs should have mounted editors (max 5)
 * - Handle save operations with dirty state tracking
 * - Support external file refresh (window focus)
 */
export function useTabEditorManager({
  tabs,
  activeTab,
  filesystem,
  isPathReadOnly,
  onDirtyChange,
}: UseTabEditorManagerProps): UseTabEditorManagerReturn {
  // Per-tab content state
  const [tabContents, setTabContents] = useState<Map<string, TabContentState>>(new Map())

  // MRU (most recently used) list of file tab paths
  const [mruList, setMruList] = useState<string[]>([])

  // Ref to track which tabs we've already loaded
  const loadedTabsRef = useRef<Set<string>>(new Set())

  // Ref to track previous dirty states for callback
  const dirtyStatesRef = useRef<Map<string, boolean>>(new Map())

  // Filter for file tabs only (exclude canvas, markdown, binary)
  const isFileTab = useCallback((tab: TabInfo): boolean => {
    return tab.type === 'file'
  }, [])

  // Load content for a tab from filesystem if not already loaded
  const loadTabContent = useCallback(
    (path: string) => {
      if (loadedTabsRef.current.has(path)) return

      const content = filesystem.readFile(path)
      if (content !== null) {
        setTabContents((prev) => {
          const next = new Map(prev)
          next.set(path, { content, originalContent: content })
          return next
        })
        loadedTabsRef.current.add(path)
      }
    },
    [filesystem]
  )

  // Update MRU when active tab changes
  useEffect(() => {
    if (!activeTab) return

    // Only track file tabs
    const tab = tabs.find((t) => t.path === activeTab)
    if (!tab || !isFileTab(tab)) return

    // Load content if needed
    loadTabContent(activeTab)

    // Update MRU list - move active tab to front
    setMruList((prev) => {
      const filtered = prev.filter((p) => p !== activeTab)
      return [activeTab, ...filtered]
    })
  }, [activeTab, tabs, isFileTab, loadTabContent])

  // Compute mounted tabs: most recent up to MAX_MOUNTED (stable sort order for React)
  const mountedTabs = (() => {
    // Filter MRU to only include tabs that still exist and are file tabs
    const existingFileTabs = new Set(tabs.filter(isFileTab).map((t) => t.path))
    const validMru = mruList.filter((path) => existingFileTabs.has(path))

    // Collect tabs to mount (use Set to avoid duplicates)
    const tabsToMount = new Set<string>()

    // Always include active tab if it's a file tab
    if (activeTab && existingFileTabs.has(activeTab)) {
      tabsToMount.add(activeTab)
    }

    // Add from MRU until we have MAX_MOUNTED
    for (const path of validMru) {
      if (tabsToMount.size >= MAX_MOUNTED) break
      tabsToMount.add(path)
    }

    // Sort for stable DOM order (prevents React from reordering DOM elements)
    return [...tabsToMount].sort()
  })()

  // Get content for a specific tab
  const getContent = useCallback(
    (path: string | null): string => {
      if (!path) return ''
      const state = tabContents.get(path)
      return state?.content ?? ''
    },
    [tabContents]
  )

  // Get content of the active tab
  const getActiveContent = useCallback((): string => {
    return getContent(activeTab)
  }, [activeTab, getContent])

  // Update content for a specific tab
  const updateContent = useCallback(
    (path: string, content: string) => {
      setTabContents((prev) => {
        const existing = prev.get(path)
        if (!existing) {
          // Tab not loaded yet - load it first
          const originalContent = filesystem.readFile(path) ?? ''
          const next = new Map(prev)
          next.set(path, { content, originalContent })
          return next
        }

        const next = new Map(prev)
        next.set(path, { ...existing, content })
        return next
      })

      // Check dirty state change
      const state = tabContents.get(path)
      if (state && onDirtyChange) {
        const wasDirty = dirtyStatesRef.current.get(path) ?? false
        const isNowDirty = content !== state.originalContent
        if (wasDirty !== isNowDirty) {
          dirtyStatesRef.current.set(path, isNowDirty)
          onDirtyChange(path, isNowDirty)
        }
      }
    },
    [filesystem, onDirtyChange, tabContents]
  )

  // Check if a tab has unsaved changes
  const isDirty = useCallback(
    (path: string): boolean => {
      const state = tabContents.get(path)
      if (!state) return false
      return state.content !== state.originalContent
    },
    [tabContents]
  )

  // Save a specific tab
  const saveTab = useCallback(
    (path: string): boolean => {
      // Check read-only
      if (isPathReadOnly?.(path)) {
        return false
      }

      const state = tabContents.get(path)
      if (!state) return false

      filesystem.writeFile(path, state.content)

      // Update original content to match current
      setTabContents((prev) => {
        const next = new Map(prev)
        const current = next.get(path)
        if (current) {
          next.set(path, { ...current, originalContent: current.content })
        }
        return next
      })

      // Update dirty state
      if (onDirtyChange) {
        dirtyStatesRef.current.set(path, false)
        onDirtyChange(path, false)
      }

      return true
    },
    [filesystem, isPathReadOnly, onDirtyChange, tabContents]
  )

  // Save all dirty tabs
  const saveAllTabs = useCallback(() => {
    tabContents.forEach((state, path) => {
      if (state.content !== state.originalContent) {
        if (!isPathReadOnly?.(path)) {
          saveTab(path)
        }
      }
    })
  }, [isPathReadOnly, saveTab, tabContents])

  // Dispose a tab (remove from memory and MRU)
  const disposeTab = useCallback((path: string) => {
    setTabContents((prev) => {
      if (!prev.has(path)) return prev
      const next = new Map(prev)
      next.delete(path)
      return next
    })

    setMruList((prev) => prev.filter((p) => p !== path))

    loadedTabsRef.current.delete(path)
    dirtyStatesRef.current.delete(path)
  }, [])

  // Reload content from filesystem (for non-dirty tabs only)
  const refreshFromFilesystem = useCallback(
    (path: string) => {
      const state = tabContents.get(path)
      // Don't reload dirty tabs
      if (state && state.content !== state.originalContent) {
        return
      }

      const content = filesystem.readFile(path)
      if (content !== null) {
        setTabContents((prev) => {
          const next = new Map(prev)
          next.set(path, { content, originalContent: content })
          return next
        })
      }
    },
    [filesystem, tabContents]
  )

  return {
    mountedTabs,
    getContent,
    getActiveContent,
    updateContent,
    isDirty,
    saveTab,
    saveAllTabs,
    disposeTab,
    refreshFromFilesystem,
  }
}
