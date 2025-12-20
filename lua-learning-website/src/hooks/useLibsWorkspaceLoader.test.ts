import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLibsWorkspaceLoader } from './useLibsWorkspaceLoader'
import * as workspaceManagerHelpers from './workspaceManagerHelpers'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'

describe('useLibsWorkspaceLoader', () => {
  const mockSetState = vi.fn()
  const mockLibsWorkspace: Workspace = {
    id: 'libs',
    name: 'libs',
    type: 'library',
    mountPath: '/libs',
    filesystem: {} as Workspace['filesystem'],
    status: 'connected',
    isReadOnly: true,
  }

  beforeEach(() => {
    vi.spyOn(workspaceManagerHelpers, 'fetchAndCreateLibsWorkspace')
    mockSetState.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call fetchAndCreateLibsWorkspace on mount', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateLibsWorkspace).mockResolvedValueOnce(
      mockLibsWorkspace
    )

    renderHook(() => useLibsWorkspaceLoader(mockSetState))

    await waitFor(() => {
      expect(workspaceManagerHelpers.fetchAndCreateLibsWorkspace).toHaveBeenCalledTimes(1)
    })
  })

  it('should add libs workspace to state when fetch succeeds', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateLibsWorkspace).mockResolvedValueOnce(
      mockLibsWorkspace
    )

    renderHook(() => useLibsWorkspaceLoader(mockSetState))

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalled()
    })

    // Get the updater function that was passed to setState
    const updater = mockSetState.mock.calls[0][0]
    const prevState: WorkspaceManagerState = { workspaces: [], pendingWorkspaces: new Set(['libs']) }
    const newState = updater(prevState)

    expect(newState.workspaces).toContain(mockLibsWorkspace)
  })

  it('should not add workspace if fetch returns null', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateLibsWorkspace).mockResolvedValueOnce(null)

    renderHook(() => useLibsWorkspaceLoader(mockSetState))

    // Wait for the async operation to complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockSetState).not.toHaveBeenCalled()
  })

  it('should not add duplicate workspace if already exists', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateLibsWorkspace).mockResolvedValueOnce(
      mockLibsWorkspace
    )

    renderHook(() => useLibsWorkspaceLoader(mockSetState))

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalled()
    })

    // Get the updater function and test with state that already has libs
    const updater = mockSetState.mock.calls[0][0]
    const prevState: WorkspaceManagerState = {
      workspaces: [mockLibsWorkspace],
      pendingWorkspaces: new Set(['libs']),
    }
    const newState = updater(prevState)

    // Should have same workspaces but clear pending state
    expect(newState.workspaces).toBe(prevState.workspaces)
    expect(newState.pendingWorkspaces.has('libs')).toBe(false)
  })

  it('should not update state if component unmounts before fetch completes', async () => {
    let resolvePromise: (value: Workspace | null) => void = () => {}
    vi.mocked(workspaceManagerHelpers.fetchAndCreateLibsWorkspace).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    const { unmount } = renderHook(() => useLibsWorkspaceLoader(mockSetState))

    // Unmount before resolving
    unmount()

    // Now resolve the promise
    resolvePromise(mockLibsWorkspace)

    // Wait a bit for any async operations
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockSetState).not.toHaveBeenCalled()
  })
})
