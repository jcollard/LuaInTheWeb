/**
 * Factory for creating workspace-isolated virtual filesystems.
 *
 * Each virtual workspace gets its own IndexedDB-backed filesystem
 * with keys prefixed by the workspace ID. Supports both text and binary files.
 */

import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'
import {
  normalizePath,
  joinPath,
  getParentPath,
  isAbsolutePath,
  getBasename,
} from '@lua-learning/shell-core'
import {
  storeFile,
  deleteFile,
  getAllFilesForWorkspace,
  storeFolder,
  deleteFolder,
  getAllFoldersForWorkspace,
} from './virtualFileSystemStorage'
import { isBinaryExtension } from '../utils/binaryExtensions'

/**
 * In-memory file representation.
 */
interface CachedFile {
  content: string | Uint8Array
  isBinary: boolean
  createdAt: number
  updatedAt: number
}

/**
 * Queued async operation for write-behind pattern.
 */
interface QueuedOperation {
  type: 'writeFile' | 'deleteFile' | 'createFolder' | 'deleteFolder'
  path: string
  content?: string | Uint8Array
  isBinary?: boolean
}

/**
 * Extended IFileSystem interface with binary support and async initialization.
 */
export interface VirtualFileSystemExtended extends IFileSystem {
  /**
   * Initialize the filesystem by loading data from IndexedDB.
   * Must be called before using any other methods.
   */
  initialize(): Promise<void>

  /**
   * Flush all pending async operations to IndexedDB.
   */
  flush(): Promise<void>

  /**
   * Check if the filesystem has been initialized.
   */
  readonly isInitialized: boolean

  // Override optional binary methods to be required
  isBinaryFile(path: string): boolean
  readBinaryFile(path: string): Uint8Array | null
  writeBinaryFile(path: string, content: Uint8Array): void
}

/**
 * Create a virtual filesystem for a workspace.
 *
 * The filesystem is backed by IndexedDB with keys prefixed by the workspace ID,
 * providing complete isolation between workspaces. Supports both text and binary files.
 *
 * @param workspaceId - Unique identifier for the workspace
 * @returns An extended IFileSystem with binary support
 */
