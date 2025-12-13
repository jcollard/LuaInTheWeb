/**
 * Workspace type definitions for multi-workspace management.
 */

import type { IFileSystem } from '@lua-learning/shell-core'

/**
 * Supported workspace types.
 */
export type WorkspaceType = 'virtual' | 'local'

/**
 * Connection status for workspaces.
 * - 'connected': Workspace is ready to use
 * - 'disconnected': Local workspace needs permission re-grant (page reload)
 */
export type WorkspaceConnectionStatus = 'connected' | 'disconnected'

/**
 * Represents a workspace with its filesystem backend.
 */
export interface Workspace {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Type of filesystem backend */
  type: WorkspaceType
  /** Root path for this workspace */
  rootPath: string
  /** Filesystem implementation */
  filesystem: IFileSystem
  /** Connection status (local workspaces may be disconnected after reload) */
  status: WorkspaceConnectionStatus
  /** For local workspaces: the directory handle (cannot be persisted) */
  directoryHandle?: FileSystemDirectoryHandle
}

/**
 * Persisted workspace metadata (stored in localStorage).
 * Note: FileSystemDirectoryHandle cannot be serialized.
 */
export interface PersistedWorkspace {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Type of filesystem backend */
  type: WorkspaceType
  /** Root path for this workspace */
  rootPath: string
}

/**
 * State shape for workspace manager.
 */
export interface WorkspaceManagerState {
  /** All workspaces */
  workspaces: Workspace[]
  /** ID of the currently active workspace */
  activeWorkspaceId: string
}

/**
 * Return type for useWorkspaceManager hook.
 */
export interface UseWorkspaceManagerReturn {
  /** All workspaces */
  workspaces: Workspace[]
  /** The currently active workspace */
  activeWorkspace: Workspace
  /** Add a new virtual (localStorage-backed) workspace */
  addVirtualWorkspace: (name: string) => Workspace
  /** Add a new local (File System Access API-backed) workspace */
  addLocalWorkspace: (name: string, handle: FileSystemDirectoryHandle) => Promise<Workspace>
  /** Remove a workspace by ID */
  removeWorkspace: (id: string) => void
  /** Set the active workspace by ID */
  setActiveWorkspace: (id: string) => void
  /** Get a workspace by ID */
  getWorkspace: (id: string) => Workspace | undefined
  /** Check if File System Access API is supported */
  isFileSystemAccessSupported: () => boolean
  /** Reconnect a disconnected local workspace */
  reconnectWorkspace: (id: string, handle: FileSystemDirectoryHandle) => Promise<void>
}
