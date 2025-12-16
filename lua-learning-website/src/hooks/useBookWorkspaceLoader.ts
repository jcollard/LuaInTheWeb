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
        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === BOOK_WORKSPACE_ID)) {
          return prev
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, bookWorkspace],
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
