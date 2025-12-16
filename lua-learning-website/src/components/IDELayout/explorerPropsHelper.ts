/**
 * Helper function to create explorer props for IDELayout.
 * Extracted to reduce file size.
 */
import type { TreeNode } from '../../hooks/useFileSystem'
import type { Workspace } from '../../hooks/workspaceTypes'

export interface ExplorerPropsParams {
  fileTree: TreeNode[]
  activeTab: string | null
  pendingNewFilePath: string | null
  pendingNewFolderPath: string | null
  handleCreateFile: (parentPath?: string) => void
  handleCreateFolder: (parentPath?: string) => void
  renameFile: (oldPath: string, newName: string) => void
  renameFolder: (oldPath: string, newName: string) => void
  deleteFile: (path: string) => void
  deleteFolder: (path: string) => void
  openFile: (path: string) => void
  openPreviewFile: (path: string) => void
  moveFile: (sourcePath: string, targetFolderPath: string) => void
  copyFile: (sourcePath: string, targetFolderPath: string) => void
  clearPendingNewFile: () => void
  clearPendingNewFolder: () => void
  // Workspace props
  workspaces: Workspace[]
  isFileSystemAccessSupported: boolean
  addVirtualWorkspace: (name: string) => void
  handleAddLocalWorkspace: (name: string, handle: FileSystemDirectoryHandle) => Promise<void>
  handleRemoveWorkspace: (mountPath: string) => void
  refreshWorkspace: (mountPath: string) => Promise<void>
  refreshFileTree: () => void
  supportsRefresh: (mountPath: string) => boolean
  handleReconnectWorkspace: (mountPath: string) => Promise<void>
  handleDisconnectWorkspace: (mountPath: string) => void
  handleRenameWorkspace: (mountPath: string, newName: string) => void
  isFolderAlreadyMounted: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  getUniqueWorkspaceName: (baseName: string) => string
}

export function createExplorerProps(params: ExplorerPropsParams) {
  return {
    tree: params.fileTree,
    selectedPath: params.activeTab,
    pendingNewFilePath: params.pendingNewFilePath,
    pendingNewFolderPath: params.pendingNewFolderPath,
    onCreateFile: params.handleCreateFile,
    onCreateFolder: params.handleCreateFolder,
    onRenameFile: params.renameFile,
    onRenameFolder: params.renameFolder,
    onDeleteFile: params.deleteFile,
    onDeleteFolder: params.deleteFolder,
    onSelectFile: params.openPreviewFile,
    onDoubleClickFile: params.openFile,
    onMoveFile: params.moveFile,
    onCopyFile: params.copyFile,
    onCancelPendingNewFile: params.clearPendingNewFile,
    onCancelPendingNewFolder: params.clearPendingNewFolder,
    workspaceProps: {
      workspaces: params.workspaces,
      isFileSystemAccessSupported: params.isFileSystemAccessSupported,
      onAddVirtualWorkspace: params.addVirtualWorkspace,
      onAddLocalWorkspace: params.handleAddLocalWorkspace,
      onRemoveWorkspace: params.handleRemoveWorkspace,
      onRefreshWorkspace: async (mountPath: string) => {
        await params.refreshWorkspace(mountPath)
        params.refreshFileTree()
      },
      supportsRefresh: params.supportsRefresh,
      onReconnectWorkspace: params.handleReconnectWorkspace,
      onDisconnectWorkspace: params.handleDisconnectWorkspace,
      onRenameWorkspace: params.handleRenameWorkspace,
      isFolderAlreadyMounted: params.isFolderAlreadyMounted,
      getUniqueWorkspaceName: params.getUniqueWorkspaceName,
    },
  }
}
