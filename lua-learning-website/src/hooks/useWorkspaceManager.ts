/**
 * useWorkspaceManager - Multi-workspace management hook with multi-mount support.
 *
 * Manages multiple workspaces with different filesystem backends:
 * - Virtual workspaces: localStorage-backed (always available)
 * - Local workspaces: File System Access API-backed (Chromium only)
 *
 * Architecture: Multi-mount workspaces
 * - Each workspace is mounted at a unique path (e.g., /my-files, /project)
 * - CompositeFileSystem routes operations to the correct workspace
 * - No "active workspace" - the shell's cwd determines context
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  isFileSystemAccessSupported,
  FileSystemAccessAPIFileSystem,
  CompositeFileSystem,
} from '@lua-learning/shell-core'
import type { IFileSystem } from '@lua-learning/shell-core'
import type {
  Workspace,
  UseWorkspaceManagerReturn,
  WorkspaceManagerState,
  MountedWorkspaceInfo,
} from './workspaceTypes'
import { createVirtualFileSystem } from './virtualFileSystemFactory'
import {
  storeDirectoryHandle,
  getDirectoryHandle,
  removeDirectoryHandle,
  requestHandlePermission,
} from './directoryHandleStorage'
import {
  DEFAULT_WORKSPACE_ID,
  DEFAULT_MOUNT_PATH,
  LIBRARY_WORKSPACE_ID,
  generateWorkspaceId,
  generateMountPath,
  saveWorkspaces,
  initializeWorkspaces,
  createDisconnectedFileSystem,
} from './workspaceManagerHelpers'

// Re-export for backwards compatibility
export { WORKSPACE_STORAGE_KEY, DEFAULT_WORKSPACE_ID } from './workspaceManagerHelpers'

/**
 * Hook for managing multiple workspaces with different filesystem backends.
 *
 * Architecture: Multi-mount workspaces
 * - Each workspace is mounted at a unique path (e.g., /my-files, /project)
 * - CompositeFileSystem routes operations to the correct workspace
 * - No "active workspace" - the shell's cwd determines context
 */
