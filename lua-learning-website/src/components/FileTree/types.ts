import type { MouseEvent } from 'react'
import type { TreeNode } from '../../hooks/useFileSystem'

export interface FileTreeProps {
  tree: TreeNode[]
  selectedPath: string | null
  expandedPaths: Set<string>
  onSelect: (path: string) => void
  onToggle: (path: string) => void
  onContextMenu?: (path: string, event: MouseEvent) => void
  onRename?: (path: string) => void
  onDelete?: (path: string) => void
  renamingPath?: string | null
  onRenameSubmit?: (path: string, newName: string) => void
  onRenameCancel?: () => void
}
