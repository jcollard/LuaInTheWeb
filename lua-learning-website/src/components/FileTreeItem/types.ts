import type { MouseEvent } from 'react'

export interface FileTreeItemProps {
  name: string
  path: string
  type: 'file' | 'folder'
  /** Indicates this is a workspace root (mount point) */
  isWorkspace?: boolean
  /** Indicates this is a local filesystem workspace (vs virtual/browser-based) */
  isLocalWorkspace?: boolean
  /** Indicates this workspace is disconnected (local folder needs reconnection) */
  isDisconnected?: boolean
  /** Indicates this is a library workspace (read-only, built-in libraries) */
  isLibraryWorkspace?: boolean
  /** Indicates this is a docs workspace (read-only, API documentation) */
  isDocsWorkspace?: boolean
  /** Indicates this is a book workspace (read-only, learning content) */
  isBookWorkspace?: boolean
  /** Indicates this is an examples workspace (read-only, example Lua programs) */
  isExamplesWorkspace?: boolean
  /** Indicates this file/folder is in a read-only workspace */
  isReadOnly?: boolean
  isSelected: boolean
  isExpanded?: boolean
  isRenaming?: boolean
  depth?: number
  onClick: (path: string) => void
  onDoubleClick?: (path: string) => void
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
