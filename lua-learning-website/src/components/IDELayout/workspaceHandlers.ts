/**
 * Workspace handlers for IDELayout.
 * Extracted to reduce file size.
 */
import { useCallback } from 'react'
import type { Workspace } from '../../hooks/workspaceTypes'

interface WorkspaceHandlersParams {
  workspaces: Workspace[]
  addLocalWorkspace: (name: string, handle: FileSystemDirectoryHandle) => Promise<Workspace>
  removeWorkspace: (workspaceId: string) => void
  refreshFileTree: () => void
  tryReconnectWithStoredHandle: (id: string) => Promise<boolean>
  reconnectWorkspace: (id: string, handle: FileSystemDirectoryHandle) => Promise<void>
  disconnectWorkspace: (id: string) => void
  renameWorkspace: (mountPath: string, newName: string) => void
}

export function useWorkspaceHandlers({
  workspaces,
  addLocalWorkspace,
  removeWorkspace,
  refreshFileTree,
  tryReconnectWithStoredHandle,
  reconnectWorkspace,
  disconnectWorkspace,
  renameWorkspace,
}: WorkspaceHandlersParams) {
  // Handle adding a local workspace (dialog provides both name and handle)
  const handleAddLocalWorkspace = useCallback(
    async (name: string, handle: FileSystemDirectoryHandle) => {
      await addLocalWorkspace(name, handle)
      refreshFileTree()
    },
    [addLocalWorkspace, refreshFileTree]
  )

  // Handle reconnecting a disconnected local workspace
  const handleReconnectWorkspace = useCallback(
    async (mountPath: string) => {
      const workspace = workspaces.find((w) => w.mountPath === mountPath)
      if (!workspace || workspace.type !== 'local') return

      const reconnected = await tryReconnectWithStoredHandle(workspace.id)
      if (reconnected) {
        refreshFileTree()
        return
      }

      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
        await reconnectWorkspace(workspace.id, handle)
        refreshFileTree()
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to reconnect workspace:', err)
        }
      }
    },
    [workspaces, tryReconnectWithStoredHandle, reconnectWorkspace, refreshFileTree]
  )

  // Handle removing a workspace by mount path
  const handleRemoveWorkspace = useCallback(
    (mountPath: string) => {
      const workspace = workspaces.find((w) => w.mountPath === mountPath)
      if (workspace) {
        removeWorkspace(workspace.id)
        refreshFileTree()
      }
    },
    [workspaces, removeWorkspace, refreshFileTree]
  )

  // Handle renaming a workspace
  const handleRenameWorkspace = useCallback(
    (mountPath: string, newName: string) => {
      renameWorkspace(mountPath, newName)
      refreshFileTree()
    },
    [renameWorkspace, refreshFileTree]
  )

  // Handle disconnecting a local workspace
  const handleDisconnectWorkspace = useCallback(
    (mountPath: string) => {
      const workspace = workspaces.find((w) => w.mountPath === mountPath)
      if (workspace) {
        disconnectWorkspace(workspace.id)
        refreshFileTree()
      }
    },
    [workspaces, disconnectWorkspace, refreshFileTree]
  )

  return {
    handleAddLocalWorkspace,
    handleReconnectWorkspace,
    handleRemoveWorkspace,
    handleRenameWorkspace,
    handleDisconnectWorkspace,
  }
}
