import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { IDEContextProvider } from './IDEContext'
import { useIDE } from './useIDE'

// Mock useLuaEngine
const mockExecute = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/useLuaEngine', () => ({
  useLuaEngine: vi.fn((options: { onOutput?: (msg: string) => void; onError?: (msg: string) => void }) => {
    // Store callbacks so tests can trigger them
    ;(mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput = options.onOutput
    ;(mockExecute as unknown as { _onError?: (msg: string) => void })._onError = options.onError
    return {
      isReady: true,
      execute: mockExecute,
      reset: mockReset,
    }
  }),
}))

describe('IDEContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('error handling', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should provide showError function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.showError).toBeInstanceOf(Function)
    })

    it('should provide toasts array', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.toasts).toEqual([])
    })

    it('should show error toast when renaming file to existing name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create two files
      act(() => {
        result.current.createFile('/file1.lua', '')
        result.current.createFile('/file2.lua', '')
      })

      // Act - try to rename file1 to file2's name
      act(() => {
        result.current.renameFile('/file1.lua', 'file2.lua')
      })

      // Assert - should have error toast
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('error')
      expect(result.current.toasts[0].message).toMatch(/already exists/i)
    })

    it('should show error toast when creating file with existing name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a file
      act(() => {
        result.current.createFile('/test.lua', '')
      })

      // Act - try to create another file with same name
      act(() => {
        result.current.createFile('/test.lua', '')
      })

      // Assert - should have error toast
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('error')
      expect(result.current.toasts[0].message).toMatch(/already exists/i)
    })

    it('should provide dismissToast function', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.dismissToast).toBeInstanceOf(Function)
    })

    it('should dismiss toast when dismissToast is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create duplicate file to trigger error
      act(() => {
        result.current.createFile('/test.lua', '')
      })
      act(() => {
        result.current.createFile('/test.lua', '')
      })

      expect(result.current.toasts).toHaveLength(1)
      const toastId = result.current.toasts[0].id

      // Act
      act(() => {
        result.current.dismissToast(toastId)
      })

      // Assert
      expect(result.current.toasts).toHaveLength(0)
    })
  })

  describe('tab state preservation', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should preserve unsaved edits when switching tabs', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create two files
      act(() => {
        result.current.createFile('/file1.lua', 'original1')
        result.current.createFile('/file2.lua', 'original2')
      })

      // Open file1
      act(() => {
        result.current.openFile('/file1.lua')
      })

      // Edit file1 (but don't save)
      act(() => {
        result.current.setCode('modified1')
      })
      expect(result.current.code).toBe('modified1')
      expect(result.current.isDirty).toBe(true)

      // Open file2
      act(() => {
        result.current.openFile('/file2.lua')
      })
      expect(result.current.code).toBe('original2')

      // Act - switch back to file1
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert - edits should be preserved
      expect(result.current.code).toBe('modified1')
      expect(result.current.isDirty).toBe(true)
    })

    it('should preserve dirty indicator across tab switches', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/file1.lua', 'original1')
        result.current.createFile('/file2.lua', 'original2')
      })

      act(() => {
        result.current.openFile('/file1.lua')
      })

      // Make file1 dirty
      act(() => {
        result.current.setCode('modified1')
      })
      expect(result.current.tabs[0].isDirty).toBe(true)

      // Open and switch to file2
      act(() => {
        result.current.openFile('/file2.lua')
      })

      // Act - switch back to file1
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert - dirty indicator should still be true
      expect(result.current.tabs.find(t => t.path === '/file1.lua')?.isDirty).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })

    it('should clear unsaved content from memory when file is saved', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/file1.lua', 'original1')
        result.current.createFile('/file2.lua', 'original2')
      })

      act(() => {
        result.current.openFile('/file1.lua')
      })

      // Edit file1
      act(() => {
        result.current.setCode('saved_content')
      })

      // Save file1
      act(() => {
        result.current.saveFile()
      })

      // Switch to file2
      act(() => {
        result.current.openFile('/file2.lua')
      })

      // Switch back to file1
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert - should show saved content (not from memory map, from filesystem)
      expect(result.current.code).toBe('saved_content')
      expect(result.current.isDirty).toBe(false)
    })

    it('should handle rapid tab switches without losing content', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/a.lua', 'content_a')
        result.current.createFile('/b.lua', 'content_b')
        result.current.createFile('/c.lua', 'content_c')
      })

      act(() => {
        result.current.openFile('/a.lua')
      })

      act(() => {
        result.current.setCode('edited_a')
      })

      act(() => {
        result.current.openFile('/b.lua')
      })

      act(() => {
        result.current.setCode('edited_b')
      })

      act(() => {
        result.current.openFile('/c.lua')
      })

      // Act - rapid switches
      act(() => {
        result.current.selectTab('/a.lua')
      })
      expect(result.current.code).toBe('edited_a')

      act(() => {
        result.current.selectTab('/b.lua')
      })
      expect(result.current.code).toBe('edited_b')

      act(() => {
        result.current.selectTab('/c.lua')
      })

      // Assert
      expect(result.current.code).toBe('content_c')
    })
  })
})
