import { useEffect } from 'react'

/**
 * Hook that calls a refresh callback when the browser window gains focus.
 * Used to pick up external filesystem changes made outside the browser.
 */
export function useWindowFocusRefresh(
  refreshWorkspaces: () => Promise<void>,
  refreshFileTree: () => void
): void {
  useEffect(() => {
    const handleFocus = async () => {
      await refreshWorkspaces()
      refreshFileTree()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshWorkspaces, refreshFileTree])
}
