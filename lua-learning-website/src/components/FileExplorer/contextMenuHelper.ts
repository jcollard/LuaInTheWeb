import type { ContextMenuState } from './types'
import type { ContextMenuItem } from '../ContextMenu'
import {
  fileContextMenuItems,
  markdownFileContextMenuItems,
  readOnlyMarkdownFileContextMenuItems,
  folderContextMenuItems,
  workspaceContextMenuItems,
  libraryWorkspaceContextMenuItems,
  docsWorkspaceContextMenuItems,
  bookWorkspaceContextMenuItems,
  examplesWorkspaceContextMenuItems,
  buildConnectedWorkspaceMenuItems,
} from './contextMenuItems'
import { isMarkdownFile } from './treeUtils'

interface GetContextMenuItemsParams {
  contextMenu: ContextMenuState
  isWorkspaceRoot: (path: string) => boolean
  isLibraryWorkspace: (path: string) => boolean
  isDocsWorkspace: (path: string) => boolean
  isBookWorkspace: (path: string) => boolean
  isExamplesWorkspace: (path: string) => boolean
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
    isInReadOnlyWorkspace,
    supportsRefresh,
  } = params

  const targetPath = contextMenu.targetPath

  if (contextMenu.targetType !== 'folder') {
    // Check if it's a markdown file
    if (targetPath && isMarkdownFile(targetPath)) {
      // Use read-only menu for files in read-only workspaces
      if (isInReadOnlyWorkspace(targetPath)) {
        return readOnlyMarkdownFileContextMenuItems
      }
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
    // Add "Refresh" and "Disconnect" options for connected local workspaces
    const isConnectedLocalWorkspace = supportsRefresh?.(targetPath)
    if (isConnectedLocalWorkspace) {
      return buildConnectedWorkspaceMenuItems()
    }
    return workspaceContextMenuItems
  }

  return folderContextMenuItems
}
