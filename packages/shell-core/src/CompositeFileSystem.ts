/**
 * CompositeFileSystem - Routes filesystem operations to mounted filesystems.
 *
 * Provides a unified view of multiple filesystems mounted at different paths.
 * The root '/' is a virtual directory containing all mount points.
 */

import type { IFileSystem, FileEntry } from './types'
import { normalizePath, resolvePath, getParentPath } from './pathUtils'

/**
 * A mount point mapping a path prefix to an IFileSystem.
 */
export interface MountPoint {
  /** The mount path (e.g., '/my-files') - must start with '/' */
  mountPath: string
  /** The underlying filesystem for this mount */
  filesystem: IFileSystem
  /** Display name for the mount (for ls output) */
  name: string
  /** Whether this mount is read-only */
  readonly?: boolean
}

/**
 * Configuration for CompositeFileSystem.
 */
export interface CompositeFileSystemConfig {
  /** Initial mount points */
  mounts?: MountPoint[]
  /** Initial working directory (must be within a mount or root) */
  initialCwd?: string
}

/**
 * Result of resolving a path to its mount.
 */
interface MountResolution {
  mount: MountPoint
  relativePath: string
}

/**
 * CompositeFileSystem routes filesystem operations to the appropriate
 * mounted filesystem based on path prefixes.
 *
 * Features:
 * - Multiple filesystems mounted at different paths
 * - Virtual root directory listing all mount points
 * - Path routing to correct underlying filesystem
 * - Dynamic mount/unmount support
 */
export class CompositeFileSystem implements IFileSystem {
  private mounts: Map<string, MountPoint> = new Map()
  private cwd: string = '/'

  constructor(config: CompositeFileSystemConfig = {}) {
    if (config.mounts) {
      for (const mount of config.mounts) {
        this.mount(mount)
      }
    }

    if (config.initialCwd) {
      this.cwd = normalizePath(config.initialCwd)
    }
  }

  /**
   * Mount a filesystem at the specified path.
   * @throws Error if mount path is invalid or already in use
   */
  mount(mountPoint: MountPoint): void {
    const normalizedPath = normalizePath(mountPoint.mountPath)

    if (normalizedPath === '/') {
      throw new Error('Cannot mount at root path')
    }

    if (getParentPath(normalizedPath) !== '/') {
      throw new Error(`Mount path must be at root level: ${normalizedPath}`)
    }

    if (this.mounts.has(normalizedPath)) {
      throw new Error(`Mount path already in use: ${normalizedPath}`)
    }

    this.mounts.set(normalizedPath, {
      ...mountPoint,
      mountPath: normalizedPath,
    })
  }

  /**
   * Unmount a filesystem at the specified path.
   * @throws Error if no filesystem is mounted at the path
   */
  unmount(mountPath: string): void {
    const normalizedPath = normalizePath(mountPath)

    if (!this.mounts.has(normalizedPath)) {
      throw new Error(`No filesystem mounted at: ${normalizedPath}`)
    }

    this.mounts.delete(normalizedPath)

    // If cwd was within the unmounted filesystem, reset to root
    if (this.cwd === normalizedPath || this.cwd.startsWith(normalizedPath + '/')) {
      this.cwd = '/'
    }
  }

  /**
   * Get all current mount points.
   */
  getMounts(): MountPoint[] {
    return Array.from(this.mounts.values())
  }

  /**
   * Resolve an absolute path to its mount point and relative path within that mount.
   * Returns null for paths at root level (not within any mount).
   */
  private resolveMount(path: string): MountResolution | null {
    const normalized = normalizePath(path)

    // Root is virtual, not backed by any mount
    if (normalized === '/') {
      return null
    }

    // Find the mount with the matching prefix
    for (const [mountPath, mount] of this.mounts) {
      if (normalized === mountPath) {
        return { mount, relativePath: '/' }
      }
      if (normalized.startsWith(mountPath + '/')) {
        const relativePath = normalized.substring(mountPath.length)
        return { mount, relativePath }
      }
    }

    return null
  }

  /**
   * Resolve a path (relative or absolute) to an absolute normalized path.
   */
  private resolvePath(path: string): string {
    return resolvePath(this.cwd, path)
  }

  // IFileSystem implementation

  getCurrentDirectory(): string {
    return this.cwd
  }

  setCurrentDirectory(path: string): void {
    const resolved = this.resolvePath(path)

    // Allow cd to root
    if (resolved === '/') {
      this.cwd = '/'
      return
    }

    // Check if path is a mount point itself
    if (this.mounts.has(resolved)) {
      this.cwd = resolved
      return
    }

    // Delegate to mounted filesystem for validation
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      throw new Error(`Directory not found: ${resolved}`)
    }

