import type { TreeNode } from '../../hooks/useFileSystem'

export interface FileExplorerProps {
  tree: TreeNode[]
  selectedPath?: string | null
  pendingNewFilePath?: string | null
  pendingNewFolderPath?: string | null
  onCreateFile: (parentPath?: string) => void
  onCreateFolder: (parentPath?: string) => void
  onRenameFile: (oldPath: string, newName: string) => void
  onRenameFolder: (oldPath: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onDeleteFolder: (path: string) => void
  onSelectFile: (path: string) => void
  onMoveFile?: (sourcePath: string, targetFolderPath: string) => void
  onCancelPendingNewFile?: () => void
  onCancelPendingNewFolder?: () => void
  className?: string
}

export interface ContextMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  targetPath: string | null
  targetType: 'file' | 'folder' | null
}

export interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
}

export interface UseFileExplorerReturn {
  // Selection state
  selectedPath: string | null
  selectPath: (path: string) => void

  // Expanded folders state
  expandedPaths: Set<string>
  toggleFolder: (path: string) => void

  // Renaming state
  renamingPath: string | null
  startRename: (path: string) => void
  cancelRename: () => void

  // Context menu state
  contextMenu: ContextMenuState
  openContextMenu: (path: string, x: number, y: number, type?: 'file' | 'folder') => void
  closeContextMenu: () => void

  // Confirm dialog state
  confirmDialog: ConfirmDialogState
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
}
