import { useState, useCallback } from 'react'
import type { WorkspaceProps } from './types'

/**
 * Hook encapsulating Add Workspace dialog state and handlers.
 * Extracted from FileExplorer to reduce component line count.
 */
export function useWorkspaceDialogHandlers(workspaceProps?: WorkspaceProps) {
  const [isAddWorkspaceDialogOpen, setIsAddWorkspaceDialogOpen] = useState(false)

  // Stryker disable next-line all: React hooks dependency optimization
  const handleAddWorkspaceClick = useCallback(() => {
    setIsAddWorkspaceDialogOpen(true)
  }, [])

  // Stryker disable next-line all: React hooks dependency optimization
  const handleAddWorkspaceCancel = useCallback(() => {
    setIsAddWorkspaceDialogOpen(false)
  }, [])

  const handleCreateVirtualWorkspace = useCallback(
    (name: string) => {
      workspaceProps?.onAddVirtualWorkspace(name)
      setIsAddWorkspaceDialogOpen(false)
    },
    // Stryker disable next-line all: React hooks dependency optimization
    [workspaceProps]
  )

  const handleCreateLocalWorkspace = useCallback(
    (name: string, handle: FileSystemDirectoryHandle) => {
      workspaceProps?.onAddLocalWorkspace(name, handle)
      setIsAddWorkspaceDialogOpen(false)
    },
    // Stryker disable next-line all: React hooks dependency optimization
    [workspaceProps]
  )

  const handleReconnectWorkspace = useCallback(
    (mountPath: string) => {
      workspaceProps?.onReconnectWorkspace?.(mountPath)
    },
    // Stryker disable next-line all: React hooks dependency optimization
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
