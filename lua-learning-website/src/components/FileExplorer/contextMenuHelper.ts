import type { ContextMenuState } from './types'
import type { ContextMenuItem } from '../ContextMenu'
import {
  fileContextMenuItems,
  markdownFileContextMenuItems,
  readOnlyMarkdownFileContextMenuItems,
  htmlFileContextMenuItems,
  readOnlyHtmlFileContextMenuItems,
  readOnlyFileContextMenuItems,
  folderContextMenuItems,
  workspaceContextMenuItems,
  libraryWorkspaceContextMenuItems,
  docsWorkspaceContextMenuItems,
  bookWorkspaceContextMenuItems,
  examplesWorkspaceContextMenuItems,
  projectsWorkspaceContextMenuItems,
  projectSubfolderContextMenuItems,
  buildConnectedWorkspaceMenuItems,
} from './contextMenuItems'
import { isMarkdownFile, isHtmlFile } from './treeUtils'

interface GetContextMenuItemsParams {
  contextMenu: ContextMenuState
  isWorkspaceRoot: (path: string) => boolean
  isLibraryWorkspace: (path: string) => boolean
  isDocsWorkspace: (path: string) => boolean
  isBookWorkspace: (path: string) => boolean
  isExamplesWorkspace: (path: string) => boolean
  isProjectsWorkspace: (path: string) => boolean
  isProjectSubfolder: (path: string) => boolean
  isInReadOnlyWorkspace: (path: string) => boolean
  supportsRefresh?: (path: string) => boolean
}

/**
 * Get the appropriate context menu items based on the target type and path.
 */
export function getContextMenuItems(params: GetContextMenuItemsParams): ContextMenuItem[] {
  const {
    contextMenu,
    isWorkspaceRoot,
    isLibraryWorkspace,
    isDocsWorkspace,
    isBookWorkspace,
    isExamplesWorkspace,
    isProjectsWorkspace,
    isProjectSubfolder,
    isInReadOnlyWorkspace,
    supportsRefresh,
  } = params

  const targetPath = contextMenu.targetPath

  if (contextMenu.targetType !== 'folder') {
    // Files in projects workspace have no context menu (read-only, non-markdown/html)
    if (targetPath && isInReadOnlyWorkspace(targetPath)) {
      // Check if it's an HTML file in a read-only workspace
      if (isHtmlFile(targetPath)) {
        return readOnlyHtmlFileContextMenuItems
      }
      // Check if it's a markdown file in a read-only workspace
      if (isMarkdownFile(targetPath)) {
        return readOnlyMarkdownFileContextMenuItems
      }
      // Generic files in read-only workspaces still get Download
      return readOnlyFileContextMenuItems
    }
    // Check if it's an HTML file
    if (targetPath && isHtmlFile(targetPath)) {
      return htmlFileContextMenuItems
    }
    // Check if it's a markdown file
    if (targetPath && isMarkdownFile(targetPath)) {
      return markdownFileContextMenuItems
    }
    return fileContextMenuItems
  }

  // Check if this is a workspace root
  if (targetPath && isWorkspaceRoot(targetPath)) {
    // Library workspaces have no context menu options (read-only)
    if (isLibraryWorkspace(targetPath)) {
      return libraryWorkspaceContextMenuItems
    }
    // Docs workspaces have no context menu options (read-only)
    if (isDocsWorkspace(targetPath)) {
      return docsWorkspaceContextMenuItems
    }
    // Book workspaces have no context menu options (read-only)
    if (isBookWorkspace(targetPath)) {
      return bookWorkspaceContextMenuItems
    }
    // Examples workspaces have no context menu options (read-only)
    if (isExamplesWorkspace(targetPath)) {
      return examplesWorkspaceContextMenuItems
    }
    // Projects workspaces have no context menu options at root (read-only)
    if (isProjectsWorkspace(targetPath)) {
      return projectsWorkspaceContextMenuItems
    }
    // Add "Refresh" and "Disconnect" options for connected local workspaces
    const isConnectedLocalWorkspace = supportsRefresh?.(targetPath)
    if (isConnectedLocalWorkspace) {
      return buildConnectedWorkspaceMenuItems()
    }
    return workspaceContextMenuItems
  }

  // Project subfolders (e.g., space_shooter) can be cloned
  if (targetPath && isProjectSubfolder(targetPath)) {
    return projectSubfolderContextMenuItems
  }

  return folderContextMenuItems
}
