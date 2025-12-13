/**
 * FileSystemAccessAPIFileSystem
 *
 * An IFileSystem implementation backed by the browser's File System Access API.
 * Uses a cache-based synchronous wrapper to provide sync methods over the async API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
 */

import type { IFileSystem, FileEntry } from './types'
import { resolvePath, joinPath, getParentPath, getBasename } from './pathUtils'

/**
 * Cached entry representing a file or directory in the filesystem.
 */
interface CachedEntry {
  type: 'file' | 'directory'
  handle: FileSystemHandle
  /** For files: cached content (lazy loaded) */
  content?: string
  /** For directories: child entry names */
  children?: Set<string>
}

/**
 * Queued async operation for write-behind pattern.
 */
interface QueuedOperation {
  type: 'write' | 'delete' | 'mkdir'
  path: string
  content?: string
}

/**
 * Check if the File System Access API is supported in the current browser.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * IFileSystem implementation using the browser's File System Access API.
 *
 * This class uses a cache-based synchronous wrapper:
 * - Directory structure is pre-loaded into an in-memory cache on initialize()
 * - Read operations are served from cache
 * - Write operations update cache immediately and queue async writes
 */
export class FileSystemAccessAPIFileSystem implements IFileSystem {
  private rootHandle: FileSystemDirectoryHandle
  private cache: Map<string, CachedEntry> = new Map()
  private cwd: string = '/'
  private operationQueue: QueuedOperation[] = []
  private _initialized: boolean = false

  constructor(directoryHandle: FileSystemDirectoryHandle) {
    this.rootHandle = directoryHandle
  }

  /**
   * Check if the filesystem has been initialized.
   */
  get isInitialized(): boolean {
    return this._initialized
  }

  /**
   * Initialize the filesystem by loading the directory structure into cache.
   * Must be called before using any other methods.
   */
  async initialize(): Promise<void> {
    // Clear existing cache
    this.cache.clear()

    // Add root directory to cache
    this.cache.set('/', {
      type: 'directory',
      handle: this.rootHandle,
      children: new Set(),
    })

    // Recursively load directory structure
    await this.loadDirectory('/', this.rootHandle)
    this._initialized = true
  }

  /**
   * Recursively load a directory's contents into the cache.
   */
  private async loadDirectory(
    path: string,
    handle: FileSystemDirectoryHandle
  ): Promise<void> {
    const parentEntry = this.cache.get(path)
    if (!parentEntry || parentEntry.type !== 'directory') {
      return
    }

    for await (const [name, childHandle] of handle.entries()) {
      const childPath = joinPath(path, name)

      if (childHandle.kind === 'file') {
        // Load file content into cache
        const fileHandle = childHandle as FileSystemFileHandle
        const file = await fileHandle.getFile()
        const content = await file.text()

        this.cache.set(childPath, {
          type: 'file',
          handle: childHandle,
          content,
        })
        parentEntry.children?.add(name)
      } else if (childHandle.kind === 'directory') {
        this.cache.set(childPath, {
          type: 'directory',
          handle: childHandle,
          children: new Set(),
        })
        parentEntry.children?.add(name)

        // Recursively load subdirectory
        await this.loadDirectory(childPath, childHandle as FileSystemDirectoryHandle)
      }
    }
  }

  /**
   * Refresh the cache by re-reading from the filesystem.
   * Call this to pick up external changes made outside the browser.
   */
  async refresh(): Promise<void> {
    // Flush any pending writes first to avoid losing data
    await this.flush()
    // Re-initialize to reload everything from disk
    await this.initialize()
  }

