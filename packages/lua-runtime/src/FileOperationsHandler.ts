/**
 * FileOperationsHandler - Shared file I/O operations for Lua processes.
 *
 * This module provides file handle management and I/O operations that can be
 * used by both LuaReplProcess and LuaScriptProcess. It implements the callbacks
 * needed for Lua's io.open(), file:read(), file:write(), and file:close().
 */

import type {
  FileOperationsCallbacks,
  FileOpenResult,
  FileReadResult,
  FileWriteResult,
  FileCloseResult,
} from './LuaEngineFactory'

/**
 * Represents an open file handle with its state.
 */
export interface FileHandle {
  id: number
  path: string
  mode: string
  content: string
  position: number
  dirty: boolean
}

/**
 * Interface for filesystem operations needed by the handler.
 */
export interface FileSystemOperations {
  exists(path: string): boolean
  isDirectory(path: string): boolean
  readFile(path: string): string
  writeFile(path: string, content: string): void
}

/**
 * Handler for Lua file I/O operations.
 * Manages file handles and provides read/write operations against a virtual filesystem.
 */
export class FileOperationsHandler {
  private fileHandles = new Map<number, FileHandle>()
  private nextHandleId = 1
  private filesystem: FileSystemOperations
  private pathResolver: (path: string) => string
  private onFileSystemChange?: () => void

  /**
   * Create a new file operations handler.
   * @param filesystem - The filesystem to operate on
   * @param pathResolver - Function to resolve relative paths to absolute paths
   * @param onFileSystemChange - Optional callback when filesystem changes (for UI refresh)
   */
  constructor(
    filesystem: FileSystemOperations,
    pathResolver: (path: string) => string,
    onFileSystemChange?: () => void
  ) {
    this.filesystem = filesystem
    this.pathResolver = pathResolver
    this.onFileSystemChange = onFileSystemChange
  }

  /**
   * Create the file operations callbacks for use with LuaEngineFactory.
   */
  createCallbacks(): FileOperationsCallbacks {
    return {
      open: (path: string, mode: string): FileOpenResult => {
        return this.fileOpen(path, mode)
      },
      read: (handle: number, format: string | number): FileReadResult => {
        return this.fileRead(handle, format)
      },
      write: (handle: number, content: string): FileWriteResult => {
        return this.fileWrite(handle, content)
      },
      close: (handle: number): FileCloseResult => {
        return this.fileClose(handle)
      },
    }
  }

  /**
   * Open a file for reading or writing.
   */
  fileOpen(path: string, mode: string): FileOpenResult {
    const resolvedPath = this.pathResolver(path)

    const isRead = mode === 'r' || mode === 'r+'
    const isWrite = mode === 'w' || mode === 'w+'
    const isAppend = mode === 'a' || mode === 'a+'

    if (isRead) {
      return this.openForRead(path, resolvedPath, mode)
    }

    if (isWrite) {
      return this.openForWrite(path, resolvedPath, mode)
    }

    if (isAppend) {
      return this.openForAppend(path, resolvedPath, mode)
    }

    return { success: false, error: `Invalid mode: ${mode}` }
  }

  private openForRead(
    path: string,
    resolvedPath: string,
    mode: string
  ): FileOpenResult {
    if (!this.filesystem.exists(resolvedPath)) {
      return { success: false, error: `${path}: No such file or directory` }
    }
    if (this.filesystem.isDirectory(resolvedPath)) {
      return { success: false, error: `${path}: Is a directory` }
    }
    try {
      const content = this.filesystem.readFile(resolvedPath)
      const handle: FileHandle = {
        id: this.nextHandleId++,
        path: resolvedPath,
        mode,
        content,
        position: 0,
        dirty: false,
      }
      this.fileHandles.set(handle.id, handle)
      return { success: true, handle: handle.id }
    } catch (error) {
      return { success: false, error: `${path}: ${error}` }
    }
  }

  private openForWrite(
    path: string,
    resolvedPath: string,
    mode: string
  ): FileOpenResult {
    try {
      const parentPath = resolvedPath.substring(0, resolvedPath.lastIndexOf('/'))
      if (parentPath && !this.filesystem.exists(parentPath)) {
        return { success: false, error: `${path}: No such file or directory` }
      }

      const handle: FileHandle = {
        id: this.nextHandleId++,
        path: resolvedPath,
        mode,
        content: '',
        position: 0,
        dirty: true,
      }
      this.fileHandles.set(handle.id, handle)
      return { success: true, handle: handle.id }
    } catch (error) {
      return { success: false, error: `${path}: ${error}` }
    }
  }

