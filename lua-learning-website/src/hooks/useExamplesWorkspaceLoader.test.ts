import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useExamplesWorkspaceLoader } from './useExamplesWorkspaceLoader'
import * as workspaceManagerHelpers from './workspaceManagerHelpers'
import type { Workspace, WorkspaceManagerState } from './workspaceTypes'

describe('useExamplesWorkspaceLoader', () => {
  const mockSetState = vi.fn()
  const mockExamplesWorkspace: Workspace = {
    id: 'examples',
    name: 'examples',
    type: 'examples',
    mountPath: '/examples',
    filesystem: {} as Workspace['filesystem'],
    status: 'connected',
    isReadOnly: true,
  }

  beforeEach(() => {
    vi.spyOn(workspaceManagerHelpers, 'fetchAndCreateExamplesWorkspace')
    mockSetState.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call fetchAndCreateExamplesWorkspace on mount', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateExamplesWorkspace).mockResolvedValueOnce(
      mockExamplesWorkspace
    )

    renderHook(() => useExamplesWorkspaceLoader(mockSetState))

    await waitFor(() => {
      expect(workspaceManagerHelpers.fetchAndCreateExamplesWorkspace).toHaveBeenCalledTimes(1)
    })
  })

  it('should add examples workspace to state when fetch succeeds', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateExamplesWorkspace).mockResolvedValueOnce(
      mockExamplesWorkspace
    )

    renderHook(() => useExamplesWorkspaceLoader(mockSetState))

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalled()
    })

    // Get the updater function that was passed to setState
    const updater = mockSetState.mock.calls[0][0]
    const prevState: WorkspaceManagerState = { workspaces: [], pendingWorkspaces: new Set(['examples']) }
    const newState = updater(prevState)

    expect(newState.workspaces).toContain(mockExamplesWorkspace)
  })

  it('should not add workspace if fetch returns null', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateExamplesWorkspace).mockResolvedValueOnce(null)

    renderHook(() => useExamplesWorkspaceLoader(mockSetState))

    // Wait for the async operation to complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockSetState).not.toHaveBeenCalled()
  })

  it('should not add duplicate workspace if already exists', async () => {
    vi.mocked(workspaceManagerHelpers.fetchAndCreateExamplesWorkspace).mockResolvedValueOnce(
      mockExamplesWorkspace
    )

    renderHook(() => useExamplesWorkspaceLoader(mockSetState))

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalled()
    })

    // Get the updater function and test with state that already has examples
    const updater = mockSetState.mock.calls[0][0]
    const prevState: WorkspaceManagerState = {
      workspaces: [mockExamplesWorkspace],
      pendingWorkspaces: new Set(['examples']),
    }
    const newState = updater(prevState)

    // Should have same workspaces but clear pending state
    expect(newState.workspaces).toBe(prevState.workspaces)
    expect(newState.pendingWorkspaces.has('examples')).toBe(false)
  })

  it('should not update state if component unmounts before fetch completes', async () => {
    let resolvePromise: (value: Workspace | null) => void = () => {}
    vi.mocked(workspaceManagerHelpers.fetchAndCreateExamplesWorkspace).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    const { unmount } = renderHook(() => useExamplesWorkspaceLoader(mockSetState))

    // Unmount before resolving
    unmount()

    // Now resolve the promise
    resolvePromise(mockExamplesWorkspace)

    // Wait a bit for any async operations
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockSetState).not.toHaveBeenCalled()
  })
})
