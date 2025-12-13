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
  PersistedWorkspace,
  UseWorkspaceManagerReturn,
  WorkspaceManagerState,
  MountedWorkspaceInfo,
} from './workspaceTypes'
import { createVirtualFileSystem } from './virtualFileSystemFactory'

export const WORKSPACE_STORAGE_KEY = 'lua-workspaces'
export const DEFAULT_WORKSPACE_ID = 'default'
const DEFAULT_WORKSPACE_NAME = 'My Files'
const DEFAULT_MOUNT_PATH = '/my-files'

/**
 * Generate a unique workspace ID.
 */
function generateWorkspaceId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Convert a workspace name to a mount path.
 * e.g., "My Files" -> "/my-files", "Project 1" -> "/project-1"
 */
function nameToMountPath(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `/${slug || 'workspace'}`
}

/**
 * Generate a unique mount path for a workspace.
 * Handles collisions by appending numbers: /project, /project-2, /project-3
 */
function generateMountPath(name: string, existingPaths: Set<string>): string {
  const basePath = nameToMountPath(name)

  if (!existingPaths.has(basePath)) {
    return basePath
  }

  let counter = 2
  while (existingPaths.has(`${basePath}-${counter}`)) {
    counter++
  }

  return `${basePath}-${counter}`
}

/**
 * Load persisted workspace metadata from localStorage.
 */
function loadPersistedWorkspaces(): PersistedWorkspace[] | null {
  try {
    const data = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data)
    return parsed.workspaces as PersistedWorkspace[]
  } catch {
    return null
  }
}

/**
 * Save workspace metadata to localStorage.
 */
function saveWorkspaces(workspaces: Workspace[]): void {
  const persistedWorkspaces: PersistedWorkspace[] = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    mountPath: w.mountPath,
  }))

  localStorage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      workspaces: persistedWorkspaces,
    })
  )
}

/**
 * Create the default workspace.
 */
function createDefaultWorkspace(): Workspace {
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: DEFAULT_WORKSPACE_NAME,
    type: 'virtual',
    mountPath: DEFAULT_MOUNT_PATH,
    filesystem: createVirtualFileSystem(DEFAULT_WORKSPACE_ID),
    status: 'connected',
  }
}

/**
 * Migrate legacy workspace data that may have rootPath instead of mountPath.
 */
function migratePersistedWorkspace(
  pw: PersistedWorkspace & { rootPath?: string },
  existingPaths: Set<string>
): PersistedWorkspace {
  // If already has mountPath, use it
  if (pw.mountPath) {
    return pw
  }

  // Generate mount path from name for legacy data
  const mountPath =
    pw.id === DEFAULT_WORKSPACE_ID
      ? DEFAULT_MOUNT_PATH
      : generateMountPath(pw.name, existingPaths)

  return {
    id: pw.id,
    name: pw.name,
    type: pw.type,
    mountPath,
  }
}

/**
 * Initialize workspaces from localStorage or create default.
 */
function initializeWorkspaces(): WorkspaceManagerState {
  const persistedWorkspaces = loadPersistedWorkspaces()

  if (!persistedWorkspaces || persistedWorkspaces.length === 0) {
    const defaultWorkspace = createDefaultWorkspace()
    return {
      workspaces: [defaultWorkspace],
    }
  }

  // Migrate and restore workspaces
  const existingPaths = new Set<string>()
  const migratedWorkspaces = persistedWorkspaces.map((pw) => {
    const migrated = migratePersistedWorkspace(
      pw as PersistedWorkspace & { rootPath?: string },
      existingPaths
    )
    existingPaths.add(migrated.mountPath)
    return migrated
  })

  const workspaces: Workspace[] = migratedWorkspaces.map((pw) => {
    if (pw.type === 'virtual') {
      return {
        id: pw.id,
        name: pw.name,
        type: pw.type,
        mountPath: pw.mountPath,
        filesystem: createVirtualFileSystem(pw.id),
        status: 'connected' as const,
      }
    } else {
      // Local workspaces are disconnected until handle is re-provided
      return {
        id: pw.id,
        name: pw.name,
        type: pw.type,
        mountPath: pw.mountPath,
        filesystem: createDisconnectedFileSystem(),
        status: 'disconnected' as const,
      }
    }
  })

  // Ensure default workspace exists
  const hasDefault = workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID)
  if (!hasDefault) {
    workspaces.unshift(createDefaultWorkspace())
  }

  return {
    workspaces,
  }
}

/**
 * Create a placeholder filesystem for disconnected local workspaces.
 */
function createDisconnectedFileSystem(): IFileSystem {
  const throwDisconnected = (): never => {
    throw new Error('Workspace is disconnected. Please reconnect to access files.')
  }

  return {
    getCurrentDirectory: () => '/',
    setCurrentDirectory: throwDisconnected,
    exists: () => false,
    isDirectory: () => false,
    isFile: () => false,
    listDirectory: throwDisconnected,
    readFile: throwDisconnected,
    writeFile: throwDisconnected,
    createDirectory: throwDisconnected,
    delete: throwDisconnected,
  }
}

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
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    saveWorkspaces(state.workspaces)
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

    return new CompositeFileSystem({ mounts })
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
    getMounts,
    refreshWorkspace,
    refreshAllLocalWorkspaces,
    supportsRefresh,
  }
}
