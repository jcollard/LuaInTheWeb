import { useCallback, useEffect } from 'react'
import { useAutoSave } from '../../hooks/useAutoSave'
import type { TabInfo } from '../TabBar'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'
import type { AdaptedFileSystem } from '../../hooks/compositeFileSystemAdapter'

export interface UseIDEAutoSaveOptions {
  tabs: TabInfo[]
  activeTab: string | null
  code: string
  unsavedContent: Map<string, string>
  isDirty: boolean
  isPathReadOnly?: (path: string) => boolean
  filesystem: UseFileSystemReturn | AdaptedFileSystem
  setOriginalContent: React.Dispatch<React.SetStateAction<Map<string, string>>>
  setUnsavedContent: React.Dispatch<React.SetStateAction<Map<string, string>>>
  setDirty: (path: string, isDirty: boolean) => void
}

export interface UseIDEAutoSaveReturn {
  autoSaveEnabled: boolean
  toggleAutoSave: () => void
  saveAllFiles: () => void
  notifyAutoSave: () => void
}

/**
 * Hook that provides auto-save functionality for the IDE context.
 * Extracts auto-save logic to keep IDEContextProvider within line limits.
 */
export function useIDEAutoSave({
  tabs,
  activeTab,
  code,
  unsavedContent,
  isDirty,
  isPathReadOnly,
  filesystem,
  setOriginalContent,
  setUnsavedContent,
  setDirty,
}: UseIDEAutoSaveOptions): UseIDEAutoSaveReturn {
  // Save all dirty files at once
  const saveAllFiles = useCallback(() => {
    const dirtyTabs = tabs.filter(tab => tab.isDirty && tab.type === 'file')
    for (const tab of dirtyTabs) {
      if (isPathReadOnly?.(tab.path)) continue
      const content = tab.path === activeTab ? code : unsavedContent.get(tab.path)
      if (content !== undefined) {
        filesystem.writeFile(tab.path, content)
        setOriginalContent(prev => { const next = new Map(prev); next.set(tab.path, content); return next })
        setUnsavedContent(prev => { if (prev.has(tab.path)) { const next = new Map(prev); next.delete(tab.path); return next } return prev })
        setDirty(tab.path, false)
      }
    }
  }, [activeTab, code, filesystem, isPathReadOnly, tabs, setDirty, unsavedContent, setOriginalContent, setUnsavedContent])

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
