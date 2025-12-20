/**
 * Hook to asynchronously load the docs workspace.
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import { useEffect } from 'react'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'
import { DOCS_WORKSPACE_ID, fetchAndCreateDocsWorkspace } from './workspaceManagerHelpers'

/**
 * Hook that fetches and adds the docs workspace on mount.
 * @param setState - State setter from useWorkspaceManager
 */
export function useDocsWorkspaceLoader(
  setState: React.Dispatch<React.SetStateAction<WorkspaceManagerState>>
): void {
  useEffect(() => {
    let cancelled = false

    fetchAndCreateDocsWorkspace().then((docsWorkspace: Workspace | null) => {
      if (cancelled || !docsWorkspace) return

      setState((prev) => {
        // Remove from pending regardless of whether we add it
        const newPendingWorkspaces = new Set(prev.pendingWorkspaces)
        newPendingWorkspaces.delete(DOCS_WORKSPACE_ID)

        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === DOCS_WORKSPACE_ID)) {
          return { ...prev, pendingWorkspaces: newPendingWorkspaces }
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, docsWorkspace],
          pendingWorkspaces: newPendingWorkspaces,
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