    // Verify it's a directory in the underlying filesystem
    if (!mountInfo.mount.filesystem.isDirectory(mountInfo.relativePath)) {
      throw new Error(`Not a directory: ${resolved}`)
    }

    this.cwd = resolved
  }

  exists(path: string): boolean {
    const resolved = this.resolvePath(path)

    // Root always exists
    if (resolved === '/') {
      return true
    }

    // Check if it's a mount point
    if (this.mounts.has(resolved)) {
      return true
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      return false
    }

    return mountInfo.mount.filesystem.exists(mountInfo.relativePath)
  }

  isDirectory(path: string): boolean {
    const resolved = this.resolvePath(path)

    // Root is a directory
    if (resolved === '/') {
      return true
    }

    // Mount points are directories
    if (this.mounts.has(resolved)) {
      return true
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      return false
    }

    return mountInfo.mount.filesystem.isDirectory(mountInfo.relativePath)
  }

  isFile(path: string): boolean {
    const resolved = this.resolvePath(path)

    // Root is not a file
    if (resolved === '/') {
      return false
    }

    // Mount points are not files
    if (this.mounts.has(resolved)) {
      return false
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      return false
    }

    return mountInfo.mount.filesystem.isFile(mountInfo.relativePath)
  }

  listDirectory(path: string): FileEntry[] {
    const resolved = this.resolvePath(path)

    // Virtual root: list all mount points
    if (resolved === '/') {
      return Array.from(this.mounts.values())
        .map((mount) => ({
          name: mount.name,
          type: 'directory' as const,
          path: mount.mountPath,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      throw new Error(`Directory not found: ${resolved}`)
    }

    const entries = mountInfo.mount.filesystem.listDirectory(mountInfo.relativePath)

    // Translate paths back to composite namespace
    return entries.map((entry) => ({
      ...entry,
      path: mountInfo.mount.mountPath + entry.path,
    }))
  }

  readFile(path: string): string {
    const resolved = this.resolvePath(path)

    // Cannot read root as a file
    if (resolved === '/') {
      throw new Error('Cannot read directory as file: /')
    }

    // Cannot read mount points as files
    if (this.mounts.has(resolved)) {
      throw new Error(`Cannot read directory as file: ${resolved}`)
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      throw new Error(`File not found: ${resolved}`)
    }

    return mountInfo.mount.filesystem.readFile(mountInfo.relativePath)
  }

  writeFile(path: string, content: string): void {
    const resolved = this.resolvePath(path)

    // Cannot write to root
    if (resolved === '/') {
      throw new Error('Cannot write to root directory')
    }

    // Cannot write to mount points
    if (this.mounts.has(resolved)) {
      throw new Error(`Cannot write to mount point: ${resolved}`)
    }

    // Cannot create files at root level
    if (getParentPath(resolved) === '/') {
      throw new Error(
        'Cannot create files at root level. Use workspace management to add new workspaces.'
      )
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      throw new Error(`Path not within any mounted workspace: ${resolved}`)
    }

    if (mountInfo.mount.readonly) {
      throw new Error(`Filesystem is read-only: ${mountInfo.mount.mountPath}`)
    }

    mountInfo.mount.filesystem.writeFile(mountInfo.relativePath, content)
  }

  createDirectory(path: string): void {
    const resolved = this.resolvePath(path)

    // Cannot create directories at root
    if (resolved === '/') {
      throw new Error('Cannot create directory at root')
    }

    // Cannot create at root level (would create new mount)
    if (getParentPath(resolved) === '/') {
      throw new Error(
        'Cannot create directory at root level. Use workspace management to add new workspaces.'
      )
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      throw new Error(`Path not within any mounted workspace: ${resolved}`)
    }

    if (mountInfo.mount.readonly) {
      throw new Error(`Filesystem is read-only: ${mountInfo.mount.mountPath}`)
    }

    mountInfo.mount.filesystem.createDirectory(mountInfo.relativePath)
  }

  delete(path: string): void {
    const resolved = this.resolvePath(path)

    // Cannot delete root
    if (resolved === '/') {
      throw new Error('Cannot delete root directory')
    }

    // Cannot delete mount points
    if (this.mounts.has(resolved)) {
      throw new Error(
        `Cannot delete mount point. Use workspace management to remove workspaces: ${resolved}`
      )
    }

    // Delegate to mounted filesystem
    const mountInfo = this.resolveMount(resolved)
    if (!mountInfo) {
      throw new Error(`Path not found: ${resolved}`)
    }

    if (mountInfo.mount.readonly) {
      throw new Error(`Filesystem is read-only: ${mountInfo.mount.mountPath}`)
    }

    mountInfo.mount.filesystem.delete(mountInfo.relativePath)
  }
}
