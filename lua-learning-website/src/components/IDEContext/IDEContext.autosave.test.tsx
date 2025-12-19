import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { IDEContextProvider } from './IDEContext'
import { useIDE } from './useIDE'

// Mock useLuaEngine
const mockExecute = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/useLuaEngine', () => ({
  useLuaEngine: vi.fn(() => ({
    isReady: true,
    execute: mockExecute,
    reset: mockReset,
  })),
}))

describe('IDEContext - Auto-save and Save All', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('autoSaveEnabled', () => {
    it('should default to false', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.autoSaveEnabled).toBe(false)
    })

    it('should toggle auto-save state', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })
      expect(result.current.autoSaveEnabled).toBe(false)

      // Act
      act(() => {
        result.current.toggleAutoSave()
      })

      // Assert
      expect(result.current.autoSaveEnabled).toBe(true)
    })

    it('should persist auto-save state to localStorage', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.toggleAutoSave()
      })

      // Assert
      expect(localStorage.getItem('ide-auto-save-enabled')).toBe('true')
    })
  })

  describe('saveAllFiles', () => {
    it('should be a function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.saveAllFiles).toBeInstanceOf(Function)
    })

    it('should do nothing when no tabs are open', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act - should not throw
      act(() => {
        result.current.saveAllFiles()
      })

      // Assert - just verify no error
      expect(result.current.tabs).toHaveLength(0)
    })

    it('should save all dirty tabs', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create files and make them dirty
      act(() => {
        result.current.createFile('/test1.lua', 'content1')
        result.current.createFile('/test2.lua', 'content2')
      })

      // Open both files
      act(() => {
        result.current.openFile('/test1.lua')
      })
      act(() => {
        result.current.setCode('modified content 1')
      })
      act(() => {
        result.current.openFile('/test2.lua')
      })
      act(() => {
        result.current.setCode('modified content 2')
      })

      // Verify files are dirty
      expect(result.current.tabs.some(t => t.isDirty)).toBe(true)

      // Act - save all files
      act(() => {
        result.current.saveAllFiles()
      })

      // Assert - all tabs should be clean now
      expect(result.current.tabs.every(t => !t.isDirty)).toBe(true)
    })

    it('should not affect clean tabs', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create and open a file but don't modify it
      act(() => {
        result.current.createFile('/clean.lua', 'original content')
      })
      act(() => {
        result.current.openFile('/clean.lua')
      })

      // Verify file is not dirty
      expect(result.current.isDirty).toBe(false)

      // Act - save all files
      act(() => {
        result.current.saveAllFiles()
      })

      // Assert - file content should be unchanged
      const content = result.current.fileSystem.readFile('/clean.lua')
      expect(content).toBe('original content')
    })
  })

  describe('auto-save integration', () => {
    it('should trigger save after debounce when enabled and content changes', () => {
      // Arrange
      localStorage.setItem('ide-auto-save-enabled', 'true')
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create and open a file
      act(() => {
        result.current.createFile('/autosave-test.lua', 'original')
      })
      act(() => {
        result.current.openFile('/autosave-test.lua')
      })

      // Make it dirty
      act(() => {
        result.current.setCode('modified content')
      })
      expect(result.current.isDirty).toBe(true)

      // Advance timers past the auto-save delay (1500ms default)
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Assert - file should be saved (dirty = false)
      expect(result.current.isDirty).toBe(false)
    })

    it('should NOT auto-save when disabled', () => {
      // Arrange - auto-save is disabled by default
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create and open a file
      act(() => {
        result.current.createFile('/no-autosave.lua', 'original')
      })
      act(() => {
        result.current.openFile('/no-autosave.lua')
      })

      // Make it dirty
      act(() => {
        result.current.setCode('modified content')
      })
      expect(result.current.isDirty).toBe(true)

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Assert - file should still be dirty
      expect(result.current.isDirty).toBe(true)
    })
  })
})
