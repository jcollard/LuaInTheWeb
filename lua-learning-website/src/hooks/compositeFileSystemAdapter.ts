/**
 * Adapter to make IFileSystem compatible with the IDEContext file operations.
 * Provides tree building with workspace marking and implements missing operations.
 */

import type { IFileSystem } from '@lua-learning/shell-core'
import type { TreeNode } from './fileSystemTypes'

/**
 * Build a tree from an IFileSystem, marking root-level folders as workspaces.
 */
export function buildTreeFromFileSystem(
  fs: IFileSystem,
  path: string = '/',
  isRoot: boolean = true
): TreeNode[] {
  const entries = fs.listDirectory(path)
  const nodes: TreeNode[] = []

  for (const entry of entries) {
    if (entry.type === 'directory') {
      const children = buildTreeFromFileSystem(fs, entry.path, false)
      nodes.push({
        name: entry.name,
        path: entry.path,
        type: 'folder',
        isWorkspace: isRoot, // Root-level folders are workspaces
        children,
      })
    } else {
      nodes.push({
        name: entry.name,
        path: entry.path,
        type: 'file',
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
 * Create an adapter that wraps IFileSystem to provide IDEContext-compatible operations.
 */
export function createFileSystemAdapter(fs: IFileSystem): AdaptedFileSystem {
  return {
    createFile: (path: string, content: string = '') => {
      fs.writeFile(path, content)
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
    },

    deleteFile: (path: string) => {
      fs.delete(path)
    },

    renameFile: (oldPath: string, newPath: string) => {
      // Simulate rename: read content, create new, delete old
      const content = fs.readFile(oldPath)
      fs.writeFile(newPath, content)
      fs.delete(oldPath)
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
    },

    createFolder: (path: string) => {
      fs.createDirectory(path)
    },

    deleteFolder: (path: string) => {
      // IFileSystem.delete should handle recursive deletion
      fs.delete(path)
    },

    renameFolder: (oldPath: string, newPath: string) => {
      // Simulate folder rename: create new, copy contents, delete old
      fs.createDirectory(newPath)
      copyDirectoryContents(fs, oldPath, newPath)
      fs.delete(oldPath)
    },

    exists: (path: string) => fs.exists(path),

    isDirectory: (path: string) => fs.isDirectory(path),

    listDirectory: (path: string): string[] => {
      const entries = fs.listDirectory(path)
      return entries.map((entry) => entry.name)
    },

    getTree: () => buildTreeFromFileSystem(fs),
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
 * Recursively move a directory from one path to another.
 */
function moveDirectoryRecursive(fs: IFileSystem, sourcePath: string, targetPath: string): void {
  fs.createDirectory(targetPath)
  copyDirectoryContents(fs, sourcePath, targetPath)
  fs.delete(sourcePath)
}
