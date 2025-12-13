import type { Workspace } from '../../hooks/workspaceTypes'

/**
 * Props for the WorkspaceTabs component.
 */
export interface WorkspaceTabsProps {
  /** List of workspaces to display as tabs */
  workspaces: Workspace[]
  /** Callback when the add workspace button is clicked */
  onAddClick: () => void
  /** Callback when a workspace tab close button is clicked */
  onClose: (workspaceId: string) => void
  /** Callback when a workspace tab is right-clicked */
  onContextMenu?: (workspaceId: string, event: React.MouseEvent) => void
  /** Optional className for the container */
  className?: string
}

/**
 * Context menu item for workspace actions.
 */
export interface WorkspaceContextMenuItem {
  id: string
  label: string
  disabled?: boolean
}
