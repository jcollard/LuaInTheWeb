/**
 * Hook to asynchronously load the demos workspace.
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import { useEffect } from 'react'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'
import { DEMOS_WORKSPACE_ID, fetchAndCreateDemosWorkspace } from './workspaceManagerHelpers'

/**
 * Hook that fetches and adds the demos workspace on mount.
 * @param setState - State setter from useWorkspaceManager
 */
export function useDemosWorkspaceLoader(
  setState: React.Dispatch<React.SetStateAction<WorkspaceManagerState>>
): void {
  useEffect(() => {
    let cancelled = false

    fetchAndCreateDemosWorkspace().then((demosWorkspace: Workspace | null) => {
      if (cancelled || !demosWorkspace) return

      setState((prev) => {
        // Remove from pending regardless of whether we add it
        const newPendingWorkspaces = new Set(prev.pendingWorkspaces)
        newPendingWorkspaces.delete(DEMOS_WORKSPACE_ID)

        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === DEMOS_WORKSPACE_ID)) {
          return { ...prev, pendingWorkspaces: newPendingWorkspaces }
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, demosWorkspace],
          pendingWorkspaces: newPendingWorkspaces,
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
