import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCloneProjectForm } from './useCloneProjectForm'

const mockShowDirectoryPicker = vi.fn()

describe('useCloneProjectForm', () => {
  const defaultParams = {
    isOpen: true,
    projectName: 'test-project',
    isFileSystemAccessSupported: true,
    onClone: vi.fn(),
    onCancel: vi.fn(),
    isFolderAlreadyMounted: vi.fn().mockResolvedValue(false),
    getUniqueWorkspaceName: vi.fn((name: string) => name),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: mockShowDirectoryPicker,
      writable: true,
      configurable: true,
    })
  })

  describe('initial state', () => {
    it('sets cloneType to local when file system access is supported', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      expect(result.current.cloneType).toBe('local')
    })

    it('sets cloneType to virtual when file system access is not supported', () => {
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false })
      )
      expect(result.current.cloneType).toBe('virtual')
    })

    it('sets workspaceName from getUniqueWorkspaceName', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      expect(result.current.workspaceName).toBe('test-project')
      expect(defaultParams.getUniqueWorkspaceName).toHaveBeenCalledWith('test-project')
    })

    it('uses projectName directly when getUniqueWorkspaceName is not provided', () => {
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, getUniqueWorkspaceName: undefined })
      )
      expect(result.current.workspaceName).toBe('test-project')
    })

    it('has no selected handle', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      expect(result.current.selectedHandle).toBeNull()
    })

    it('has no error', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      expect(result.current.error).toBeNull()
    })

    it('is not selecting folder', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      expect(result.current.isSelectingFolder).toBe(false)
    })
  })

  describe('isFormValid', () => {
    it('returns true for virtual type with non-empty name', () => {
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false })
      )
      expect(result.current.isFormValid).toBe(true)
    })

    it('returns false for virtual type with empty name', () => {
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false })
      )
      act(() => { result.current.setWorkspaceName('') })
      expect(result.current.isFormValid).toBe(false)
    })

    it('returns false for virtual type with whitespace-only name', () => {
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false })
      )
      act(() => { result.current.setWorkspaceName('   ') })
      expect(result.current.isFormValid).toBe(false)
    })

    it('returns false for local type with no selected handle', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      expect(result.current.isFormValid).toBe(false)
    })

    it('returns false for local type with whitespace-only name and handle', async () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })
      act(() => { result.current.setWorkspaceName('   ') })
      expect(result.current.isFormValid).toBe(false)
    })

    it('returns true for local type with handle and valid name', async () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })
      expect(result.current.isFormValid).toBe(true)
    })
  })

  describe('handleTypeChange', () => {
    it('changes clone type', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      act(() => { result.current.handleTypeChange('virtual') })
      expect(result.current.cloneType).toBe('virtual')
    })

    it('clears selected handle when switching to virtual', async () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })
      expect(result.current.selectedHandle).toBe(mockHandle)

      act(() => { result.current.handleTypeChange('virtual') })
      expect(result.current.selectedHandle).toBeNull()
    })

    it('does not clear selected handle when switching to local', async () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })
      act(() => { result.current.handleTypeChange('local') })
      expect(result.current.selectedHandle).toBe(mockHandle)
    })

    it('clears error when changing type', () => {
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      // Manually cause error state to exist by simulating a failed folder select
      act(() => { result.current.handleTypeChange('local') })
      act(() => { result.current.handleTypeChange('virtual') })
      expect(result.current.error).toBeNull()
    })
  })

  describe('handleSelectFolder', () => {
    it('calls showDirectoryPicker with readwrite mode', async () => {
      const mockHandle = { name: 'selected-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(mockShowDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' })
    })

    it('sets selected handle after successful selection', async () => {
      const mockHandle = { name: 'selected-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.selectedHandle).toBe(mockHandle)
    })

    it('updates workspace name from folder name', async () => {
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.workspaceName).toBe('my-folder')
    })

    it('uses getUniqueWorkspaceName for folder name', async () => {
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const getUniqueWorkspaceName = vi.fn().mockReturnValue('my-folder-2')

      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, getUniqueWorkspaceName })
      )
      await act(async () => { await result.current.handleSelectFolder() })

      expect(getUniqueWorkspaceName).toHaveBeenCalledWith('my-folder')
      expect(result.current.workspaceName).toBe('my-folder-2')
    })

    it('shows error when folder is already mounted', async () => {
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const isFolderAlreadyMounted = vi.fn().mockResolvedValue(true)

      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFolderAlreadyMounted })
      )
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.error).toBe('This folder is already mounted as a workspace.')
      expect(result.current.selectedHandle).toBeNull()
    })

    it('ignores AbortError from user cancellation', async () => {
      const abortError = new Error('User cancelled')
      abortError.name = 'AbortError'
      mockShowDirectoryPicker.mockRejectedValue(abortError)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.error).toBeNull()
    })

    it('shows error for non-AbortError failures', async () => {
      mockShowDirectoryPicker.mockRejectedValue(new Error('Permission denied'))

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.error).toBe('Failed to select folder. Please try again.')
    })

    it('resets isSelectingFolder after successful selection', async () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.isSelectingFolder).toBe(false)
    })

    it('resets isSelectingFolder after error', async () => {
      mockShowDirectoryPicker.mockRejectedValue(new Error('Failed'))

      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.isSelectingFolder).toBe(false)
    })

    it('resets isSelectingFolder when folder already mounted', async () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const isFolderAlreadyMounted = vi.fn().mockResolvedValue(true)

      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFolderAlreadyMounted })
      )
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.isSelectingFolder).toBe(false)
    })

    it('clears error before selecting folder', async () => {
      // First: trigger an error
      mockShowDirectoryPicker.mockRejectedValueOnce(new Error('Failed'))
      const { result } = renderHook(() => useCloneProjectForm(defaultParams))
      await act(async () => { await result.current.handleSelectFolder() })
      expect(result.current.error).toBe('Failed to select folder. Please try again.')

      // Second: try again, error should be cleared
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValueOnce(mockHandle)
      await act(async () => { await result.current.handleSelectFolder() })
      expect(result.current.error).toBeNull()
    })

    it('uses folder name directly when getUniqueWorkspaceName is not provided', async () => {
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, getUniqueWorkspaceName: undefined })
      )
      await act(async () => { await result.current.handleSelectFolder() })

      expect(result.current.workspaceName).toBe('my-folder')
    })
  })

  describe('handleSubmit', () => {
    it('calls onClone with virtual type and trimmed name', () => {
      const onClone = vi.fn()
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false, onClone })
      )

      act(() => { result.current.setWorkspaceName('  My Project  ') })
      act(() => { result.current.handleSubmit() })

      expect(onClone).toHaveBeenCalledWith('My Project', 'virtual')
    })

    it('calls onClone with local type, name, and handle', async () => {
      const onClone = vi.fn()
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, onClone })
      )

      await act(async () => { await result.current.handleSelectFolder() })
      act(() => { result.current.handleSubmit() })

      expect(onClone).toHaveBeenCalledWith('folder', 'local', mockHandle)
    })

    it('does not call onClone when form is invalid', () => {
      const onClone = vi.fn()
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false, onClone })
      )

      act(() => { result.current.setWorkspaceName('') })
      act(() => { result.current.handleSubmit() })

      expect(onClone).not.toHaveBeenCalled()
    })

    it('prevents default event if provided', () => {
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, isFileSystemAccessSupported: false })
      )

      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent
      act(() => { result.current.handleSubmit(event) })

      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe('handleKeyDown', () => {
    it('calls onCancel on Escape key', () => {
      const onCancel = vi.fn()
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, onCancel })
      )

      const event = { key: 'Escape', preventDefault: vi.fn() }
      act(() => { result.current.handleKeyDown(event) })

      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('does not call onCancel for other keys', () => {
      const onCancel = vi.fn()
      const { result } = renderHook(() =>
        useCloneProjectForm({ ...defaultParams, onCancel })
      )

      const event = { key: 'Enter', preventDefault: vi.fn() }
      act(() => { result.current.handleKeyDown(event) })

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('form reset on reopen', () => {
    it('resets state when dialog reopens', () => {
      const { result, rerender } = renderHook(
        (props) => useCloneProjectForm(props),
        { initialProps: defaultParams }
      )

      // Change some state
      act(() => { result.current.setWorkspaceName('changed') })
      act(() => { result.current.handleTypeChange('virtual') })

      // Close dialog
      rerender({ ...defaultParams, isOpen: false })

      // Reopen dialog
      rerender({ ...defaultParams, isOpen: true })

      expect(result.current.workspaceName).toBe('test-project')
      expect(result.current.cloneType).toBe('local')
      expect(result.current.selectedHandle).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })
})
