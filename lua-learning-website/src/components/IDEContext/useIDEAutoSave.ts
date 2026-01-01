import { useCallback, useEffect } from 'react'
import { useAutoSave } from '../../hooks/useAutoSave'
import type { TabInfo } from '../TabBar'
import type { UseTabEditorManagerReturn } from '../../hooks/useTabEditorManager'

export interface UseIDEAutoSaveOptions {
  tabs: TabInfo[]
  isDirty: boolean
  tabEditorManager: UseTabEditorManagerReturn
}

export interface UseIDEAutoSaveReturn {
  autoSaveEnabled: boolean
  toggleAutoSave: () => void
  saveAllFiles: () => void
  notifyAutoSave: () => void
}

/**
 * Hook that provides auto-save functionality for the IDE context.
 * Uses tabEditorManager for save operations.
 */
export function useIDEAutoSave({
  tabs,
  isDirty,
  tabEditorManager,
}: UseIDEAutoSaveOptions): UseIDEAutoSaveReturn {
  // Save all dirty files at once
  const saveAllFiles = useCallback(() => {
    const dirtyTabs = tabs.filter(tab => tab.isDirty && tab.type === 'file')
    if (dirtyTabs.length > 0) {
      tabEditorManager.saveAllTabs()
    }
  }, [tabs, tabEditorManager])

  // Auto-save integration
  const { autoSaveEnabled, toggleAutoSave, notifyChange: notifyAutoSave } = useAutoSave({
    onAutoSave: saveAllFiles,
  })

  // Trigger auto-save notification when content becomes dirty
  useEffect(() => {
    if (isDirty) {
      notifyAutoSave()
    }
  }, [isDirty, notifyAutoSave])

  return { autoSaveEnabled, toggleAutoSave, saveAllFiles, notifyAutoSave }
}
