import { useState, useCallback, useRef } from 'react'
import type { TabInfo, TabType, UseTabBarReturn } from './types'

export interface UseTabBarOptions {
  /** Initial tabs to display */
  initialTabs?: TabInfo[]
  /** Initial active tab path */
  initialActiveTab?: string | null
}

export function useTabBar(options: UseTabBarOptions = {}): UseTabBarReturn {
  const { initialTabs = [], initialActiveTab = null } = options
  const [tabs, setTabs] = useState<TabInfo[]>(initialTabs)
  const [activeTab, setActiveTab] = useState<string | null>(initialActiveTab)

  // Ref to track current activeTab for use in callbacks (avoids stale closures)
  const activeTabRef = useRef<string | null>(activeTab)
  activeTabRef.current = activeTab

  const openTab = useCallback((path: string, name: string, type: TabType = 'file') => {
    setTabs((prev) => {
      // Check if tab already exists
      if (prev.some((tab) => tab.path === path)) {
        return prev
      }
      return [...prev, { path, name, isDirty: false, type, isPreview: false, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const openPreviewTab = useCallback((path: string, name: string) => {
    setTabs((prev) => {
      // Check if tab already exists
      const existingTab = prev.find((tab) => tab.path === path)
      if (existingTab) {
        // Just activate it, don't change preview state
        return prev
      }
      // Replace existing preview tab if there is one
      const existingPreviewIndex = prev.findIndex((tab) => tab.isPreview)
      if (existingPreviewIndex !== -1) {
        // Replace the preview tab
        const newTabs = [...prev]
        newTabs[existingPreviewIndex] = { path, name, isDirty: false, type: 'file', isPreview: true, isPinned: false }
        return newTabs
      }
      // No existing preview, add new preview tab
      return [...prev, { path, name, isDirty: false, type: 'file', isPreview: true, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const makeTabPermanent = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path ? { ...tab, isPreview: false } : tab
      )
    )
  }, [])

  const convertToFileTab = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path ? { ...tab, type: 'file', isPreview: false } : tab
      )
    )
  }, [])

  const convertToMarkdownTab = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path ? { ...tab, type: 'markdown', isPreview: false } : tab
      )
    )
  }, [])

  const closeTab = useCallback((path: string) => {
    // Use ref to get current activeTab value (avoids stale closure issue)
    const currentActiveTab = activeTabRef.current

    setTabs((prev) => {
      const tabToClose = prev.find((tab) => tab.path === path)
      // Don't close pinned tabs
      if (!tabToClose || tabToClose.isPinned) return prev

      const index = prev.findIndex((tab) => tab.path === path)
      const newTabs = prev.filter((tab) => tab.path !== path)

      // If closing active tab, select next tab
      // IMPORTANT: Use currentActiveTab from ref, not the closure value
      if (currentActiveTab === path && newTabs.length > 0) {
        // Prefer the tab that was after, or the last tab
        const newActiveIndex = Math.min(index, newTabs.length - 1)
        setActiveTab(newTabs[newActiveIndex].path)
      } else if (newTabs.length === 0) {
        setActiveTab(null)
      }

      return newTabs
    })
  }, [])

  const selectTab = useCallback((path: string) => {
    setActiveTab(path)
  }, [])

  const setDirty = useCallback((path: string, isDirty: boolean) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path
          ? { ...tab, isDirty, isPreview: isDirty ? false : tab.isPreview }
          : tab
      )
    )
  }, [])

  const renameTab = useCallback((oldPath: string, newPath: string, newName: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === oldPath ? { ...tab, path: newPath, name: newName } : tab
      )
    )
    // Update activeTab if needed
    setActiveTab((prev) => prev === oldPath ? newPath : prev)
  }, [])

  const openCanvasTab = useCallback((id: string, name: string = 'Canvas') => {
    const path = `canvas://${id}`
    setTabs((prev) => {
      // Check if tab already exists
      if (prev.some((tab) => tab.path === path)) {
        return prev
      }
      return [...prev, { path, name, isDirty: false, type: 'canvas' as const, isPreview: false, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const openAnsiTab = useCallback((id: string, name: string = 'ANSI Terminal') => {
    const path = `ansi://${id}`
    setTabs((prev) => {
      if (prev.some((tab) => tab.path === path)) {
        return prev
      }
      return [...prev, { path, name, isDirty: false, type: 'ansi' as const, isPreview: false, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const openAnsiEditorTab = useCallback(() => {
    const path = 'ansi-editor://main'
    setTabs((prev) => {
      if (prev.some((tab) => tab.path === path)) {
        return prev
      }
      return [...prev, { path, name: 'ANSI Graphics Editor', isDirty: false, type: 'ansi-editor' as const, isPreview: false, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const openMarkdownPreviewTab = useCallback((path: string, name: string) => {
    setTabs((prev) => {
      // Check if tab already exists
      const existingTab = prev.find((tab) => tab.path === path)
      if (existingTab) {
        // Just activate it, don't change preview state
        return prev
      }
      // Replace existing preview tab if there is one (any type of preview)
      const existingPreviewIndex = prev.findIndex((tab) => tab.isPreview)
      if (existingPreviewIndex !== -1) {
        // Replace the preview tab
        const newTabs = [...prev]
        newTabs[existingPreviewIndex] = { path, name, isDirty: false, type: 'markdown', isPreview: true, isPinned: false }
        return newTabs
      }
      // No existing preview, add new preview tab
      return [...prev, { path, name, isDirty: false, type: 'markdown', isPreview: true, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const openBinaryPreviewTab = useCallback((path: string, name: string) => {
    setTabs((prev) => {
      // Check if tab already exists
      const existingTab = prev.find((tab) => tab.path === path)
      if (existingTab) {
        // Just activate it, don't change preview state
        return prev
      }
      // Replace existing preview tab if there is one (any type of preview)
      const existingPreviewIndex = prev.findIndex((tab) => tab.isPreview)
      if (existingPreviewIndex !== -1) {
        // Replace the preview tab
        const newTabs = [...prev]
        newTabs[existingPreviewIndex] = { path, name, isDirty: false, type: 'binary', isPreview: true, isPinned: false }
        return newTabs
      }
      // No existing preview, add new preview tab
      return [...prev, { path, name, isDirty: false, type: 'binary', isPreview: true, isPinned: false }]
    })
    setActiveTab(path)
  }, [])

  const getActiveTabType = useCallback((): TabType | null => {
    if (!activeTab) return null
    // First, try to find the tab in the tabs array
    const tab = tabs.find((t) => t.path === activeTab)
    if (tab) return tab.type
    // Fallback: infer type from path prefix (handles race condition during tab creation)
    if (activeTab.startsWith('canvas://')) return 'canvas'
    if (activeTab.startsWith('ansi://')) return 'ansi'
    if (activeTab.startsWith('ansi-editor://')) return 'ansi-editor'
    return 'file'
  }, [activeTab, tabs])

  const pinTab = useCallback((path: string) => {
    setTabs((prev) => {
      const tabIndex = prev.findIndex((tab) => tab.path === path)
      if (tabIndex === -1) return prev

      // Mark the tab as pinned
      const updatedTabs = prev.map((tab) =>
        tab.path === path ? { ...tab, isPinned: true } : tab
      )

      // Sort: pinned tabs first (in order they were pinned), then unpinned tabs
      const pinnedTabs = updatedTabs.filter((tab) => tab.isPinned)
      const unpinnedTabs = updatedTabs.filter((tab) => !tab.isPinned)

      return [...pinnedTabs, ...unpinnedTabs]
    })
  }, [])

  const unpinTab = useCallback((path: string) => {
    setTabs((prev) => {
      const tabIndex = prev.findIndex((tab) => tab.path === path)
      if (tabIndex === -1) return prev

      // Mark the tab as unpinned
      const updatedTabs = prev.map((tab) =>
        tab.path === path ? { ...tab, isPinned: false } : tab
      )

      // Sort: pinned tabs first, then unpinned tabs
      const pinnedTabs = updatedTabs.filter((tab) => tab.isPinned)
      const unpinnedTabs = updatedTabs.filter((tab) => !tab.isPinned)

      return [...pinnedTabs, ...unpinnedTabs]
    })
  }, [])

  const reorderTab = useCallback((path: string, newIndex: number) => {
    setTabs((prev) => {
      const currentIndex = prev.findIndex((tab) => tab.path === path)
      if (currentIndex === -1) return prev

      const tab = prev[currentIndex]
      const pinnedCount = prev.filter((t) => t.isPinned).length

      // Constrain the target index based on tab type
      let targetIndex = newIndex
      if (tab.isPinned) {
        // Pinned tabs can only move within the pinned section (0 to pinnedCount-1)
        targetIndex = Math.max(0, Math.min(newIndex, pinnedCount - 1))
      } else {
        // Unpinned tabs can only move within the unpinned section (pinnedCount to end)
        targetIndex = Math.max(pinnedCount, Math.min(newIndex, prev.length - 1))
      }

      // If moving to the same position, no change needed
      if (currentIndex === targetIndex) return prev

      // Remove the tab from its current position
      const newTabs = [...prev]
      newTabs.splice(currentIndex, 1)
      // Insert at the target position
      newTabs.splice(targetIndex, 0, tab)

      return newTabs
    })
  }, [])

  const closeToRight = useCallback((path: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((tab) => tab.path === path)
      if (index === -1) return prev

      // Keep tabs up to and including the specified tab, plus any pinned tabs after
      const newTabs = prev.filter((tab, i) => i <= index || tab.isPinned)

      // Update active tab if it was closed
      const activeWasClosed = activeTab && !newTabs.some((t) => t.path === activeTab)
      if (activeWasClosed) {
        setActiveTab(path)
      }

      return newTabs
    })
  }, [activeTab])

  const closeOthers = useCallback((path: string) => {
    setTabs((prev) => {
      // Keep the specified tab and all pinned tabs
      const newTabs = prev.filter((tab) => tab.path === path || tab.isPinned)

      // Set active tab to the kept tab
      setActiveTab(path)

      return newTabs
    })
  }, [])

  return {
    tabs,
    activeTab,
    openTab,
    openPreviewTab,
    openCanvasTab,
    openAnsiTab,
    openAnsiEditorTab,
    openMarkdownPreviewTab,
    openBinaryPreviewTab,
    closeTab,
    selectTab,
    setDirty,
    renameTab,
    getActiveTabType,
    makeTabPermanent,
    convertToFileTab,
    convertToMarkdownTab,
    pinTab,
    unpinTab,
    reorderTab,
    closeToRight,
    closeOthers,
  }
}
