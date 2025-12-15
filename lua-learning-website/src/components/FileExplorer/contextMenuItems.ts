import type { ContextMenuItem } from '../ContextMenu'

// Stryker disable all: Menu item IDs are internal identifiers tested via behavior
export const fileContextMenuItems: ContextMenuItem[] = [
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const folderContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'divider', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const workspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'divider', type: 'divider' },
  { id: 'rename-workspace', label: 'Rename Workspace' },
  { id: 'remove-workspace', label: 'Remove Workspace' },
]
// Stryker restore all

/**
 * Build context menu items for a workspace root that supports refresh
 * (connected local workspaces)
 */
export function buildConnectedWorkspaceMenuItems(): ContextMenuItem[] {
  return [
    { id: 'refresh', label: 'Refresh' },
    { id: 'disconnect-workspace', label: 'Disconnect Workspace' },
    { id: 'divider-refresh', type: 'divider' },
    ...workspaceContextMenuItems,
  ]
}