export function useWorkspaceManager(): UseWorkspaceManagerReturn {
  const [state, setState] = useState<WorkspaceManagerState>(initializeWorkspaces)
  const isInitialMount = useRef(true)

  // Save to localStorage whenever state changes (except initial mount)
  // Filter out library workspaces as they are ephemeral and recreated on startup
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const persistableWorkspaces = state.workspaces.filter((w) => w.type !== 'library')
    saveWorkspaces(persistableWorkspaces)
  }, [state])

  // Create CompositeFileSystem from connected workspaces
  const compositeFileSystem = useMemo(() => {
    const mounts = state.workspaces
      .filter((w) => w.status === 'connected')
      .map((w) => ({
        mountPath: w.mountPath,
        filesystem: w.filesystem,
        name: w.name,
      }))

    return new CompositeFileSystem({ mounts, initialCwd: DEFAULT_MOUNT_PATH })
  }, [state.workspaces])

  const addVirtualWorkspace = useCallback((name: string): Workspace => {
    const id = generateWorkspaceId()

    // Use setState with functional update to get current state for path generation
    let newWorkspace: Workspace | null = null

    setState((prev) => {
      const existingPaths = new Set(prev.workspaces.map((w) => w.mountPath))
      const mountPath = generateMountPath(name, existingPaths)

      newWorkspace = {
        id,
        name,
        type: 'virtual',
        mountPath,
        filesystem: createVirtualFileSystem(id),
        status: 'connected',
      }

      return {
        ...prev,
        workspaces: [...prev.workspaces, newWorkspace],
      }
    })

    // Return the workspace (it's set synchronously in the setState call)
    return newWorkspace!
  }, [])

  const addLocalWorkspace = useCallback(
    async (
      name: string,
      handle: FileSystemDirectoryHandle
    ): Promise<Workspace> => {
      const id = generateWorkspaceId()
      const fs = new FileSystemAccessAPIFileSystem(handle)
      await fs.initialize()

      let newWorkspace: Workspace | null = null

      setState((prev) => {
        const existingPaths = new Set(prev.workspaces.map((w) => w.mountPath))
        const mountPath = generateMountPath(name, existingPaths)

        newWorkspace = {
          id,
          name,
          type: 'local',
          mountPath,
          filesystem: fs,
          status: 'connected',
          directoryHandle: handle,
        }

        return {
          ...prev,
          workspaces: [...prev.workspaces, newWorkspace],
        }
      })

      // Store handle in IndexedDB for reconnection after page refresh
      storeDirectoryHandle(id, handle).catch((err) => {
        console.error('Failed to store directory handle:', err)
      })

      return newWorkspace!
    },
    []
  )

  const removeWorkspace = useCallback((id: string): void => {
    setState((prev) => {
      const workspace = prev.workspaces.find((w) => w.id === id)

      if (!workspace) {
        throw new Error('Workspace not found')
      }

      if (id === DEFAULT_WORKSPACE_ID) {
        throw new Error('Cannot remove the default workspace')
      }

      if (prev.workspaces.length === 1) {
        throw new Error('Cannot remove the last workspace')
      }

      // Clean up stored handle from IndexedDB for local workspaces
      if (workspace.type === 'local') {
        removeDirectoryHandle(id).catch((err) => {
          console.error('Failed to remove directory handle:', err)
        })
      }

      const newWorkspaces = prev.workspaces.filter((w) => w.id !== id)

      return {
        workspaces: newWorkspaces,
      }
    })
  }, [])

  const getWorkspace = useCallback(
    (id: string): Workspace | undefined => {
      return state.workspaces.find((w) => w.id === id)
    },
    [state.workspaces]
  )

  const getWorkspaceByMountPath = useCallback(
    (mountPath: string): Workspace | undefined => {
      return state.workspaces.find((w) => w.mountPath === mountPath)
    },
    [state.workspaces]
  )

  const reconnectWorkspace = useCallback(
    async (id: string, handle: FileSystemDirectoryHandle): Promise<void> => {
      const workspace = state.workspaces.find((w) => w.id === id)

      if (!workspace) {
        throw new Error('Workspace not found')
      }

      if (workspace.type !== 'local') {
        throw new Error('Cannot reconnect a virtual workspace')
      }

      const fs = new FileSystemAccessAPIFileSystem(handle)
      await fs.initialize()

      // Store handle in IndexedDB for future reconnection
      storeDirectoryHandle(id, handle).catch((err) => {
        console.error('Failed to store directory handle:', err)
      })

      setState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) =>
          w.id === id
            ? {
                ...w,
                filesystem: fs,
                status: 'connected' as const,
                directoryHandle: handle,
              }
            : w
        ),
      }))
    },
    [state.workspaces]
  )

  /**
   * Try to reconnect a workspace using the stored handle from IndexedDB.
   * Returns true if reconnection succeeded, false if user interaction is needed.
   * This shows a simple permission prompt instead of the full directory picker.
   */
  const tryReconnectWithStoredHandle = useCallback(
    async (id: string): Promise<boolean> => {
      const workspace = state.workspaces.find((w) => w.id === id)

      if (!workspace || workspace.type !== 'local') {
        return false
      }

      try {
        const handle = await getDirectoryHandle(id)
        if (!handle) return false

        // Try to get permission (shows simple permission prompt)
        const granted = await requestHandlePermission(handle)
        if (!granted) return false

        // Permission granted - reconnect
        const fs = new FileSystemAccessAPIFileSystem(handle)
        await fs.initialize()

        setState((prev) => ({
          ...prev,
          workspaces: prev.workspaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  filesystem: fs,
                  status: 'connected' as const,
                  directoryHandle: handle,
                }
              : w
          ),
        }))

        return true
      } catch {
        return false
      }
    },
    [state.workspaces]
  )

  /**
   * Disconnect a local workspace without removing it.
   * The workspace remains in the list but becomes inaccessible until reconnected.
   */
  const disconnectWorkspace = useCallback(
    (id: string): void => {
      const workspace = state.workspaces.find((w) => w.id === id)

      if (!workspace) {
        throw new Error('Workspace not found')
      }

      if (workspace.type !== 'local') {
        throw new Error('Cannot disconnect a virtual workspace')
      }

      if (workspace.status === 'disconnected') {
        // Already disconnected
        return
      }

      setState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) =>
          w.id === id
            ? {
                ...w,
                filesystem: createDisconnectedFileSystem(),
                status: 'disconnected' as const,
                directoryHandle: undefined,
              }
            : w
        ),
      }))
    },
    [state.workspaces]
  )

  const getMounts = useCallback((): MountedWorkspaceInfo[] => {
    return state.workspaces.map((w) => ({
      workspace: w,
      mountPath: w.mountPath,
      isConnected: w.status === 'connected',
    }))
  }, [state.workspaces])

  /**
   * Refresh a local workspace to pick up external filesystem changes.
   * Only works for local (File System Access API) workspaces.
   */
  const refreshWorkspace = useCallback(
    async (mountPath: string): Promise<void> => {
      const workspace = state.workspaces.find((w) => w.mountPath === mountPath)

      if (!workspace) {
        throw new Error(`Workspace not found: ${mountPath}`)
      }

      if (workspace.type !== 'local') {
        // Virtual workspaces don't need refresh - they're in-memory
        return
      }

      if (workspace.status !== 'connected') {
        throw new Error('Workspace is disconnected')
      }

      // Call refresh on the filesystem
      const refreshable = workspace.filesystem as IFileSystem & {
        refresh?: () => Promise<void>
      }
      if (typeof refreshable.refresh === 'function') {
        await refreshable.refresh()
      }

      // Trigger a state update to cause re-render (changes the workspaces array reference)
      setState((prev) => ({
        ...prev,
        workspaces: [...prev.workspaces],
      }))
    },
    [state.workspaces]
  )

  /**
   * Refresh all connected local workspaces.
   * Useful for refreshing on window focus.
   */
  const refreshAllLocalWorkspaces = useCallback(async (): Promise<void> => {
    const localWorkspaces = state.workspaces.filter(
      (w) => w.type === 'local' && w.status === 'connected'
    )

    if (localWorkspaces.length === 0) {
      return
    }

    // Refresh all local workspaces in parallel
    await Promise.all(
      localWorkspaces.map(async (workspace) => {
        const refreshable = workspace.filesystem as IFileSystem & {
          refresh?: () => Promise<void>
        }
        if (typeof refreshable.refresh === 'function') {
          await refreshable.refresh()
        }
      })
    )

    // Trigger a state update to cause re-render
    setState((prev) => ({
      ...prev,
      workspaces: [...prev.workspaces],
    }))
  }, [state.workspaces])

  /**
   * Check if a workspace supports refresh (is a connected local workspace).
   */
  const supportsRefresh = useCallback(
    (mountPath: string): boolean => {
      const workspace = state.workspaces.find((w) => w.mountPath === mountPath)
      return (
        workspace?.type === 'local' && workspace?.status === 'connected'
      )
    },
    [state.workspaces]
  )

  /**
   * Rename a workspace (changes both name and mount path).
   * The new mount path is generated from the new name.
   */
  const renameWorkspace = useCallback(
    (mountPath: string, newName: string): void => {
      const workspace = state.workspaces.find((w) => w.mountPath === mountPath)

      if (!workspace) {
        throw new Error(`Workspace not found: ${mountPath}`)
      }

      // Generate new mount path from the new name
      const existingPaths = new Set(
        state.workspaces
          .filter((w) => w.mountPath !== mountPath)
          .map((w) => w.mountPath)
      )
      const newMountPath = generateMountPath(newName, existingPaths)

      setState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) =>
          w.mountPath === mountPath
            ? { ...w, name: newName, mountPath: newMountPath }
            : w
        ),
      }))
    },
    [state.workspaces]
  )

  /**
   * Check if a folder is already mounted as a workspace.
   * Uses isSameEntry() to compare directory handles.
   * Checks both connected workspaces (handles in memory) and
   * disconnected workspaces (handles stored in IndexedDB).
   */
  const isFolderAlreadyMounted = useCallback(
    async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
      const localWorkspaces = state.workspaces.filter((w) => w.type === 'local')

      for (const workspace of localWorkspaces) {
        try {
          // For connected workspaces, use the handle in memory
          if (workspace.directoryHandle) {
            const isSame = await handle.isSameEntry(workspace.directoryHandle)
            if (isSame) {
              return true
            }
          } else {
            // For disconnected workspaces, try to get the handle from IndexedDB
            const storedHandle = await getDirectoryHandle(workspace.id)
            if (storedHandle) {
              const isSame = await handle.isSameEntry(storedHandle)
              if (isSame) {
                return true
              }
            }
          }
        } catch {
          // isSameEntry might fail if handle is invalid, continue checking
        }
      }

      return false
    },
    [state.workspaces]
  )

  /**
   * Get a unique workspace name by appending numbers if the name already exists.
   * e.g., "project" -> "project", "project" -> "project-2", "project" -> "project-3"
   */
  const getUniqueWorkspaceName = useCallback(
    (baseName: string): string => {
      const existingNames = new Set(state.workspaces.map((w) => w.name.toLowerCase()))

      if (!existingNames.has(baseName.toLowerCase())) {
        return baseName
      }

      let counter = 2
      while (existingNames.has(`${baseName.toLowerCase()}-${counter}`)) {
        counter++
      }

      return `${baseName}-${counter}`
    },
    [state.workspaces]
  )

  /**
   * Check if a path is in a read-only workspace.
   * @param path - The file path to check (e.g., '/libs/shell.lua')
   * @returns true if the path is in a read-only workspace
   */
  const isPathReadOnly = useCallback(
    (path: string): boolean => {
      // Find the workspace that contains this path
      const workspace = state.workspaces.find((w) => path.startsWith(w.mountPath))
      return workspace?.isReadOnly === true
    },
    [state.workspaces]
  )

  /**
   * Get the library workspace.
   * @returns The library workspace, or undefined if not found
   */
  const getLibraryWorkspace = useCallback((): Workspace | undefined => {
    return state.workspaces.find((w) => w.id === LIBRARY_WORKSPACE_ID)
  }, [state.workspaces])

  return {
    workspaces: state.workspaces,
    compositeFileSystem,
    addVirtualWorkspace,
    addLocalWorkspace,
    removeWorkspace,
    getWorkspace,
    getWorkspaceByMountPath,
    isFileSystemAccessSupported,
    reconnectWorkspace,
    tryReconnectWithStoredHandle,
    disconnectWorkspace,
    getMounts,
    refreshWorkspace,
    refreshAllLocalWorkspaces,
    supportsRefresh,
    renameWorkspace,
    isFolderAlreadyMounted,
    getUniqueWorkspaceName,
    isPathReadOnly,
    getLibraryWorkspace,
  }
}
