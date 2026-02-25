import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCloneDialog } from './useCloneDialog'

describe('useCloneDialog', () => {
  let onCloneProject: (
    projectPath: string,
    workspaceName: string,
    type: 'virtual' | 'local',
    handle?: FileSystemDirectoryHandle
  ) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onCloneProject = vi.fn()
  })

  describe('initial state', () => {
    it('starts with dialog closed', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))
      expect(result.current.cloneDialogState.isOpen).toBe(false)
    })

    it('starts with empty project path', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))
      expect(result.current.cloneDialogState.projectPath).toBe('')
    })

    it('starts with empty project name', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))
      expect(result.current.cloneDialogState.projectName).toBe('')
    })
  })

  describe('openCloneDialog', () => {
    it('opens the dialog', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })

      expect(result.current.cloneDialogState.isOpen).toBe(true)
    })

    it('sets the project path', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })

      expect(result.current.cloneDialogState.projectPath).toBe('/projects/myapp')
    })

    it('extracts project name from path', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })

      expect(result.current.cloneDialogState.projectName).toBe('myapp')
    })

    it('uses full path as name when no slash found', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('myapp') })

      expect(result.current.cloneDialogState.projectName).toBe('myapp')
    })
  })

  describe('handleCloneDialogCancel', () => {
    it('closes the dialog', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })
      act(() => { result.current.handleCloneDialogCancel() })

      expect(result.current.cloneDialogState.isOpen).toBe(false)
    })

    it('resets project path', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })
      act(() => { result.current.handleCloneDialogCancel() })

      expect(result.current.cloneDialogState.projectPath).toBe('')
    })
  })

  describe('handleCloneProject', () => {
    it('delegates to onCloneProject with project path', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })
      act(() => { result.current.handleCloneProject('myapp', 'virtual') })

      expect(onCloneProject).toHaveBeenCalledWith('/projects/myapp', 'myapp', 'virtual', undefined)
    })

    it('passes handle for local workspace', () => {
      const mockHandle = { name: 'folder' } as FileSystemDirectoryHandle
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })
      act(() => { result.current.handleCloneProject('myapp', 'local', mockHandle) })

      expect(onCloneProject).toHaveBeenCalledWith('/projects/myapp', 'myapp', 'local', mockHandle)
    })

    it('closes dialog after cloning', () => {
      const { result } = renderHook(() => useCloneDialog(onCloneProject))

      act(() => { result.current.openCloneDialog('/projects/myapp') })
      act(() => { result.current.handleCloneProject('myapp', 'virtual') })

      expect(result.current.cloneDialogState.isOpen).toBe(false)
    })

    it('handles undefined onCloneProject gracefully', () => {
      const { result } = renderHook(() => useCloneDialog(undefined))

      act(() => { result.current.openCloneDialog('/projects/myapp') })
      act(() => { result.current.handleCloneProject('myapp', 'virtual') })

      expect(result.current.cloneDialogState.isOpen).toBe(false)
    })
  })
})
