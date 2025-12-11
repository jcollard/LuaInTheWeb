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
