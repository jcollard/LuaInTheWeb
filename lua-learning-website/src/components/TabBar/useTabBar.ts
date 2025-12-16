import { useState, useCallback } from 'react'
import type { TabInfo, TabType, UseTabBarReturn } from './types'

export function useTabBar(): UseTabBarReturn {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const openTab = useCallback((path: string, name: string, type: TabType = 'file') => {
    setTabs((prev) => {
      // Check if tab already exists
      if (prev.some((tab) => tab.path === path)) {
        return prev
      }
      return [...prev, { path, name, isDirty: false, type, isPreview: false }]
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
        newTabs[existingPreviewIndex] = { path, name, isDirty: false, type: 'file', isPreview: true }
        return newTabs
      }
      // No existing preview, add new preview tab
      return [...prev, { path, name, isDirty: false, type: 'file', isPreview: true }]
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

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((tab) => tab.path === path)
      if (index === -1) return prev

      const newTabs = prev.filter((tab) => tab.path !== path)

      // If closing active tab, select next tab
      if (activeTab === path && newTabs.length > 0) {
        // Prefer the tab that was after, or the last tab
        const newActiveIndex = Math.min(index, newTabs.length - 1)
        setActiveTab(newTabs[newActiveIndex].path)
      } else if (newTabs.length === 0) {
        setActiveTab(null)
      }

      return newTabs
    })
  }, [activeTab])

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
      return [...prev, { path, name, isDirty: false, type: 'canvas' as const, isPreview: false }]
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
        newTabs[existingPreviewIndex] = { path, name, isDirty: false, type: 'markdown', isPreview: true }
        return newTabs
      }
      // No existing preview, add new preview tab
      return [...prev, { path, name, isDirty: false, type: 'markdown', isPreview: true }]
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
    return 'file'
  }, [activeTab, tabs])

  return {
    tabs,
    activeTab,
    openTab,
    openPreviewTab,
    openCanvasTab,
    openMarkdownPreviewTab,
    closeTab,
    selectTab,
    setDirty,
    renameTab,
    getActiveTabType,
    makeTabPermanent,
    convertToFileTab,
  }
}
