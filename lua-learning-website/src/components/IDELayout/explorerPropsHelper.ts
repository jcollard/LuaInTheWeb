/**
 * Helper function to create explorer props for IDELayout.
 * Extracted to reduce file size.
 */
import type { TreeNode } from '../../hooks/useFileSystem'
import type { Workspace } from '../../hooks/workspaceTypes'
import { isBinaryExtension } from '../../utils/binaryExtensions'
import { isHtmlFile } from '../FileExplorer/treeUtils'

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
  // ANSI art file handler
  openAnsiEditorFile: (path: string) => void
  // HTML file handlers
  openHtmlPreview: (path: string) => void
  openHtmlInBrowser: (path: string) => void
  // Shell integration
  handleCdToLocation?: (path: string) => void
  handleRunLuaFile?: (path: string) => void
  // File upload
  uploadFiles?: (files: FileList, targetFolderPath: string) => Promise<void>
  // Folder upload
  uploadFolder?: (files: FileList, targetFolderPath: string) => Promise<void>
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
  // Clone project handler
  handleCloneProject?: (projectPath: string, workspaceName: string, type: 'virtual' | 'local', handle?: FileSystemDirectoryHandle) => void
}

/**
 * Check if a path is a markdown file
 */
function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith('.md')
}

/**
 * Check if a path is an ANSI art file (.ansi.lua)
 */
function isAnsiArtFile(path: string): boolean {
  return path.toLowerCase().endsWith('.ansi.lua')
}

export function createExplorerProps(params: ExplorerPropsParams) {
  // Smart file opener that routes to appropriate viewer based on file type
  const smartOpenPreviewFile = (path: string) => {
    if (isHtmlFile(path)) {
      params.openHtmlPreview(path)
      return
    }
    if (isAnsiArtFile(path)) {
      params.openAnsiEditorFile(path)
    } else if (isMarkdownFile(path)) {
      params.openMarkdownPreview(path)
    } else if (isBinaryExtension(path)) {
      params.openBinaryViewer(path)
    } else {
      params.openPreviewFile(path)
    }
  }

  // Smart file opener for double-click
  // For markdown/binary files: make the preview tab permanent (keep as preview, don't edit)
  // For ANSI art files: open in editor (same as single-click since they're always permanent)
  // For other files: open for editing
  const smartOpenFile = (path: string) => {
    if (isHtmlFile(path)) {
      params.makeTabPermanent(path)
      return
    }
    if (isAnsiArtFile(path)) {
      params.openAnsiEditorFile(path)
    } else if (isMarkdownFile(path) || isBinaryExtension(path)) {
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
    onPreviewHtml: params.openHtmlPreview,
    onEditHtml: params.openFile,
    onOpenHtmlInBrowser: params.openHtmlInBrowser,
    onCdToLocation: params.handleCdToLocation,
    onRunLuaFile: params.handleRunLuaFile,
    onUploadFiles: params.uploadFiles,
    onUploadFolder: params.uploadFolder,
    onCloneProject: params.handleCloneProject,
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
