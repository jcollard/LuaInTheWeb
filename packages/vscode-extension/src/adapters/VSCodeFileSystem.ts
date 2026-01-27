/**
 * VS Code File System Adapter
 *
 * Implements IFileSystem interface using VS Code's workspace.fs API.
 * This allows the Lua runtime to read/write files in the user's workspace.
 */

import * as vscode from 'vscode'
import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'
import * as path from 'path'

/**
 * Adapts VS Code's file system API to the IFileSystem interface.
 */
export class VSCodeFileSystem implements IFileSystem {
  private currentDir: string
  private workspaceRoot: string

  constructor(workspaceRoot?: string) {
    // Use the first workspace folder as root, or fall back to home directory
    const workspaceFolders = vscode.workspace.workspaceFolders
    this.workspaceRoot = workspaceRoot ?? workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()
    this.currentDir = this.workspaceRoot
  }

  getCurrentDirectory(): string {
    return this.currentDir
  }

  setCurrentDirectory(newPath: string): void {
    const resolved = this.resolvePath(newPath)
    if (!this.exists(resolved)) {
      throw new Error(`Directory not found: ${newPath}`)
    }
    if (!this.isDirectory(resolved)) {
      throw new Error(`Not a directory: ${newPath}`)
    }
    this.currentDir = resolved
  }

  exists(filePath: string): boolean {
    try {
      const resolved = this.resolvePath(filePath)
      const uri = vscode.Uri.file(resolved)
      // Synchronous check - we need to handle this differently for VS Code
      // Use a workaround with try/catch on stat
      const stat = this.statSync(uri)
      return stat !== null
    } catch {
      return false
    }
  }

  isDirectory(filePath: string): boolean {
    try {
      const resolved = this.resolvePath(filePath)
      const uri = vscode.Uri.file(resolved)
      const stat = this.statSync(uri)
      return stat?.type === vscode.FileType.Directory
    } catch {
      return false
    }
  }

  isFile(filePath: string): boolean {
    try {
      const resolved = this.resolvePath(filePath)
      const uri = vscode.Uri.file(resolved)
      const stat = this.statSync(uri)
      return stat?.type === vscode.FileType.File
    } catch {
      return false
    }
  }

  listDirectory(dirPath: string): FileEntry[] {
    const resolved = this.resolvePath(dirPath)
    const uri = vscode.Uri.file(resolved)

    // This is a synchronous operation workaround
    const entries = this.readDirectorySync(uri)
    if (!entries) {
      throw new Error(`Cannot read directory: ${dirPath}`)
    }

    return entries.map(([name, type]) => ({
      name,
      type: type === vscode.FileType.Directory ? 'directory' : 'file',
      path: path.join(resolved, name),
    }))
  }

  readFile(filePath: string): string {
    const resolved = this.resolvePath(filePath)
    const uri = vscode.Uri.file(resolved)

    const content = this.readFileSync(uri)
    if (content === null) {
      throw new Error(`Cannot read file: ${filePath}`)
    }
    return content
  }

  writeFile(filePath: string, content: string): void {
    const resolved = this.resolvePath(filePath)
    const uri = vscode.Uri.file(resolved)

    // Queue write operation
    this.writeFileAsync(uri, content)
  }

  createDirectory(dirPath: string): void {
    const resolved = this.resolvePath(dirPath)
    const uri = vscode.Uri.file(resolved)

    // Queue directory creation
    this.createDirectoryAsync(uri)
  }

  delete(filePath: string): void {
    const resolved = this.resolvePath(filePath)
    const uri = vscode.Uri.file(resolved)

    // Queue delete operation
    this.deleteAsync(uri)
  }

  // Binary file support
  isBinaryFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp',
      '.mp3', '.wav', '.ogg',
      '.ttf', '.otf', '.woff', '.woff2',
      '.zip', '.tar', '.gz',
      '.exe', '.dll', '.so', '.dylib',
    ]
    return binaryExtensions.includes(ext)
  }

  readBinaryFile(filePath: string): Uint8Array {
    const resolved = this.resolvePath(filePath)
    const uri = vscode.Uri.file(resolved)

    const content = this.readBinaryFileSync(uri)
    if (content === null) {
      throw new Error(`Cannot read binary file: ${filePath}`)
    }
    return content
  }

  writeBinaryFile(filePath: string, content: Uint8Array): void {
    const resolved = this.resolvePath(filePath)
    const uri = vscode.Uri.file(resolved)

    this.writeBinaryFileAsync(uri, content)
  }

  // Helper methods

  /**
   * Resolve a path relative to the current directory.
   */
  private resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return path.normalize(inputPath)
    }
    return path.normalize(path.join(this.currentDir, inputPath))
  }

  /**
   * Synchronous stat operation using cached data.
   * Note: This is a workaround since VS Code API is async.
   * For real implementation, we'd need to cache or use a different approach.
   */
  private statSync(uri: vscode.Uri): vscode.FileStat | null {
    // In VS Code extensions, we often need to work around async APIs
    // This implementation uses Node.js fs module directly since we're in Node context
    try {
      const fs = require('fs')
      const stats = fs.statSync(uri.fsPath)
      return {
        type: stats.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
        ctime: stats.ctimeMs,
        mtime: stats.mtimeMs,
        size: stats.size,
      }
    } catch {
      return null
    }
  }

  /**
   * Synchronous directory read.
   */
  private readDirectorySync(uri: vscode.Uri): [string, vscode.FileType][] | null {
    try {
      const fs = require('fs')
      const entries = fs.readdirSync(uri.fsPath, { withFileTypes: true })
      return entries.map((entry: { name: string; isDirectory: () => boolean }) => [
        entry.name,
        entry.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
      ])
    } catch {
      return null
    }
  }

  /**
   * Synchronous file read.
   */
  private readFileSync(uri: vscode.Uri): string | null {
    try {
      const fs = require('fs')
      return fs.readFileSync(uri.fsPath, 'utf-8')
    } catch {
      return null
    }
  }

  /**
   * Synchronous binary file read.
   */
  private readBinaryFileSync(uri: vscode.Uri): Uint8Array | null {
    try {
      const fs = require('fs')
      return fs.readFileSync(uri.fsPath)
    } catch {
      return null
    }
  }

  /**
   * Async file write.
   */
  private async writeFileAsync(uri: vscode.Uri, content: string): Promise<void> {
    const encoder = new TextEncoder()
    await vscode.workspace.fs.writeFile(uri, encoder.encode(content))
  }

  /**
   * Async binary file write.
   */
  private async writeBinaryFileAsync(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    await vscode.workspace.fs.writeFile(uri, content)
  }

  /**
   * Async directory creation.
   */
  private async createDirectoryAsync(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.createDirectory(uri)
  }

  /**
   * Async delete operation.
   */
  private async deleteAsync(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.delete(uri)
  }
}
