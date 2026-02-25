import { useState, useCallback } from 'react'
import type { WorkspaceProps } from './types'

/**
 * Hook encapsulating Add Workspace dialog state and handlers.
 * Extracted from FileExplorer to reduce component line count.
 */
export function useWorkspaceDialogHandlers(workspaceProps?: WorkspaceProps) {
  const [isAddWorkspaceDialogOpen, setIsAddWorkspaceDialogOpen] = useState(false)

  const handleAddWorkspaceClick = useCallback(() => {
    setIsAddWorkspaceDialogOpen(true)
  }, [])

  const handleAddWorkspaceCancel = useCallback(() => {
    setIsAddWorkspaceDialogOpen(false)
  }, [])

  const handleCreateVirtualWorkspace = useCallback(
    (name: string) => {
      workspaceProps?.onAddVirtualWorkspace(name)
      setIsAddWorkspaceDialogOpen(false)
    },
    [workspaceProps]
  )

  const handleCreateLocalWorkspace = useCallback(
    (name: string, handle: FileSystemDirectoryHandle) => {
      workspaceProps?.onAddLocalWorkspace(name, handle)
      setIsAddWorkspaceDialogOpen(false)
    },
    [workspaceProps]
  )

  const handleReconnectWorkspace = useCallback(
    (mountPath: string) => {
      workspaceProps?.onReconnectWorkspace?.(mountPath)
    },
    [workspaceProps]
  )

  return {
    isAddWorkspaceDialogOpen,
    handleAddWorkspaceClick,
    handleAddWorkspaceCancel,
    handleCreateVirtualWorkspace,
    handleCreateLocalWorkspace,
    handleReconnectWorkspace,
  }
}
