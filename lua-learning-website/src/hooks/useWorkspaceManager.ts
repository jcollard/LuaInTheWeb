/**
 * useWorkspaceManager - Multi-workspace management hook.
 *
 * Manages multiple workspaces with different filesystem backends:
 * - Virtual workspaces: localStorage-backed (always available)
 * - Local workspaces: File System Access API-backed (Chromium only)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  isFileSystemAccessSupported,
  FileSystemAccessAPIFileSystem,
} from '@lua-learning/shell-core'
import type { IFileSystem } from '@lua-learning/shell-core'
import type {
  Workspace,
  PersistedWorkspace,
  UseWorkspaceManagerReturn,
  WorkspaceManagerState,
} from './workspaceTypes'
import { createVirtualFileSystem } from './virtualFileSystemFactory'

export const WORKSPACE_STORAGE_KEY = 'lua-workspaces'
export const DEFAULT_WORKSPACE_ID = 'default'
const DEFAULT_WORKSPACE_NAME = 'My Files'

/**
 * Generate a unique workspace ID.
 */
function generateWorkspaceId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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
 * Load active workspace ID from localStorage.
 */
function loadActiveWorkspaceId(): string | null {
  try {
    const data = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data)
    return parsed.activeWorkspaceId as string
  } catch {
    return null
  }
}

/**
 * Save workspace metadata to localStorage.
 */
function saveWorkspaces(
  workspaces: Workspace[],
  activeWorkspaceId: string
): void {
  const persistedWorkspaces: PersistedWorkspace[] = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    rootPath: w.rootPath,
  }))

  localStorage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      workspaces: persistedWorkspaces,
      activeWorkspaceId,
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
    rootPath: '/',
    filesystem: createVirtualFileSystem(DEFAULT_WORKSPACE_ID),
    status: 'connected',
  }
}

/**
 * Initialize workspaces from localStorage or create default.
 */
function initializeWorkspaces(): WorkspaceManagerState {
  const persistedWorkspaces = loadPersistedWorkspaces()
  const savedActiveId = loadActiveWorkspaceId()

  if (!persistedWorkspaces || persistedWorkspaces.length === 0) {
    const defaultWorkspace = createDefaultWorkspace()
    return {
      workspaces: [defaultWorkspace],
      activeWorkspaceId: DEFAULT_WORKSPACE_ID,
    }
  }

  // Restore workspaces
  const workspaces: Workspace[] = persistedWorkspaces.map((pw) => {
    if (pw.type === 'virtual') {
      return {
        id: pw.id,
        name: pw.name,
        type: pw.type,
        rootPath: pw.rootPath,
        filesystem: createVirtualFileSystem(pw.id),
        status: 'connected' as const,
      }
    } else {
      // Local workspaces are disconnected until handle is re-provided
      return {
        id: pw.id,
        name: pw.name,
        type: pw.type,
        rootPath: pw.rootPath,
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

  // Validate active workspace ID
  const activeId =
    savedActiveId && workspaces.some((w) => w.id === savedActiveId)
      ? savedActiveId
      : DEFAULT_WORKSPACE_ID

  return {
    workspaces,
    activeWorkspaceId: activeId,
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
    saveWorkspaces(state.workspaces, state.activeWorkspaceId)
  }, [state])

  const activeWorkspace =
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) ??
    state.workspaces[0]

  const addVirtualWorkspace = useCallback((name: string): Workspace => {
    const id = generateWorkspaceId()
    const newWorkspace: Workspace = {
      id,
      name,
      type: 'virtual',
      rootPath: '/',
      filesystem: createVirtualFileSystem(id),
      status: 'connected',
    }

    setState((prev) => ({
      ...prev,
      workspaces: [...prev.workspaces, newWorkspace],
    }))

    return newWorkspace
  }, [])

  const addLocalWorkspace = useCallback(
    async (
      name: string,
      handle: FileSystemDirectoryHandle
    ): Promise<Workspace> => {
      const id = generateWorkspaceId()
      const fs = new FileSystemAccessAPIFileSystem(handle)
      await fs.initialize()

      const newWorkspace: Workspace = {
        id,
        name,
        type: 'local',
        rootPath: '/',
        filesystem: fs,
        status: 'connected',
        directoryHandle: handle,
      }

      setState((prev) => ({
        ...prev,
        workspaces: [...prev.workspaces, newWorkspace],
      }))

      return newWorkspace
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
      const newActiveId =
        prev.activeWorkspaceId === id
          ? DEFAULT_WORKSPACE_ID
          : prev.activeWorkspaceId

      return {
        workspaces: newWorkspaces,
        activeWorkspaceId: newActiveId,
      }
    })
  }, [])

  const setActiveWorkspace = useCallback((id: string): void => {
    setState((prev) => {
      const workspace = prev.workspaces.find((w) => w.id === id)
      if (!workspace) {
        throw new Error('Workspace not found')
      }

      return {
        ...prev,
        activeWorkspaceId: id,
      }
    })
  }, [])

  const getWorkspace = useCallback(
    (id: string): Workspace | undefined => {
      return state.workspaces.find((w) => w.id === id)
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

  return {
    workspaces: state.workspaces,
    activeWorkspace,
    addVirtualWorkspace,
    addLocalWorkspace,
    removeWorkspace,
    setActiveWorkspace,
    getWorkspace,
    isFileSystemAccessSupported,
    reconnectWorkspace,
  }
}
