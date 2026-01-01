import { useCallback } from 'react'
import type { TabInfo, UseTabBarReturn } from '../TabBar'
import type { UseTabEditorManagerReturn } from '../../hooks/useTabEditorManager'

export interface UseShellFileMoveParams {
  tabs: TabInfo[]
  tabBar: UseTabBarReturn
  tabEditorManager: UseTabEditorManagerReturn
}

/**
 * Hook for handling file/directory moves from shell commands (mv).
 * Updates tabs to reflect new paths. Content will be reloaded from
 * the new filesystem path.
 */
export function useShellFileMove({
  tabs,
  tabBar,
  tabEditorManager,
}: UseShellFileMoveParams) {
  return useCallback((oldPath: string, newPath: string, isDirectory: boolean) => {
    if (isDirectory) {
      // For directories, update all tabs that are children of the old path
      const affectedTabs = tabs.filter(t => t.path.startsWith(oldPath + '/') || t.path === oldPath)
      for (const tab of affectedTabs) {
        const relativePath = tab.path.slice(oldPath.length)
        const newTabPath = newPath + relativePath
        const newName = newTabPath.split('/').pop() || newTabPath
        // Dispose old content - new content will be loaded from new path
        tabEditorManager.disposeTab(tab.path)
        // Update tab path and name
        tabBar.renameTab(tab.path, newTabPath, newName)
      }
    } else {
      // For files, update the specific tab if it exists
      const tabIndex = tabs.findIndex(t => t.path === oldPath)
      if (tabIndex !== -1) {
        const newName = newPath.split('/').pop() || newPath
        // Dispose old content - new content will be loaded from new path
        tabEditorManager.disposeTab(oldPath)
        // Update tab path and name
        tabBar.renameTab(oldPath, newPath, newName)
      }
    }
  }, [tabs, tabBar, tabEditorManager])
}
