/**
 * Types for the virtual file system
 */

export interface VirtualFile {
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  /** Indicates this is a workspace root (mount point) */
  isWorkspace?: boolean
  /** Indicates this is a local filesystem workspace (vs virtual/browser-based) */
  isLocalWorkspace?: boolean
  /** Indicates this workspace is disconnected (local folder needs reconnection) */
  isDisconnected?: boolean
  /** Indicates this is a library workspace (read-only, built-in libraries) */
  isLibraryWorkspace?: boolean
  /** Indicates this is a docs workspace (read-only, API documentation) */
  isDocsWorkspace?: boolean
  /** Indicates this is a book workspace (read-only, learning content) */
  isBookWorkspace?: boolean
  /** Indicates this is an examples workspace (read-only, example Lua programs) */
  isExamplesWorkspace?: boolean
  /** Indicates this workspace is currently loading */
  isLoading?: boolean
  /** Indicates this file/folder is in a read-only workspace */
  isReadOnly?: boolean
  children?: TreeNode[]
}

export interface FileSystemState {
  version: number
  files: Record<string, VirtualFile>
  folders: Set<string>
}

export interface UseFileSystemReturn {
  // File operations
  createFile: (path: string, content?: string) => void
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => void
  deleteFile: (path: string) => void
  renameFile: (oldPath: string, newPath: string) => void
  moveFile: (sourcePath: string, targetFolderPath: string) => void
  copyFile: (sourcePath: string, targetFolderPath: string) => void

  // Folder operations
  createFolder: (path: string) => void
  deleteFolder: (path: string) => void
  renameFolder: (oldPath: string, newPath: string) => void

  // Utilities
  exists: (path: string) => boolean
  isDirectory: (path: string) => boolean
  listDirectory: (path: string) => string[]
  getTree: () => TreeNode[]
}

export interface SerializedState {
  version: number
  files: Record<string, VirtualFile>
  folders?: string[]
}
