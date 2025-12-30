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
  // Markdown handlers
  openMarkdownPreview: (path: string) => void
  openMarkdownEdit: (path: string) => void
  makeTabPermanent: (path: string) => void
  // Binary file handler
  openBinaryViewer: (path: string) => void
  // Shell integration
  handleCdToLocation?: (path: string) => void
  // File upload
  uploadFiles?: (files: FileList, targetFolderPath: string) => Promise<void>
  // Workspace props
  workspaces: Workspace[]
  pendingWorkspaces: Set<string>
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

/**
 * Check if a path is a markdown file
 */
function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith('.md')
}

/**
 * Binary file extensions that should open in the binary viewer
 */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.ico',
  '.svg',
  '.mp3',
  '.wav',
  '.ogg',
  '.mp4',
  '.webm',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.bin',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
])

/**
 * Check if a path is a binary file based on extension
 */
function isBinaryFile(path: string): boolean {
  const lastDot = path.lastIndexOf('.')
  if (lastDot === -1) return false
  const ext = path.slice(lastDot).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

export function createExplorerProps(params: ExplorerPropsParams) {
  // Smart file opener that routes to appropriate viewer based on file type
  const smartOpenPreviewFile = (path: string) => {
    if (isMarkdownFile(path)) {
      params.openMarkdownPreview(path)
    } else if (isBinaryFile(path)) {
      params.openBinaryViewer(path)
    } else {
      params.openPreviewFile(path)
    }
  }

  // Smart file opener for double-click
  // For markdown/binary files: make the preview tab permanent (keep as preview, don't edit)
  // For other files: open for editing
  const smartOpenFile = (path: string) => {
    if (isMarkdownFile(path) || isBinaryFile(path)) {
      params.makeTabPermanent(path)
    } else {
      params.openFile(path)
    }
  }

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
    onSelectFile: smartOpenPreviewFile,
    onDoubleClickFile: smartOpenFile,
    onMoveFile: params.moveFile,
    onCopyFile: params.copyFile,
    onCancelPendingNewFile: params.clearPendingNewFile,
    onCancelPendingNewFolder: params.clearPendingNewFolder,
    onPreviewMarkdown: params.openMarkdownPreview,
    onEditMarkdown: params.openMarkdownEdit,
    onCdToLocation: params.handleCdToLocation,
    onUploadFiles: params.uploadFiles,
    workspaceProps: {
      workspaces: params.workspaces,
      pendingWorkspaces: params.pendingWorkspaces,
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
