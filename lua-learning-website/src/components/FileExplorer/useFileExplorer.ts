import { useState, useCallback, useEffect } from 'react'
import type { UseFileExplorerReturn, ContextMenuState, ConfirmDialogState } from './types'

const STORAGE_KEY = 'lua-ide-explorer-expanded'
const DEBOUNCE_MS = 100

/**
 * Load expanded paths from localStorage
 */
function loadExpandedPaths(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const paths = JSON.parse(stored)
      if (Array.isArray(paths)) {
        return new Set(paths.filter((p): p is string => typeof p === 'string'))
      }
    }
  } catch {
    // Invalid JSON or localStorage not available
  }
  return new Set()
}

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
  confirmLabel: 'Delete',
  onConfirm: () => {},
}

export function useFileExplorer(): UseFileExplorerReturn {
  // Selection state
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  // Expanded folders state - persisted to localStorage
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(loadExpandedPaths)

  // Save expanded paths to localStorage (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedPaths]))
      } catch {
        // localStorage not available
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [expandedPaths])

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
