/**
 * Hook to asynchronously load the examples workspace.
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import { useEffect } from 'react'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'
import { EXAMPLES_WORKSPACE_ID, fetchAndCreateExamplesWorkspace } from './workspaceManagerHelpers'

/**
 * Hook that fetches and adds the examples workspace on mount.
 * @param setState - State setter from useWorkspaceManager
 */
export function useExamplesWorkspaceLoader(
  setState: React.Dispatch<React.SetStateAction<WorkspaceManagerState>>
): void {
  useEffect(() => {
    let cancelled = false

    fetchAndCreateExamplesWorkspace().then((examplesWorkspace: Workspace | null) => {
      if (cancelled || !examplesWorkspace) return

      setState((prev) => {
        // Don't add if already exists
        if (prev.workspaces.some((w) => w.id === EXAMPLES_WORKSPACE_ID)) {
          return prev
        }
        return {
          ...prev,
          workspaces: [...prev.workspaces, examplesWorkspace],
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [setState])
}
