/**
 * Hook to asynchronously load the projects workspace.
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import { useEffect } from 'react'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'
import { PROJECTS_WORKSPACE_ID, fetchAndCreateProjectsWorkspace } from './workspaceManagerHelpers'

/**
 * Hook that fetches and adds the projects workspace on mount.
 * @param setState - State setter from useWorkspaceManager
 */
export function useProjectsWorkspaceLoader(
  setState: React.Dispatch<React.SetStateAction<WorkspaceManagerState>>
): void {
  useEffect(() => {
    let cancelled = false

    fetchAndCreateProjectsWorkspace().then((projectsWorkspace: Workspace | null) => {
      if (cancelled || !projectsWorkspace) return

      setState((prev) => {
        // Remove from pending regardless of whether we add it
        const newPendingWorkspaces = new Set(prev.pendingWorkspaces)
        newPendingWorkspaces.delete(PROJECTS_WORKSPACE_ID)

        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === PROJECTS_WORKSPACE_ID)) {
          return { ...prev, pendingWorkspaces: newPendingWorkspaces }
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, projectsWorkspace],
          pendingWorkspaces: newPendingWorkspaces,
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
