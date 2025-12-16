/**
 * Adapter to make IFileSystem compatible with the IDEContext file operations.
 * Provides tree building with workspace marking and implements missing operations.
 */

import type { IFileSystem } from '@lua-learning/shell-core'
import type { TreeNode } from './fileSystemTypes'
import type { Workspace } from './workspaceTypes'

/**
 * Build a tree from an IFileSystem, marking root-level folders as workspaces.
 * Optionally includes disconnected workspaces as root nodes with isDisconnected: true.
 * @param fs - The filesystem to build the tree from
 * @param path - Current path (default: '/')
 * @param isRoot - Whether this is the root level (default: true)
 * @param allWorkspaces - All workspaces (used for workspace type detection)
 * @param parentReadOnly - Whether the parent is read-only (propagates to children)
 */
export function buildTreeFromFileSystem(
  fs: IFileSystem,
  path: string = '/',
  isRoot: boolean = true,
  allWorkspaces: Workspace[] = [],
  parentReadOnly: boolean = false
): TreeNode[] {
  const entries = fs.listDirectory(path)
  const nodes: TreeNode[] = []

  for (const entry of entries) {
    if (entry.type === 'directory') {
      // For root-level folders, find the matching workspace to get its type
      let isLocalWorkspace: boolean | undefined
      let isLibraryWorkspace: boolean | undefined
      let isDocsWorkspace: boolean | undefined
      let isBookWorkspace: boolean | undefined
      let isReadOnly = parentReadOnly

      if (isRoot) {
        const workspace = allWorkspaces.find((w) => w.mountPath === entry.path)
        isLocalWorkspace = workspace?.type === 'local'
        isLibraryWorkspace = workspace?.type === 'library'
        isDocsWorkspace = workspace?.type === 'docs'
        isBookWorkspace = workspace?.type === 'book'
        isReadOnly = workspace?.isReadOnly === true
      }

      const children = buildTreeFromFileSystem(
        fs,
        entry.path,
        false,
        allWorkspaces,
        isReadOnly // Propagate read-only status to children
      )

      nodes.push({
        name: entry.name,
        path: entry.path,
        type: 'folder',
        isWorkspace: isRoot, // Root-level folders are workspaces
        isLocalWorkspace,
        isLibraryWorkspace,
        isDocsWorkspace,
        isBookWorkspace,
        isReadOnly: isReadOnly || undefined, // Only set if true
        children,
      })
    } else {
      nodes.push({
        name: entry.name,
        path: entry.path,
        type: 'file',
        isReadOnly: parentReadOnly || undefined, // Inherit from parent
      })
    }
  }

  // Add disconnected workspaces at root level
  if (isRoot) {
    const disconnectedWorkspaces = allWorkspaces.filter((w) => w.status === 'disconnected')
    for (const workspace of disconnectedWorkspaces) {
      nodes.push({
        name: workspace.mountPath.substring(1), // Remove leading '/'
        path: workspace.mountPath,
        type: 'folder',
        isWorkspace: true,
        isLocalWorkspace: workspace.type === 'local',
        isDisconnected: true,
        children: [], // No children for disconnected workspaces
      })
    }
  }

  // Sort: folders first, then alphabetically
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Interface for the adapted file system operations that IDEContext needs.
 */
export interface AdaptedFileSystem {
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

/**
 * Helper to flush pending operations if the filesystem supports it.
 * FileSystemAccessAPIFileSystem uses a write-behind pattern and requires flush().
 */
function flushIfSupported(fs: IFileSystem): void {
  // Check if fs has a flush method (duck typing for FileSystemAccessAPIFileSystem)
  const flushable = fs as IFileSystem & { flush?: () => Promise<void> }
  if (typeof flushable.flush === 'function') {
    // Fire and forget - flush happens async but we don't block on it
    // Errors are logged in the flush implementation
    flushable.flush()
  }
}

/**
 * Create an adapter that wraps IFileSystem to provide IDEContext-compatible operations.
 * @param fs - The underlying filesystem (typically a CompositeFileSystem)
 * @param workspaces - Optional array of all workspaces (used to show disconnected workspaces in tree)
 */
export function createFileSystemAdapter(
  fs: IFileSystem,
  workspaces: Workspace[] = []
): AdaptedFileSystem {
  return {
    createFile: (path: string, content: string = '') => {
      fs.writeFile(path, content)
      flushIfSupported(fs)
    },

    readFile: (path: string): string | null => {
      try {
        if (!fs.exists(path) || fs.isDirectory(path)) {
          return null
        }
        return fs.readFile(path)
      } catch {
        return null
      }
    },

    writeFile: (path: string, content: string) => {
      fs.writeFile(path, content)
      flushIfSupported(fs)
    },

    deleteFile: (path: string) => {
      fs.delete(path)
      flushIfSupported(fs)
    },

    renameFile: (oldPath: string, newPath: string) => {
      // Simulate rename: read content, create new, delete old
      const content = fs.readFile(oldPath)
      fs.writeFile(newPath, content)
      fs.delete(oldPath)
      flushIfSupported(fs)
    },

    moveFile: (sourcePath: string, targetFolderPath: string) => {
      // Extract filename and build new path
      const parts = sourcePath.split('/').filter(Boolean)
      const fileName = parts[parts.length - 1]
      const newPath = targetFolderPath === '/' ? `/${fileName}` : `${targetFolderPath}/${fileName}`

      if (fs.isDirectory(sourcePath)) {
        // Moving a folder - need to recursively copy
        moveDirectoryRecursive(fs, sourcePath, newPath)
      } else {
        // Moving a file
        const content = fs.readFile(sourcePath)
        fs.writeFile(newPath, content)
        fs.delete(sourcePath)
      }
      flushIfSupported(fs)
    },

    copyFile: (sourcePath: string, targetFolderPath: string) => {
      // Extract filename and build new path
      const parts = sourcePath.split('/').filter(Boolean)
      const fileName = parts[parts.length - 1]
      const newPath = targetFolderPath === '/' ? `/${fileName}` : `${targetFolderPath}/${fileName}`

      if (fs.isDirectory(sourcePath)) {
        // Copying a folder - recursively copy contents without deleting source
        fs.createDirectory(newPath)
        copyDirectoryContents(fs, sourcePath, newPath)
      } else {
        // Copying a file
        const content = fs.readFile(sourcePath)
        fs.writeFile(newPath, content)
      }
      flushIfSupported(fs)
    },

    createFolder: (path: string) => {
      fs.createDirectory(path)
      flushIfSupported(fs)
    },

    deleteFolder: (path: string) => {
      // Recursively delete folder and all contents
      deleteDirectoryRecursive(fs, path)
      flushIfSupported(fs)
    },

    renameFolder: (oldPath: string, newPath: string) => {
      // Simulate folder rename: create new, copy contents, delete old recursively
      fs.createDirectory(newPath)
      copyDirectoryContents(fs, oldPath, newPath)
      deleteDirectoryRecursive(fs, oldPath)
      flushIfSupported(fs)
    },

    exists: (path: string) => fs.exists(path),

    isDirectory: (path: string) => fs.isDirectory(path),

    listDirectory: (path: string): string[] => {
      const entries = fs.listDirectory(path)
      return entries.map((entry) => entry.name)
    },

    getTree: () => buildTreeFromFileSystem(fs, '/', true, workspaces),
  }
}

/**
 * Recursively copy directory contents from one path to another.
 */
function copyDirectoryContents(fs: IFileSystem, sourcePath: string, targetPath: string): void {
  const entries = fs.listDirectory(sourcePath)

  for (const entry of entries) {
    const newPath = `${targetPath}/${entry.name}`

    if (entry.type === 'directory') {
      fs.createDirectory(newPath)
      copyDirectoryContents(fs, entry.path, newPath)
    } else {
      const content = fs.readFile(entry.path)
      fs.writeFile(newPath, content)
    }
  }
}

/**
 * Recursively delete a directory and all its contents.
 */
function deleteDirectoryRecursive(fs: IFileSystem, path: string): void {
  const entries = fs.listDirectory(path)

  // Delete all children first
  for (const entry of entries) {
    if (entry.type === 'directory') {
      deleteDirectoryRecursive(fs, entry.path)
    } else {
      fs.delete(entry.path)
    }
  }

  // Now delete the empty directory
  fs.delete(path)
}

/**
 * Recursively move a directory from one path to another.
 */
function moveDirectoryRecursive(fs: IFileSystem, sourcePath: string, targetPath: string): void {
  fs.createDirectory(targetPath)
  copyDirectoryContents(fs, sourcePath, targetPath)
  deleteDirectoryRecursive(fs, sourcePath)
}