  /**
   * Flush all queued async operations.
   * Call this to ensure all writes are persisted to disk.
   */
  async flush(): Promise<void> {
    const operations = [...this.operationQueue]
    this.operationQueue = []

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'write':
            await this.performAsyncWrite(op.path, op.content ?? '')
            break
          case 'delete':
            await this.performAsyncDelete(op.path)
            break
          case 'mkdir':
            await this.performAsyncMkdir(op.path)
            break
        }
      } catch (error) {
        // Log and drop failed operation (user can retry by calling flush() again)
        console.error(`Failed to flush operation: ${op.type} ${op.path}`, error)
      }
    }
  }

  /**
   * Perform async file write to disk.
   */
  private async performAsyncWrite(path: string, content: string): Promise<void> {
    const parentPath = getParentPath(path)
    const fileName = getBasename(path)
    const parentEntry = this.cache.get(parentPath)

    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    const parentHandle = parentEntry.handle as FileSystemDirectoryHandle
    const fileHandle = await parentHandle.getFileHandle(fileName, { create: true })

    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  /**
   * Perform async delete on disk.
   */
  private async performAsyncDelete(path: string): Promise<void> {
    const parentPath = getParentPath(path)
    const entryName = getBasename(path)
    const parentEntry = this.cache.get(parentPath)

    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    const parentHandle = parentEntry.handle as FileSystemDirectoryHandle
    await parentHandle.removeEntry(entryName)
  }

  /**
   * Perform async directory creation on disk.
   */
  private async performAsyncMkdir(path: string): Promise<void> {
    const parentPath = getParentPath(path)
    const dirName = getBasename(path)
    const parentEntry = this.cache.get(parentPath)

    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    const parentHandle = parentEntry.handle as FileSystemDirectoryHandle
    await parentHandle.getDirectoryHandle(dirName, { create: true })
  }

  // IFileSystem implementation

  getCurrentDirectory(): string {
    return this.cwd
  }

  setCurrentDirectory(path: string): void {
    const normalizedPath = resolvePath(this.cwd, path)

    const entry = this.cache.get(normalizedPath)
    if (!entry) {
      throw new Error(`Directory not found: ${normalizedPath}`)
    }
    if (entry.type !== 'directory') {
      throw new Error(`Not a directory: ${normalizedPath}`)
    }

    this.cwd = normalizedPath
  }

  exists(path: string): boolean {
    const normalizedPath = resolvePath(this.cwd, path)
    return this.cache.has(normalizedPath)
  }

  isDirectory(path: string): boolean {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)
    return entry?.type === 'directory'
  }

  isFile(path: string): boolean {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)
    return entry?.type === 'file'
  }

  listDirectory(path: string): FileEntry[] {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)

    if (!entry) {
      throw new Error(`Directory not found: ${normalizedPath}`)
    }
    if (entry.type !== 'directory') {
      throw new Error(`Not a directory: ${normalizedPath}`)
    }

    const result: FileEntry[] = []
    for (const childName of entry.children ?? []) {
      const childPath = joinPath(normalizedPath, childName)
      const childEntry = this.cache.get(childPath)
      if (childEntry) {
        result.push({
          name: childName,
          type: childEntry.type,
          path: childPath,
        })
      }
    }

    return result
  }

  readFile(path: string): string {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)

    if (!entry) {
      throw new Error(`File not found: ${normalizedPath}`)
    }
    if (entry.type !== 'file') {
      throw new Error(`Not a file: ${normalizedPath}`)
    }

    // Return cached content (loaded during initialize or created via writeFile)
    return entry.content ?? ''
  }

  /**
   * Async method to load file content into cache.
   * Call this before readFile() for lazy loading pattern.
   *
   * @warning Do not call on files created via writeFile() before flush() -
   * those files have null handles. Use readFile() instead (content is already cached).
   */
  async loadFileContent(path: string): Promise<void> {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)

    if (!entry || entry.type !== 'file') {
      throw new Error(`File not found: ${normalizedPath}`)
    }

    const fileHandle = entry.handle as FileSystemFileHandle
    const file = await fileHandle.getFile()
    entry.content = await file.text()
  }

  writeFile(path: string, content: string): void {
    const normalizedPath = resolvePath(this.cwd, path)
    const parentPath = getParentPath(normalizedPath)
    const fileName = getBasename(normalizedPath)

    // Check parent exists and is a directory
    const parentEntry = this.cache.get(parentPath)
    if (!parentEntry) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }
    if (parentEntry.type !== 'directory') {
      throw new Error(`Parent is not a directory: ${parentPath}`)
    }

    // Check if trying to write to a directory
    const existingEntry = this.cache.get(normalizedPath)
    if (existingEntry?.type === 'directory') {
      throw new Error(`Cannot write to directory: ${normalizedPath}`)
    }

    // Update cache immediately
    if (existingEntry) {
      // Update existing file
      existingEntry.content = content
    } else {
      // Create new file in cache
      // Note: handle will be created by async operation
      this.cache.set(normalizedPath, {
        type: 'file',
        handle: null as unknown as FileSystemFileHandle, // Will be set by async op
        content,
      })
      parentEntry.children?.add(fileName)
    }

    // Queue async write
    this.operationQueue.push({ type: 'write', path: normalizedPath, content })
  }

  createDirectory(path: string): void {
    const normalizedPath = resolvePath(this.cwd, path)
    const parentPath = getParentPath(normalizedPath)
    const dirName = getBasename(normalizedPath)

    // Check if already exists
    if (this.cache.has(normalizedPath)) {
      throw new Error(`Path already exists: ${normalizedPath}`)
    }

    // Check parent exists and is a directory
    const parentEntry = this.cache.get(parentPath)
    if (!parentEntry) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }
    if (parentEntry.type !== 'directory') {
      throw new Error(`Parent is not a directory: ${parentPath}`)
    }

    // Update cache immediately
    this.cache.set(normalizedPath, {
      type: 'directory',
      handle: null as unknown as FileSystemDirectoryHandle,
      children: new Set(),
    })
    parentEntry.children?.add(dirName)

    // Queue async operation
    this.operationQueue.push({ type: 'mkdir', path: normalizedPath })
  }

  delete(path: string): void {
    const normalizedPath = resolvePath(this.cwd, path)

    // Cannot delete root
    if (normalizedPath === '/') {
      throw new Error('Cannot delete root directory')
    }

    const entry = this.cache.get(normalizedPath)
    if (!entry) {
      throw new Error(`Path not found: ${normalizedPath}`)
    }

    // Check if directory is empty
    if (entry.type === 'directory' && entry.children && entry.children.size > 0) {
      throw new Error(`Directory not empty: ${normalizedPath}`)
    }

    // Update parent's children
    const parentPath = getParentPath(normalizedPath)
    const entryName = getBasename(normalizedPath)
    const parentEntry = this.cache.get(parentPath)
    parentEntry?.children?.delete(entryName)

    // Remove from cache
    this.cache.delete(normalizedPath)

    // Queue async operation
    this.operationQueue.push({ type: 'delete', path: normalizedPath })
  }
}
