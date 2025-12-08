import { useState, useCallback } from 'react'
import type { TabInfo, UseTabBarReturn } from './types'

export function useTabBar(): UseTabBarReturn {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const openTab = useCallback((path: string, name: string) => {
    setTabs((prev) => {
      // Check if tab already exists
      if (prev.some((tab) => tab.path === path)) {
        return prev
      }
      return [...prev, { path, name, isDirty: false }]
    })
    setActiveTab(path)
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
        tab.path === path ? { ...tab, isDirty } : tab
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

  return {
    tabs,
    activeTab,
    openTab,
    closeTab,
    selectTab,
    setDirty,
    renameTab,
  }
}
