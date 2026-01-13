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
import { isBinaryExtension } from './binaryExtensions'

/**
 * Cached entry representing a file or directory in the filesystem.
 */
interface CachedEntry {
  type: 'file' | 'directory'
  handle: FileSystemHandle
  /** For text files: cached content (lazy loaded) */
  content?: string
  /** For binary files: cached binary content */
  binaryContent?: Uint8Array
  /** Whether this is a binary file */
  isBinary?: boolean
  /** For directories: child entry names */
  children?: Set<string>
}

/**
 * Queued async operation for write-behind pattern.
 */
interface QueuedOperation {
  type: 'write' | 'delete' | 'mkdir'
  path: string
  content?: string | Uint8Array
  isBinary?: boolean
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
    // Build new cache in temporary variable to avoid race conditions
    // (exists() could be called while we're loading, seeing partial data)
    const newCache = new Map<string, CachedEntry>()

    // Add root directory to new cache
    newCache.set('/', {
      type: 'directory',
      handle: this.rootHandle,
      children: new Set(),
    })

    // Recursively load directory structure into new cache
    await this.loadDirectoryIntoCache('/', this.rootHandle, newCache)

    // Atomic swap - only replace cache once fully loaded
    this.cache = newCache
    this._initialized = true
  }

  /**
   * Recursively load a directory's contents into a cache.
   * @param path - The path being loaded
   * @param handle - The directory handle
   * @param targetCache - The cache to populate (allows atomic swap during initialize)
   */
  private async loadDirectoryIntoCache(
    path: string,
    handle: FileSystemDirectoryHandle,
    targetCache: Map<string, CachedEntry>
  ): Promise<void> {
    const parentEntry = targetCache.get(path)
    if (!parentEntry || parentEntry.type !== 'directory') {
      return
    }

    for await (const [name, childHandle] of handle.entries()) {
      const childPath = joinPath(path, name)

      if (childHandle.kind === 'file') {
        // Load file content into cache
        const fileHandle = childHandle as FileSystemFileHandle
        const file = await fileHandle.getFile()
        const isBinary = isBinaryExtension(childPath)

        if (isBinary) {
          // Load as binary
          const arrayBuffer = await file.arrayBuffer()
          targetCache.set(childPath, {
            type: 'file',
            handle: childHandle,
            binaryContent: new Uint8Array(arrayBuffer),
            isBinary: true,
          })
        } else {
          // Load as text
          const content = await file.text()
          targetCache.set(childPath, {
            type: 'file',
            handle: childHandle,
            content,
            isBinary: false,
          })
        }
        parentEntry.children?.add(name)
      } else if (childHandle.kind === 'directory') {
        targetCache.set(childPath, {
          type: 'directory',
          handle: childHandle,
          children: new Set(),
        })
        parentEntry.children?.add(name)

        // Recursively load subdirectory
        await this.loadDirectoryIntoCache(childPath, childHandle as FileSystemDirectoryHandle, targetCache)
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
            await this.performAsyncWrite(op.path, op.content ?? '', op.isBinary ?? false)
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
   * Handles the case where parent directory was just created (null handle)
   * by ensuring the parent directory exists on disk first.
   * Supports both text (string) and binary (Uint8Array) content.
   */
  private async performAsyncWrite(
    path: string,
    content: string | Uint8Array,
    isBinary: boolean
  ): Promise<void> {
    const parentPath = getParentPath(path)
    const fileName = getBasename(path)
    const parentEntry = this.cache.get(parentPath)

    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    // If parent has a null handle, we need to ensure it exists on disk first
    let parentHandle = parentEntry.handle as FileSystemDirectoryHandle
    if (!parentHandle) {
      // Parent was newly created - ensure it exists on disk
      await this.performAsyncMkdir(parentPath)
      // Now the handle should be set
      parentHandle = parentEntry.handle as FileSystemDirectoryHandle
      if (!parentHandle) {
        throw new Error(`Failed to create parent directory: ${parentPath}`)
      }
    }

    const fileHandle = await parentHandle.getFileHandle(fileName, { create: true })

    const writable = await fileHandle.createWritable()
    // File System Access API accepts both string and BufferSource
    // For Uint8Array, we need to pass the underlying buffer as ArrayBuffer
    if (isBinary && content instanceof Uint8Array) {
      // Create a proper ArrayBuffer copy from the Uint8Array
      const buffer = new ArrayBuffer(content.byteLength)
      new Uint8Array(buffer).set(content)
      await writable.write(buffer)
    } else {
      await writable.write(content as string)
    }
    await writable.close()
  }

  /**
   * Perform async delete on disk.
   * Handles the case where parent has a null handle (directory was never persisted).
   */
  private async performAsyncDelete(path: string): Promise<void> {
    const parentPath = getParentPath(path)
    const entryName = getBasename(path)
    const parentEntry = this.cache.get(parentPath)

    if (!parentEntry || parentEntry.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    const parentHandle = parentEntry.handle as FileSystemDirectoryHandle
    if (!parentHandle) {
      // Parent was never persisted to disk, so nothing to delete on disk
      // This happens when creating and deleting before flush
      return
    }

    // Use recursive: true to ensure directories are deleted even if they contain files
    // This handles cases where child deletes may have failed or been skipped
    await parentHandle.removeEntry(entryName, { recursive: true })
  }

  /**
   * Perform async directory creation on disk.
   * Handles the case where parent directories were also just created (null handles)
   * by walking up the tree to find a valid handle and creating the path from there.
   */
  private async performAsyncMkdir(path: string): Promise<void> {
    // Walk up the path to find the first ancestor with a valid handle
    const pathParts: string[] = []
    let currentPath = path
    let ancestorHandle: FileSystemDirectoryHandle | null = null

    while (currentPath !== '/') {
      const entry = this.cache.get(currentPath)
      if (entry?.handle) {
        // Found an ancestor with a valid handle - but we need the parent, not this entry
        // Actually, if this entry has a handle, we can stop here
        ancestorHandle = entry.handle as FileSystemDirectoryHandle
        break
      }
      // This directory needs to be created
      pathParts.unshift(getBasename(currentPath))
      currentPath = getParentPath(currentPath)
    }

    // If we reached root without finding a handle, use root
    if (!ancestorHandle) {
      const rootEntry = this.cache.get('/')
      if (!rootEntry) {
        throw new Error('Root directory not found in cache')
      }
      ancestorHandle = rootEntry.handle as FileSystemDirectoryHandle
    }

    // Create each directory in the path, updating handles as we go
    let currentHandle = ancestorHandle
    for (const dirName of pathParts) {
      currentHandle = await currentHandle.getDirectoryHandle(dirName, { create: true })
      // Update the cache with the real handle
      const dirPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`
      const entry = this.cache.get(dirPath)
      if (entry) {
        entry.handle = currentHandle
      }
      currentPath = dirPath
    }
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
    if (entry.isBinary) {
      throw new Error(`Cannot read binary file as text: ${normalizedPath}`)
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
      existingEntry.isBinary = false
      delete existingEntry.binaryContent
    } else {
      // Create new file in cache
      // Note: handle will be created by async operation
      this.cache.set(normalizedPath, {
        type: 'file',
        handle: null as unknown as FileSystemFileHandle, // Will be set by async op
        content,
        isBinary: false,
      })
      parentEntry.children?.add(fileName)
    }

    // Queue async write
    this.operationQueue.push({ type: 'write', path: normalizedPath, content, isBinary: false })
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

  // Binary file support

  isBinaryFile(path: string): boolean {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)
    if (!entry || entry.type !== 'file') {
      // If file doesn't exist, check by extension
      return isBinaryExtension(normalizedPath)
    }
    return entry.isBinary === true
  }

  readBinaryFile(path: string): Uint8Array | null {
    const normalizedPath = resolvePath(this.cwd, path)
    const entry = this.cache.get(normalizedPath)

    if (!entry) {
      throw new Error(`File not found: ${normalizedPath}`)
    }
    if (entry.type !== 'file') {
      throw new Error(`Not a file: ${normalizedPath}`)
    }

    if (entry.isBinary) {
      return entry.binaryContent ?? new Uint8Array(0)
    }

    // Allow reading text files as binary (convert to Uint8Array)
    const encoder = new TextEncoder()
    return encoder.encode(entry.content ?? '')
  }

  writeBinaryFile(path: string, content: Uint8Array): void {
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
      existingEntry.binaryContent = content
      existingEntry.isBinary = true
      delete existingEntry.content
    } else {
      // Create new file in cache
      this.cache.set(normalizedPath, {
        type: 'file',
        handle: null as unknown as FileSystemFileHandle,
        binaryContent: content,
        isBinary: true,
      })
      parentEntry.children?.add(fileName)
    }

    // Queue async write
    this.operationQueue.push({ type: 'write', path: normalizedPath, content, isBinary: true })
  }
}