  private openForAppend(
    path: string,
    resolvedPath: string,
    mode: string
  ): FileOpenResult {
    try {
      let content = ''
      if (this.filesystem.exists(resolvedPath)) {
        if (this.filesystem.isDirectory(resolvedPath)) {
          return { success: false, error: `${path}: Is a directory` }
        }
        content = this.filesystem.readFile(resolvedPath)
      }

      const handle: FileHandle = {
        id: this.nextHandleId++,
        path: resolvedPath,
        mode,
        content,
        position: content.length,
        dirty: false,
      }
      this.fileHandles.set(handle.id, handle)
      return { success: true, handle: handle.id }
    } catch (error) {
      return { success: false, error: `${path}: ${error}` }
    }
  }

  /**
   * Read from a file handle.
   */
  fileRead(handleId: number, format: string | number): FileReadResult {
    const handle = this.fileHandles.get(handleId)
    if (!handle) {
      return { success: false, error: 'Bad file descriptor' }
    }

    if (handle.mode === 'w' || handle.mode === 'a') {
      return { success: false, error: 'File not open for reading' }
    }

    if (typeof format === 'number') {
      return this.readChars(handle, format)
    }

    return this.readFormat(handle, format)
  }

  private readChars(handle: FileHandle, count: number): FileReadResult {
    if (handle.position >= handle.content.length) {
      return { success: true, data: null }
    }
    const data = handle.content.substring(handle.position, handle.position + count)
    handle.position += data.length
    return { success: true, data }
  }

  private readFormat(handle: FileHandle, format: string): FileReadResult {
    switch (format) {
      case 'a':
      case '*a':
        return this.readAll(handle)
      case 'l':
      case '*l':
        return this.readLine(handle, false)
      case 'L':
      case '*L':
        return this.readLine(handle, true)
      case 'n':
      case '*n':
        return this.readNumber(handle)
      default:
        return { success: false, error: `Invalid read format: ${format}` }
    }
  }

  private readAll(handle: FileHandle): FileReadResult {
    const data = handle.content.substring(handle.position)
    handle.position = handle.content.length
    return { success: true, data }
  }

  private readLine(handle: FileHandle, includeNewline: boolean): FileReadResult {
    if (handle.position >= handle.content.length) {
      return { success: true, data: null }
    }
    const remaining = handle.content.substring(handle.position)
    const newlineIndex = remaining.indexOf('\n')

    if (newlineIndex === -1) {
      handle.position = handle.content.length
      return { success: true, data: includeNewline ? remaining + '\n' : remaining }
    }

    const endIndex = includeNewline ? newlineIndex + 1 : newlineIndex
    const line = remaining.substring(0, endIndex)
    handle.position += newlineIndex + 1
    return { success: true, data: line }
  }

  private readNumber(handle: FileHandle): FileReadResult {
    if (handle.position >= handle.content.length) {
      return { success: true, data: null }
    }
    const remaining = handle.content.substring(handle.position)
    const trimmed = remaining.trimStart()
    const whitespaceSkipped = remaining.length - trimmed.length
    const match = trimmed.match(/^[-+]?(\d+\.?\d*|\d*\.?\d+)([eE][-+]?\d+)?/)
    if (!match) {
      return { success: true, data: null }
    }
    handle.position += whitespaceSkipped + match[0].length
    return { success: true, data: match[0] }
  }

  /**
   * Write to a file handle.
   */
  fileWrite(handleId: number, content: string): FileWriteResult {
    const handle = this.fileHandles.get(handleId)
    if (!handle) {
      return { success: false, error: 'Bad file descriptor' }
    }

    if (handle.mode === 'r') {
      return { success: false, error: 'File not open for writing' }
    }

    if (handle.mode === 'a' || handle.mode === 'a+') {
      handle.content += content
      handle.position = handle.content.length
    } else {
      handle.content =
        handle.content.substring(0, handle.position) +
        content +
        handle.content.substring(handle.position + content.length)
      handle.position += content.length
    }

    handle.dirty = true
    return { success: true }
  }

  /**
   * Close a file handle.
   */
  fileClose(handleId: number): FileCloseResult {
    const handle = this.fileHandles.get(handleId)
    if (!handle) {
      return { success: false, error: 'Bad file descriptor' }
    }

    let didWrite = false
    if (handle.dirty) {
      try {
        this.filesystem.writeFile(handle.path, handle.content)
        didWrite = true
      } catch (error) {
        this.fileHandles.delete(handleId)
        return { success: false, error: `Failed to write file: ${error}` }
      }
    }

    this.fileHandles.delete(handleId)

    // Notify UI that filesystem changed (for file tree refresh)
    if (didWrite && this.onFileSystemChange) {
      this.onFileSystemChange()
    }

    return { success: true }
  }

  /**
   * Close all open file handles. Call this on process exit.
   */
  closeAll(): void {
    for (const [handleId] of this.fileHandles) {
      this.fileClose(handleId)
    }
    this.fileHandles.clear()
  }
}
