/**
 * Factory function to create an IFileSystem adapter from an external filesystem.
 * This bridges external filesystem implementations (like the editor's useFileSystem)
 * to the shell-core's IFileSystem interface.
 */

import type { IFileSystem, FileEntry } from './types'
import { normalizePath, joinPath, getParentPath, isAbsolutePath } from './pathUtils'

/**
 * External filesystem interface that the adapter wraps.
 * This represents what an external system (like useFileSystem hook) provides.
 */
export interface ExternalFileSystem {
  exists(path: string): boolean
  readFile(path: string): string | null
  writeFile(path: string, content: string): void
  createFile(path: string, content?: string): void
  createFolder(path: string): void
  deleteFile(path: string): void
  deleteFolder(path: string): void
  listDirectory(path: string): string[]
  isDirectory(path: string): boolean
}

/**
 * Creates an IFileSystem adapter that wraps an external filesystem implementation.
 *
 * @param external - The external filesystem to wrap
 * @param initialCwd - Initial current working directory (defaults to '/')
 * @returns An IFileSystem implementation
 */
export function createFileSystemAdapter(
  external: ExternalFileSystem,
  initialCwd = '/'
): IFileSystem {
  let currentDirectory = normalizePath(initialCwd)

  // Track directories created during this session to handle stale external state
  // This fixes race conditions where external.exists() doesn't immediately
  // reflect directories we just created
  const createdDirectories = new Set<string>()

  /**
   * Resolve a path to an absolute path based on current directory.
   */
  function resolvePath(path: string): string {
    if (isAbsolutePath(path)) {
      return normalizePath(path)
    }
    return normalizePath(joinPath(currentDirectory, path))
  }

  /**
   * Check if a path exists (including directories we created this session).
   */
  function pathExists(resolved: string): boolean {
    return external.exists(resolved) || createdDirectories.has(resolved)
  }

  return {
    getCurrentDirectory(): string {
      return currentDirectory
    },

    setCurrentDirectory(path: string): void {
      const resolved = resolvePath(path)
      if (!external.exists(resolved)) {
        throw new Error(`Directory not found: ${resolved}`)
      }
      if (!external.isDirectory(resolved)) {
        throw new Error(`Not a directory: ${resolved}`)
      }
      currentDirectory = resolved
    },

    exists(path: string): boolean {
      const resolved = resolvePath(path)
      return external.exists(resolved)
    },

    isDirectory(path: string): boolean {
      const resolved = resolvePath(path)
      if (!external.exists(resolved)) {
        return false
      }
      return external.isDirectory(resolved)
    },

    isFile(path: string): boolean {
      const resolved = resolvePath(path)
      if (!external.exists(resolved)) {
        return false
      }
      return !external.isDirectory(resolved)
    },

    listDirectory(path: string): FileEntry[] {
      const resolved = resolvePath(path)
      if (!external.exists(resolved)) {
        throw new Error(`Directory not found: ${resolved}`)
      }
      if (!external.isDirectory(resolved)) {
        throw new Error(`Not a directory: ${resolved}`)
      }

      const entries = external.listDirectory(resolved)
      return entries.map((name) => {
        const entryPath = joinPath(resolved, name)
        const isDir = external.isDirectory(entryPath)
        return {
          name,
          type: isDir ? 'directory' : 'file',
          path: entryPath,
        } as FileEntry
      })
    },

    readFile(path: string): string {
      const resolved = resolvePath(path)
      if (!external.exists(resolved)) {
        throw new Error(`File not found: ${resolved}`)
      }
      if (external.isDirectory(resolved)) {
        throw new Error(`Not a file: ${resolved}`)
      }
      const content = external.readFile(resolved)
      if (content === null) {
        throw new Error(`File not found: ${resolved}`)
      }
      return content
    },

    writeFile(path: string, content: string): void {
      const resolved = resolvePath(path)
      if (external.exists(resolved)) {
        if (external.isDirectory(resolved)) {
          throw new Error(`Cannot write to directory: ${resolved}`)
        }
        external.writeFile(resolved, content)
      } else {
        external.createFile(resolved, content)
      }
    },

    createDirectory(path: string): void {
      const resolved = resolvePath(path)
      if (pathExists(resolved)) {
        throw new Error(`Path already exists: ${resolved}`)
      }
      const parent = getParentPath(resolved)
      if (!pathExists(parent)) {
        throw new Error(`Parent directory not found: ${parent}`)
      }
      external.createFolder(resolved)
      // Track this directory so subsequent operations can see it
      createdDirectories.add(resolved)
    },

    delete(path: string): void {
      const resolved = resolvePath(path)
      if (!external.exists(resolved)) {
        throw new Error(`Path not found: ${resolved}`)
      }
      if (external.isDirectory(resolved)) {
        const entries = external.listDirectory(resolved)
        if (entries.length > 0) {
          throw new Error(`Directory not empty: ${resolved}`)
        }
        external.deleteFolder(resolved)
      } else {
        external.deleteFile(resolved)
      }
    },
  }
}
