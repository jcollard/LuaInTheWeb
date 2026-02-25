import type { ContextMenuItem } from '../ContextMenu'

// Stryker disable all: Menu item IDs are internal identifiers tested via behavior
export const fileContextMenuItems: ContextMenuItem[] = [
  { id: 'download', label: 'Download' },
  { id: 'divider-download', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

export const markdownFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-markdown', label: 'Preview Markdown' },
  { id: 'edit-markdown', label: 'Edit Markdown' },
  { id: 'divider-markdown', type: 'divider' },
  { id: 'download', label: 'Download' },
  { id: 'divider-download', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

// Read-only markdown files (in library/docs/book workspaces)
export const readOnlyMarkdownFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-markdown', label: 'Preview Markdown' },
  { id: 'edit-markdown', label: 'Edit Markdown' },
  { id: 'divider-download', type: 'divider' },
  { id: 'download', label: 'Download' },
]

export const htmlFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-html', label: 'Preview HTML' },
  { id: 'open-in-browser', label: 'Open in Browser Tab' },
  { id: 'edit-html', label: 'Edit HTML' },
  { id: 'divider-html', type: 'divider' },
  { id: 'download', label: 'Download' },
  { id: 'divider-download', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

// Read-only HTML files (in library/docs/book/projects workspaces)
export const readOnlyHtmlFileContextMenuItems: ContextMenuItem[] = [
  { id: 'preview-html', label: 'Preview HTML' },
  { id: 'open-in-browser', label: 'Open in Browser Tab' },
  { id: 'edit-html', label: 'Edit HTML' },
  { id: 'divider-download', type: 'divider' },
  { id: 'download', label: 'Download' },
]

// Generic read-only files get a Download option
export const readOnlyFileContextMenuItems: ContextMenuItem[] = [
  { id: 'download', label: 'Download' },
]

// Read-only Lua files (in examples/library/docs/book/projects workspaces)
export const readOnlyLuaFileContextMenuItems: ContextMenuItem[] = [
  { id: 'run-lua', label: 'Run' },
  { id: 'divider-lua', type: 'divider' },
  { id: 'download', label: 'Download' },
]

export const luaFileContextMenuItems: ContextMenuItem[] = [
  { id: 'run-lua', label: 'Run' },
  { id: 'divider-lua', type: 'divider' },
  { id: 'download', label: 'Download' },
  { id: 'divider-download', type: 'divider' },
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
  { id: 'download-zip', label: 'Download as ZIP' },
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
  { id: 'download-zip', label: 'Download as ZIP' },
  { id: 'divider-terminal', type: 'divider' },
  { id: 'rename-workspace', label: 'Rename Workspace' },
  { id: 'remove-workspace', label: 'Remove Workspace' },
]

// Library workspaces are read-only — download only
export const libraryWorkspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'download-zip', label: 'Download as ZIP' },
]

// Docs workspaces are read-only — download only
export const docsWorkspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'download-zip', label: 'Download as ZIP' },
]

// Book workspaces are read-only — download only
export const bookWorkspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'download-zip', label: 'Download as ZIP' },
]

// Examples workspaces are read-only — download only
export const examplesWorkspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'download-zip', label: 'Download as ZIP' },
]

// Projects workspace root is read-only — download only
export const projectsWorkspaceContextMenuItems: ContextMenuItem[] = [
  { id: 'download-zip', label: 'Download as ZIP' },
]

// Project subfolder (e.g., space_shooter) can be cloned or downloaded
export const projectSubfolderContextMenuItems: ContextMenuItem[] = [
  { id: 'clone-project', label: 'Clone Project' },
  { id: 'divider-download', type: 'divider' },
  { id: 'download-zip', label: 'Download as ZIP' },
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
