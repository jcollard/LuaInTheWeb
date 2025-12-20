/**
 * Hook to asynchronously load the book workspace.
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import { useEffect } from 'react'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'
import { BOOK_WORKSPACE_ID, fetchAndCreateBookWorkspace } from './workspaceManagerHelpers'

/**
 * Hook that fetches and adds the book workspace on mount.
 * @param setState - State setter from useWorkspaceManager
 */
export function useBookWorkspaceLoader(
  setState: React.Dispatch<React.SetStateAction<WorkspaceManagerState>>
): void {
  useEffect(() => {
    let cancelled = false

    fetchAndCreateBookWorkspace().then((bookWorkspace: Workspace | null) => {
      if (cancelled || !bookWorkspace) return

      setState((prev) => {
        // Remove from pending regardless of whether we add it
        const newPendingWorkspaces = new Set(prev.pendingWorkspaces)
        newPendingWorkspaces.delete(BOOK_WORKSPACE_ID)

        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === BOOK_WORKSPACE_ID)) {
          return { ...prev, pendingWorkspaces: newPendingWorkspaces }
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, bookWorkspace],
          pendingWorkspaces: newPendingWorkspaces,
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
