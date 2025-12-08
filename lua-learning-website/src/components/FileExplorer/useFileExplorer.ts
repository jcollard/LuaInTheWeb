import { useState, useCallback } from 'react'
import type { UseFileExplorerReturn, ContextMenuState, ConfirmDialogState } from './types'

const initialContextMenu: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  targetPath: null,
  targetType: null,
}

const initialConfirmDialog: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
}

export function useFileExplorer(): UseFileExplorerReturn {
  // Selection state
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  // Expanded folders state
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // Renaming state
  const [renamingPath, setRenamingPath] = useState<string | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenu)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(initialConfirmDialog)

  // Selection handlers
  const selectPath = useCallback((path: string) => {
    setSelectedPath(path)
  }, [])

  // Folder expansion handlers
  const toggleFolder = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Rename handlers
  const startRename = useCallback((path: string) => {
    setRenamingPath(path)
  }, [])

  const cancelRename = useCallback(() => {
    setRenamingPath(null)
  }, [])

  // Context menu handlers
  const openContextMenu = useCallback((
    path: string,
    x: number,
    y: number,
    type: 'file' | 'folder' = 'file'
  ) => {
    setContextMenu({
      isOpen: true,
      position: { x, y },
      targetPath: path,
      targetType: type,
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(initialContextMenu)
  }, [])

  // Confirm dialog handlers
  const openConfirmDialog = useCallback((config: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({
      ...config,
      isOpen: true,
    })
  }, [])

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(initialConfirmDialog)
  }, [])

  return {
    selectedPath,
    selectPath,
    expandedPaths,
    toggleFolder,
    renamingPath,
    startRename,
    cancelRename,
    contextMenu,
    openContextMenu,
    closeContextMenu,
    confirmDialog,
    openConfirmDialog,
    closeConfirmDialog,
  }
}
