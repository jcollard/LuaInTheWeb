import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { TabInfo, UseTabBarReturn } from '../TabBar'

export interface UseShellFileMoveParams {
  tabs: TabInfo[]
  tabBar: UseTabBarReturn
  setOriginalContent: Dispatch<SetStateAction<Map<string, string>>>
  setUnsavedContent: Dispatch<SetStateAction<Map<string, string>>>
}

/**
 * Hook for handling file/directory moves from shell commands (mv).
 * Updates tabs to reflect new paths without losing editor state.
 */
export function useShellFileMove({
  tabs,
  tabBar,
  setOriginalContent,
  setUnsavedContent,
}: UseShellFileMoveParams) {
  return useCallback((oldPath: string, newPath: string, isDirectory: boolean) => {
    if (isDirectory) {
      // For directories, update all tabs that are children of the old path
      const affectedTabs = tabs.filter(t => t.path.startsWith(oldPath + '/') || t.path === oldPath)
      for (const tab of affectedTabs) {
        const relativePath = tab.path.slice(oldPath.length)
        const newTabPath = newPath + relativePath
        const newName = newTabPath.split('/').pop() || newTabPath
        // Update content maps to preserve dirty state
        setOriginalContent(prev => {
          if (prev.has(tab.path)) {
            const next = new Map(prev)
            const content = next.get(tab.path)!
            next.delete(tab.path)
            next.set(newTabPath, content)
            return next
          }
          return prev
        })
        setUnsavedContent(prev => {
          if (prev.has(tab.path)) {
            const next = new Map(prev)
            const content = next.get(tab.path)!
            next.delete(tab.path)
            next.set(newTabPath, content)
            return next
          }
          return prev
        })
        // Update tab path and name
        tabBar.renameTab(tab.path, newTabPath, newName)
      }
    } else {
      // For files, update the specific tab if it exists
      const tabIndex = tabs.findIndex(t => t.path === oldPath)
      if (tabIndex !== -1) {
        const newName = newPath.split('/').pop() || newPath
        // Update content maps to preserve dirty state
        setOriginalContent(prev => {
          if (prev.has(oldPath)) {
            const next = new Map(prev)
            const content = next.get(oldPath)!
            next.delete(oldPath)
            next.set(newPath, content)
            return next
          }
          return prev
        })
        setUnsavedContent(prev => {
          if (prev.has(oldPath)) {
            const next = new Map(prev)
            const content = next.get(oldPath)!
            next.delete(oldPath)
            next.set(newPath, content)
            return next
          }
          return prev
        })
        // Update tab path and name
        tabBar.renameTab(oldPath, newPath, newName)
      }
    }
  }, [tabs, tabBar, setOriginalContent, setUnsavedContent])
}
