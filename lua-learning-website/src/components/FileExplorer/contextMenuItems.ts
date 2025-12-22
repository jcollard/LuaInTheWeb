import type { ContextMenuItem } from '../ContextMenu'

// Stryker disable all: Menu item IDs are internal identifiers tested via behavior
export const fileContextMenuItems: ContextMenuItem[] = [
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const markdownFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-markdown', label: 'Preview Markdown' },
  { id: 'edit-markdown', label: 'Edit Markdown' },
  { id: 'divider-markdown', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

// Read-only markdown files (in library/docs/book workspaces)
export const readOnlyMarkdownFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-markdown', label: 'Preview Markdown' },
  { id: 'edit-markdown', label: 'Edit Markdown' },
]

export const folderContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'import-files', label: 'Import Files...' },
  { id: 'divider', type: 'divider' },
  { id: 'open-in-terminal', label: 'Open in Shell' },
  { id: 'divider-terminal', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const workspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'import-files', label: 'Import Files...' },
  { id: 'divider', type: 'divider' },
  { id: 'open-in-terminal', label: 'Open in Shell' },
  { id: 'divider-terminal', type: 'divider' },
  { id: 'rename-workspace', label: 'Rename Workspace' },
  { id: 'remove-workspace', label: 'Remove Workspace' },
]

// Library workspaces are read-only and cannot be modified
export const libraryWorkspaceContextMenuItems: ContextMenuItem[] = []

// Docs workspaces are read-only and cannot be modified
export const docsWorkspaceContextMenuItems: ContextMenuItem[] = []

// Book workspaces are read-only and cannot be modified
export const bookWorkspaceContextMenuItems: ContextMenuItem[] = []

// Examples workspaces are read-only and cannot be modified
export const examplesWorkspaceContextMenuItems: ContextMenuItem[] = []
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
