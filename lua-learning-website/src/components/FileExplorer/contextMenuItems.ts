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

export const htmlFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-html', label: 'Preview HTML' },
  { id: 'open-in-browser', label: 'Open in Browser Tab' },
  { id: 'edit-html', label: 'Edit HTML' },
  { id: 'divider-html', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

// Read-only HTML files (in library/docs/book/projects workspaces)
export const readOnlyHtmlFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-html', label: 'Preview HTML' },
  { id: 'open-in-browser', label: 'Open in Browser Tab' },
  { id: 'edit-html', label: 'Edit HTML' },
]

export const luaFileContextMenuItems: ContextMenuItem[] = [
  { id: 'run-lua', label: 'Run' },
  { id: 'divider-lua', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const folderContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'upload-files', label: 'Upload Files...' },
  { id: 'upload-folder', label: 'Upload Folder...' },
  { id: 'divider', type: 'divider' },
  { id: 'open-in-terminal', label: 'Open in Shell' },
  { id: 'divider-terminal', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const workspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'upload-files', label: 'Upload Files...' },
  { id: 'upload-folder', label: 'Upload Folder...' },
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

// Projects workspace root is read-only and cannot be modified
export const projectsWorkspaceContextMenuItems: ContextMenuItem[] = []

// Project subfolder (e.g., space_shooter) can be cloned
export const projectSubfolderContextMenuItems: ContextMenuItem[] = [
  { id: 'clone-project', label: 'Clone Project' },
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
