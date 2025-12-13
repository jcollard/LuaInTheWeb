/**
 * Factory for creating workspace-isolated virtual filesystems.
 *
 * Each virtual workspace gets its own localStorage-backed filesystem
 * with keys prefixed by the workspace ID.
 */

import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'
import { normalizePath, joinPath, getParentPath, isAbsolutePath, getBasename } from '@lua-learning/shell-core'

interface VirtualFile {
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

interface VirtualFileSystemState {
  files: Record<string, VirtualFile>
  folders: string[]
}

const STORAGE_VERSION = 1

/**
 * Get the localStorage key for a workspace's filesystem data.
 */
function getStorageKey(workspaceId: string): string {
  return `workspace:${workspaceId}:fs`
}

/**
 * Load filesystem state from localStorage.
 */
function loadState(workspaceId: string): VirtualFileSystemState {
  try {
    const key = getStorageKey(workspaceId)
    const data = localStorage.getItem(key)
    if (!data) {
      return { files: {}, folders: ['/'] }
    }
    const parsed = JSON.parse(data)
    // Ensure root folder exists
    if (!parsed.folders?.includes('/')) {
      parsed.folders = ['/', ...(parsed.folders || [])]
    }
    return {
      files: parsed.files || {},
      folders: parsed.folders || ['/'],
    }
  } catch {
    return { files: {}, folders: ['/'] }
  }
}

/**
 * Save filesystem state to localStorage.
 */
function saveState(workspaceId: string, state: VirtualFileSystemState): void {
  const key = getStorageKey(workspaceId)
  localStorage.setItem(
    key,
    JSON.stringify({
      version: STORAGE_VERSION,
      files: state.files,
      folders: state.folders,
    })
  )
}

/**
 * Create a virtual filesystem for a workspace.
 *
 * The filesystem is backed by localStorage with keys prefixed by the workspace ID,
 * providing complete isolation between workspaces.
 */
export function createVirtualFileSystem(workspaceId: string): IFileSystem {
  const state = loadState(workspaceId)
  let currentDirectory = '/'

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
   * Persist the current state to localStorage.
   */
  function persist(): void {
    saveState(workspaceId, state)
  }

  /**
   * Check if a path exists in the filesystem.
   */
  function pathExists(resolved: string): boolean {
    return resolved in state.files || state.folders.includes(resolved)
  }

  /**
   * Check if a path is a directory.
   */
  function pathIsDirectory(resolved: string): boolean {
    return state.folders.includes(resolved)
  }

  return {
    getCurrentDirectory(): string {
      return currentDirectory
    },

    setCurrentDirectory(path: string): void {
      const resolved = resolvePath(path)
      if (!state.folders.includes(resolved)) {
        throw new Error(`Directory not found: ${resolved}`)
      }
      currentDirectory = resolved
    },

    exists(path: string): boolean {
      const resolved = resolvePath(path)
      return pathExists(resolved)
    },

    isDirectory(path: string): boolean {
      const resolved = resolvePath(path)
      return pathIsDirectory(resolved)
    },

    isFile(path: string): boolean {
      const resolved = resolvePath(path)
      return resolved in state.files
    },

    listDirectory(path: string): FileEntry[] {
      const resolved = resolvePath(path)
      if (!state.folders.includes(resolved)) {
        throw new Error(`Directory not found: ${resolved}`)
      }

      const entries: FileEntry[] = []

      // Find files in this directory
      for (const filePath of Object.keys(state.files)) {
        const parent = getParentPath(filePath)
        if (parent === resolved) {
          entries.push({
            name: getBasename(filePath),
            type: 'file',
            path: filePath,
          })
        }
      }

      // Find folders in this directory
      for (const folderPath of state.folders) {
        if (folderPath === resolved || folderPath === '/') continue
        const parent = getParentPath(folderPath)
        if (parent === resolved) {
          entries.push({
            name: getBasename(folderPath),
            type: 'directory',
            path: folderPath,
          })
        }
      }

      return entries.sort((a, b) => a.name.localeCompare(b.name))
    },

    readFile(path: string): string {
      const resolved = resolvePath(path)
      const file = state.files[resolved]
      if (!file) {
        throw new Error(`File not found: ${resolved}`)
      }
      return file.content
    },

    writeFile(path: string, content: string): void {
      const resolved = resolvePath(path)

      // Check parent directory exists
      const parent = getParentPath(resolved)
      if (!state.folders.includes(parent)) {
        throw new Error(`Parent directory not found: ${parent}`)
      }

      // Check not trying to write to a directory
      if (state.folders.includes(resolved)) {
        throw new Error(`Cannot write to directory: ${resolved}`)
      }

      const now = Date.now()
      if (resolved in state.files) {
        // Update existing file
        state.files[resolved] = {
          ...state.files[resolved],
          content,
          updatedAt: now,
        }
      } else {
        // Create new file
        state.files[resolved] = {
          name: getBasename(resolved),
          content,
          createdAt: now,
          updatedAt: now,
        }
      }
      persist()
    },

    createDirectory(path: string): void {
      const resolved = resolvePath(path)

      // Check doesn't already exist
      if (pathExists(resolved)) {
        throw new Error(`Path already exists: ${resolved}`)
      }

      // Check parent exists
      const parent = getParentPath(resolved)
      if (!state.folders.includes(parent)) {
        throw new Error(`Parent directory not found: ${parent}`)
      }

      state.folders.push(resolved)
      persist()
    },

    delete(path: string): void {
      const resolved = resolvePath(path)

      if (!pathExists(resolved)) {
        throw new Error(`Path not found: ${resolved}`)
      }

      if (pathIsDirectory(resolved)) {
        // Check directory is empty
        const hasChildren =
          Object.keys(state.files).some((f) => f.startsWith(`${resolved}/`)) ||
          state.folders.some((f) => f !== resolved && f.startsWith(`${resolved}/`))

        if (hasChildren) {
          throw new Error(`Directory not empty: ${resolved}`)
        }

        state.folders = state.folders.filter((f) => f !== resolved)
      } else {
        delete state.files[resolved]
      }
      persist()
    },
  }
}