export function createVirtualFileSystem(workspaceId: string): VirtualFileSystemExtended {
  // In-memory cache
  const files = new Map<string, CachedFile>()
  const folders = new Set<string>(['/'])

  // State
  let currentDirectory = '/'
  let _initialized = false

  // Write-behind queue
  const operationQueue: QueuedOperation[] = []

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
   * Queue an async operation for later execution.
   */
  function queueOperation(op: QueuedOperation): void {
    operationQueue.push(op)
  }

  /**
   * Check if a path exists in the filesystem.
   */
  function pathExists(resolved: string): boolean {
    return files.has(resolved) || folders.has(resolved)
  }

  /**
   * Check if a path is a directory.
   */
  function pathIsDirectory(resolved: string): boolean {
    return folders.has(resolved)
  }

  const fs: VirtualFileSystemExtended = {
    get isInitialized(): boolean {
      return _initialized
    },

    async initialize(): Promise<void> {
      // Clear existing state
      files.clear()
      folders.clear()
      folders.add('/')

      // Load folders from IndexedDB
      const storedFolders = await getAllFoldersForWorkspace(workspaceId)
      for (const folder of storedFolders) {
        folders.add(folder)
      }

      // Ensure root exists
      if (!folders.has('/')) {
        folders.add('/')
        queueOperation({ type: 'createFolder', path: '/' })
      }

      // Load files from IndexedDB
      const storedFiles = await getAllFilesForWorkspace(workspaceId)
      for (const [path, stored] of storedFiles) {
        files.set(path, {
          content: stored.content,
          isBinary: stored.isBinary,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
        })
      }

      _initialized = true
    },

    async flush(): Promise<void> {
      const operations = [...operationQueue]
      operationQueue.length = 0

      for (const op of operations) {
        try {
          switch (op.type) {
            case 'writeFile':
              await storeFile(workspaceId, op.path, op.content!, op.isBinary!)
              break
            case 'deleteFile':
              await deleteFile(workspaceId, op.path)
              break
            case 'createFolder':
              await storeFolder(workspaceId, op.path)
              break
            case 'deleteFolder':
              await deleteFolder(workspaceId, op.path)
              break
          }
        } catch (error) {
          console.error(`Failed to flush operation: ${op.type} ${op.path}`, error)
        }
      }
    },

    getCurrentDirectory(): string {
      return currentDirectory
    },

    setCurrentDirectory(path: string): void {
      const resolved = resolvePath(path)
      if (!folders.has(resolved)) {
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
      return files.has(resolved)
    },

    listDirectory(path: string): FileEntry[] {
      const resolved = resolvePath(path)
      if (!folders.has(resolved)) {
        throw new Error(`Directory not found: ${resolved}`)
      }

      const entries: FileEntry[] = []

      // Find files in this directory
      for (const filePath of files.keys()) {
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
      for (const folderPath of folders) {
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
      const file = files.get(resolved)
      if (!file) {
        throw new Error(`File not found: ${resolved}`)
      }
      if (file.isBinary) {
        throw new Error(`Cannot read binary file as text: ${resolved}`)
      }
      return file.content as string
    },

    writeFile(path: string, content: string): void {
      const resolved = resolvePath(path)

      // Check parent directory exists
      const parent = getParentPath(resolved)
      if (!folders.has(parent)) {
        throw new Error(`Parent directory not found: ${parent}`)
      }

      // Check not trying to write to a directory
      if (folders.has(resolved)) {
        throw new Error(`Cannot write to directory: ${resolved}`)
      }

      const now = Date.now()
      const existing = files.get(resolved)

      files.set(resolved, {
        content,
        isBinary: false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })

      queueOperation({ type: 'writeFile', path: resolved, content, isBinary: false })
    },

    createDirectory(path: string): void {
      const resolved = resolvePath(path)

      // Check doesn't already exist
      if (pathExists(resolved)) {
        throw new Error(`Path already exists: ${resolved}`)
      }

      // Check parent exists
      const parent = getParentPath(resolved)
      if (!folders.has(parent)) {
        throw new Error(`Parent directory not found: ${parent}`)
      }

      folders.add(resolved)
      queueOperation({ type: 'createFolder', path: resolved })
    },

    delete(path: string): void {
      const resolved = resolvePath(path)

      if (!pathExists(resolved)) {
        throw new Error(`Path not found: ${resolved}`)
      }

      if (pathIsDirectory(resolved)) {
        // Check directory is empty
        const hasFileChildren = Array.from(files.keys()).some((f) =>
          f.startsWith(`${resolved}/`)
        )
        const hasFolderChildren = Array.from(folders).some(
          (f) => f !== resolved && f.startsWith(`${resolved}/`)
        )

        if (hasFileChildren || hasFolderChildren) {
          throw new Error(`Directory not empty: ${resolved}`)
        }

        folders.delete(resolved)
        queueOperation({ type: 'deleteFolder', path: resolved })
      } else {
        files.delete(resolved)
        queueOperation({ type: 'deleteFile', path: resolved })
      }
    },

    // Binary file support

    isBinaryFile(path: string): boolean {
      const resolved = resolvePath(path)
      const file = files.get(resolved)
      if (!file) {
        // If file doesn't exist, check by extension
        return isBinaryExtension(resolved)
      }
      return file.isBinary
    },

    readBinaryFile(path: string): Uint8Array | null {
      const resolved = resolvePath(path)
      const file = files.get(resolved)
      if (!file) {
        return null
      }
      if (!file.isBinary) {
        // Allow reading text files as binary (convert to Uint8Array)
        const encoder = new TextEncoder()
        return encoder.encode(file.content as string)
      }
      return file.content as Uint8Array
    },

    writeBinaryFile(path: string, content: Uint8Array): void {
      const resolved = resolvePath(path)

      // Check parent directory exists
      const parent = getParentPath(resolved)
      if (!folders.has(parent)) {
        throw new Error(`Parent directory not found: ${parent}`)
      }

      // Check not trying to write to a directory
      if (folders.has(resolved)) {
        throw new Error(`Cannot write to directory: ${resolved}`)
      }

      const now = Date.now()
      const existing = files.get(resolved)

      files.set(resolved, {
        content,
        isBinary: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })

      queueOperation({ type: 'writeFile', path: resolved, content, isBinary: true })
    },
  }

  return fs
}
