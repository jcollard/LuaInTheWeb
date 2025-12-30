import { useCallback } from 'react'
import type { FileExplorerProps, WorkspaceProps } from './types'

export interface UseRenameHandlerParams {
  findNodeType: (path: string) => 'file' | 'folder' | null
  isWorkspaceRoot: (path: string) => boolean
  renamingPath: string | null
  cancelRename: () => void
  pendingNewFilePath: string | null | undefined
  pendingNewFolderPath: string | null | undefined
  onRenameFile: FileExplorerProps['onRenameFile']
  onRenameFolder: FileExplorerProps['onRenameFolder']
  onDeleteFile: FileExplorerProps['onDeleteFile']
  onDeleteFolder: FileExplorerProps['onDeleteFolder']
  onCancelPendingNewFile: FileExplorerProps['onCancelPendingNewFile']
  onCancelPendingNewFolder: FileExplorerProps['onCancelPendingNewFolder']
  workspaceProps: WorkspaceProps | undefined
}

export interface UseRenameHandlerReturn {
  handleRenameSubmit: (path: string, newName: string) => void
  handleRenameCancel: () => void
}

/**
 * Hook for handling rename submit and cancel operations.
 * Manages cleanup of pending new files/folders when rename is cancelled.
 */
export function useRenameHandler({
  findNodeType,
  isWorkspaceRoot,
  renamingPath,
  cancelRename,
  pendingNewFilePath,
  pendingNewFolderPath,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  onCancelPendingNewFile,
  onCancelPendingNewFolder,
  workspaceProps,
}: UseRenameHandlerParams): UseRenameHandlerReturn {
  const handleRenameSubmit = useCallback((path: string, newName: string) => {
    const type = findNodeType(path)
    if (type === 'folder') {
      // Check if this is a workspace root - use workspace rename instead of folder rename
      if (isWorkspaceRoot(path) && workspaceProps?.onRenameWorkspace) {
        workspaceProps.onRenameWorkspace(path, newName)
      } else {
        onRenameFolder(path, newName)
      }
    } else {
      onRenameFile(path, newName)
    }
    // Clear pending new file if this was a pending file being renamed
    if (path === pendingNewFilePath && onCancelPendingNewFile) {
      onCancelPendingNewFile()
    }
    // Clear pending new folder if this was a pending folder being renamed
    if (path === pendingNewFolderPath && onCancelPendingNewFolder) {
      onCancelPendingNewFolder()
    }
    cancelRename()
    // Stryker disable next-line all: React hooks dependency optimization
  }, [findNodeType, isWorkspaceRoot, onRenameFile, onRenameFolder, cancelRename, pendingNewFilePath, onCancelPendingNewFile, pendingNewFolderPath, onCancelPendingNewFolder, workspaceProps])

  // Handle rename cancel - delete pending new file/folder if applicable
  const handleRenameCancel = useCallback(() => {
    if (renamingPath === pendingNewFilePath && pendingNewFilePath) {
      // Delete the pending file since rename was cancelled
      onDeleteFile(pendingNewFilePath)
      if (onCancelPendingNewFile) {
        onCancelPendingNewFile()
      }
    }
    if (renamingPath === pendingNewFolderPath && pendingNewFolderPath) {
      // Delete the pending folder since rename was cancelled
      onDeleteFolder(pendingNewFolderPath)
      if (onCancelPendingNewFolder) {
        onCancelPendingNewFolder()
      }
    }
    cancelRename()
    // Stryker disable next-line all: React hooks dependency optimization
  }, [renamingPath, pendingNewFilePath, onDeleteFile, onCancelPendingNewFile, pendingNewFolderPath, onDeleteFolder, onCancelPendingNewFolder, cancelRename])

  return { handleRenameSubmit, handleRenameCancel }
}
