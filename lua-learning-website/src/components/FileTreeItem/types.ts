import type { MouseEvent } from 'react'

export interface FileTreeItemProps {
  name: string
  path: string
  type: 'file' | 'folder'
  /** Indicates this is a workspace root (mount point) */
  isWorkspace?: boolean
  /** Indicates this workspace is disconnected (local folder needs reconnection) */
  isDisconnected?: boolean
  isSelected: boolean
  isExpanded?: boolean
  isRenaming?: boolean
  depth?: number
  onClick: (path: string) => void
  onToggle?: (path: string) => void
  onContextMenu?: (path: string, event: MouseEvent) => void
  onRenameSubmit?: (path: string, newName: string) => void
  onRenameCancel?: () => void
  // Drag and drop
  onDragStart?: (sourcePath: string) => void
  onDrop?: (sourcePath: string, targetPath: string) => void
  // Workspace reconnection
  onReconnect?: (path: string) => void
}
