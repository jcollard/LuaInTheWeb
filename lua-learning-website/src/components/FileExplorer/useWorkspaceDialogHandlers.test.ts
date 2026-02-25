import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceDialogHandlers } from './useWorkspaceDialogHandlers'
import type { WorkspaceProps } from './types'

describe('useWorkspaceDialogHandlers', () => {
  let mockWorkspaceProps: WorkspaceProps

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkspaceProps = {
      workspaces: [],
      pendingWorkspaces: new Set<string>(),
      isFileSystemAccessSupported: true,
      onAddVirtualWorkspace: vi.fn(),
      onAddLocalWorkspace: vi.fn().mockResolvedValue(undefined),
      onRemoveWorkspace: vi.fn(),
      onRefreshWorkspace: vi.fn().mockResolvedValue(undefined),
      supportsRefresh: vi.fn().mockReturnValue(false),
      onReconnectWorkspace: vi.fn().mockResolvedValue(undefined),
      onDisconnectWorkspace: vi.fn(),
      onRenameWorkspace: vi.fn(),
      isFolderAlreadyMounted: vi.fn().mockResolvedValue(false),
      getUniqueWorkspaceName: vi.fn((name: string) => name),
    }
  })

  describe('dialog open/close state', () => {
    it('starts with dialog closed', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))
      expect(result.current.isAddWorkspaceDialogOpen).toBe(false)
    })

    it('opens dialog on handleAddWorkspaceClick', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleAddWorkspaceClick() })

      expect(result.current.isAddWorkspaceDialogOpen).toBe(true)
    })

    it('closes dialog on handleAddWorkspaceCancel', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleAddWorkspaceClick() })
      act(() => { result.current.handleAddWorkspaceCancel() })

      expect(result.current.isAddWorkspaceDialogOpen).toBe(false)
    })
  })

  describe('handleCreateVirtualWorkspace', () => {
    it('calls onAddVirtualWorkspace with name', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleCreateVirtualWorkspace('my-workspace') })

      expect(mockWorkspaceProps.onAddVirtualWorkspace).toHaveBeenCalledWith('my-workspace')
    })

    it('closes dialog after creating workspace', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleAddWorkspaceClick() })
      act(() => { result.current.handleCreateVirtualWorkspace('my-workspace') })

      expect(result.current.isAddWorkspaceDialogOpen).toBe(false)
    })

    it('handles undefined workspaceProps gracefully', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(undefined))

      act(() => { result.current.handleCreateVirtualWorkspace('my-workspace') })

      expect(result.current.isAddWorkspaceDialogOpen).toBe(false)
    })
  })

  describe('handleCreateLocalWorkspace', () => {
    it('calls onAddLocalWorkspace with name and handle', () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleCreateLocalWorkspace('my-local', mockHandle) })

      expect(mockWorkspaceProps.onAddLocalWorkspace).toHaveBeenCalledWith('my-local', mockHandle)
    })

    it('closes dialog after creating workspace', () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleAddWorkspaceClick() })
      act(() => { result.current.handleCreateLocalWorkspace('my-local', mockHandle) })

      expect(result.current.isAddWorkspaceDialogOpen).toBe(false)
    })
  })

  describe('handleReconnectWorkspace', () => {
    it('calls onReconnectWorkspace with mount path', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(mockWorkspaceProps))

      act(() => { result.current.handleReconnectWorkspace('/my-workspace') })

      expect(mockWorkspaceProps.onReconnectWorkspace).toHaveBeenCalledWith('/my-workspace')
    })

    it('handles undefined workspaceProps gracefully', () => {
      const { result } = renderHook(() => useWorkspaceDialogHandlers(undefined))

      expect(() => {
        act(() => { result.current.handleReconnectWorkspace('/my-workspace') })
      }).not.toThrow()
    })
  })
})
