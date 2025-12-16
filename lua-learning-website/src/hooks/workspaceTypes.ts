/**
 * Workspace type definitions for multi-workspace management.
 *
 * Architecture: Multi-mount workspaces
 * - Each workspace is mounted at a unique path (e.g., /my-files, /project)
 * - CompositeFileSystem routes operations to the correct workspace
 * - No "active workspace" - the shell's cwd determines context
 */

import type { IFileSystem } from '@lua-learning/shell-core'

/**
 * Supported workspace types.
 * - 'virtual': localStorage-backed workspace
 * - 'local': File System Access API-backed workspace
 * - 'library': Read-only workspace for built-in libraries (e.g., /libs)
 * - 'docs': Read-only workspace for documentation (e.g., /docs)
 * - 'book': Read-only workspace for book content fetched from public assets (e.g., /adventures)
 */
export type WorkspaceType = 'virtual' | 'local' | 'library' | 'docs' | 'book'

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
  /** Mount path for this workspace (e.g., '/my-files') */
  mountPath: string
  /** Filesystem implementation */
  filesystem: IFileSystem
  /** Connection status (local workspaces may be disconnected after reload) */
  status: WorkspaceConnectionStatus
  /** For local workspaces: the directory handle (cannot be persisted) */
  directoryHandle?: FileSystemDirectoryHandle
  /** Whether the workspace is read-only (library workspaces are always read-only) */
  isReadOnly?: boolean
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
  /** Mount path for this workspace */
  mountPath: string
}

/**
 * State shape for workspace manager.
 */
export interface WorkspaceManagerState {
  /** All workspaces */
  workspaces: Workspace[]
}

/**
 * Information about a mounted workspace.
 */
export interface MountedWorkspaceInfo {
  /** The workspace */
  workspace: Workspace
  /** Mount path (e.g., '/my-files') */
  mountPath: string
  /** Whether the workspace is connected */
  isConnected: boolean
}

/**
 * Return type for useWorkspaceManager hook.
 */
export interface UseWorkspaceManagerReturn {
  /** All workspaces */
  workspaces: Workspace[]
  /** The composite filesystem spanning all mounted workspaces */
  compositeFileSystem: IFileSystem
  /** Add a new virtual (localStorage-backed) workspace */
  addVirtualWorkspace: (name: string) => Workspace
  /** Add a new local (File System Access API-backed) workspace */
  addLocalWorkspace: (name: string, handle: FileSystemDirectoryHandle) => Promise<Workspace>
  /** Remove a workspace by ID */
  removeWorkspace: (id: string) => void
  /** Get a workspace by ID */
  getWorkspace: (id: string) => Workspace | undefined
  /** Get a workspace by mount path */
  getWorkspaceByMountPath: (mountPath: string) => Workspace | undefined
  /** Check if File System Access API is supported */
  isFileSystemAccessSupported: () => boolean
  /** Reconnect a disconnected local workspace */
  reconnectWorkspace: (id: string, handle: FileSystemDirectoryHandle) => Promise<void>
  /** Try to reconnect using stored handle (returns true if successful, false if picker needed) */
  tryReconnectWithStoredHandle: (id: string) => Promise<boolean>
  /** Disconnect a local workspace without removing it */
  disconnectWorkspace: (id: string) => void
  /** Get all mount points info */
  getMounts: () => MountedWorkspaceInfo[]
  /** Refresh a local workspace to pick up external filesystem changes */
  refreshWorkspace: (mountPath: string) => Promise<void>
  /** Refresh all connected local workspaces */
  refreshAllLocalWorkspaces: () => Promise<void>
  /** Check if a workspace supports refresh (is a connected local workspace) */
  supportsRefresh: (mountPath: string) => boolean
  /** Rename a workspace (changes name and mount path) */
  renameWorkspace: (mountPath: string, newName: string) => void
  /** Check if a folder is already mounted as a workspace */
  isFolderAlreadyMounted: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  /** Get a unique workspace name by appending numbers if needed */
  getUniqueWorkspaceName: (baseName: string) => string
  /** Check if a path is in a read-only workspace */
  isPathReadOnly: (path: string) => boolean
  /** Get the library workspace (returns undefined if not found) */
  getLibraryWorkspace: () => Workspace | undefined
}
