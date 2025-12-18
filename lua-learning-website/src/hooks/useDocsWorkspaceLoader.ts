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
        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === DOCS_WORKSPACE_ID)) {
          return prev
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, docsWorkspace],
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
