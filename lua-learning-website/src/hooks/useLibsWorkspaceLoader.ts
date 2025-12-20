/**
 * Hook to asynchronously load the libs workspace.
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import { useEffect } from 'react'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'
import { LIBRARY_WORKSPACE_ID, fetchAndCreateLibsWorkspace } from './workspaceManagerHelpers'

/**
 * Hook that fetches and adds the libs workspace on mount.
 * @param setState - State setter from useWorkspaceManager
 */
export function useLibsWorkspaceLoader(
  setState: React.Dispatch<React.SetStateAction<WorkspaceManagerState>>
): void {
  useEffect(() => {
    let cancelled = false

    fetchAndCreateLibsWorkspace().then((libsWorkspace: Workspace | null) => {
      if (cancelled || !libsWorkspace) return

      setState((prev) => {
        // Remove from pending regardless of whether we add it
        const newPendingWorkspaces = new Set(prev.pendingWorkspaces)
        newPendingWorkspaces.delete(LIBRARY_WORKSPACE_ID)

        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === LIBRARY_WORKSPACE_ID)) {
          return { ...prev, pendingWorkspaces: newPendingWorkspaces }
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, libsWorkspace],
          pendingWorkspaces: newPendingWorkspaces,
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
