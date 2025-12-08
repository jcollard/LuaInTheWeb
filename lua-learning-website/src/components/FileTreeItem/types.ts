import type { MouseEvent } from 'react'

export interface FileTreeItemProps {
  name: string
  path: string
  type: 'file' | 'folder'
  isSelected: boolean
  isExpanded?: boolean
  isRenaming?: boolean
  depth?: number
  onClick: (path: string) => void
  onToggle?: (path: string) => void
  onContextMenu?: (path: string, event: MouseEvent) => void
  onRenameSubmit?: (path: string, newName: string) => void
  onRenameCancel?: () => void
}
