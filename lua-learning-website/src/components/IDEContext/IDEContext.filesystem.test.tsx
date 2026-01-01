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

  describe('filesystem integration', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
    })

    it('should provide fileTree from filesystem', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.fileTree).toBeDefined()
      expect(Array.isArray(result.current.fileTree)).toBe(true)
    })

    it('should provide openFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.openFile).toBeInstanceOf(Function)
    })

    it('should load file content when openFile is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a file first
      act(() => {
        result.current.createFile('/test.lua', 'print("hello")')
      })

      // Act - open the file
      act(() => {
        result.current.openFile('/test.lua')
      })

      // Assert
      expect(result.current.code).toBe('print("hello")')
      expect(result.current.fileName).toBe('test.lua')
    })

    it('should open tab when file is opened', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create and open file
      act(() => {
        result.current.createFile('/main.lua', 'local x = 1')
      })

      act(() => {
        result.current.openFile('/main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/main.lua')
      expect(result.current.tabs[0].name).toBe('main.lua')
      expect(result.current.activeTab).toBe('/main.lua')
    })

    it('should switch content when selecting different tab', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create two files
      act(() => {
        result.current.createFile('/file1.lua', 'content1')
        result.current.createFile('/file2.lua', 'content2')
      })

      // Open both files
      act(() => {
        result.current.openFile('/file1.lua')
      })
      act(() => {
        result.current.openFile('/file2.lua')
      })

      expect(result.current.code).toBe('content2')

      // Act - select first tab
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert
      expect(result.current.code).toBe('content1')
      expect(result.current.activeTab).toBe('/file1.lua')
    })

    it('should track dirty state per file', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'original')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      // Initially not dirty
      expect(result.current.isDirty).toBe(false)
      expect(result.current.tabs[0].isDirty).toBe(false)

      // Act - modify content
      act(() => {
        result.current.setCode('modified')
      })

      // Assert
      expect(result.current.isDirty).toBe(true)
      expect(result.current.tabs[0].isDirty).toBe(true)
    })

    it('should save file and clear dirty state', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'original')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      act(() => {
        result.current.setCode('modified')
      })

      expect(result.current.isDirty).toBe(true)

      // Act - save file
      act(() => {
        result.current.saveFile()
      })

      // Assert
      expect(result.current.isDirty).toBe(false)
      expect(result.current.tabs[0].isDirty).toBe(false)
    })

    it('should close tab when closeTab is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'content')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      expect(result.current.tabs).toHaveLength(1)

      // Act
      act(() => {
        result.current.closeTab('/test.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.activeTab).toBeNull()
    })

    it('should provide createFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFile).toBeInstanceOf(Function)
    })

    it('should add file to tree when createFile is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFile('/new.lua', '')
      })

      // Assert
      expect(result.current.fileTree).toContainEqual(
        expect.objectContaining({ path: '/new.lua', name: 'new.lua', type: 'file' })
      )
    })

    it('should provide createFolder function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFolder).toBeInstanceOf(Function)
    })

    it('should provide deleteFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.deleteFile).toBeInstanceOf(Function)
    })

    it('should close tab when file is deleted', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'content')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      expect(result.current.tabs).toHaveLength(1)

      // Act
      act(() => {
        result.current.deleteFile('/test.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.fileTree).not.toContainEqual(
        expect.objectContaining({ path: '/test.lua' })
      )
    })

    it('should provide renameFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.renameFile).toBeInstanceOf(Function)
    })

    it('should update tab path when file is renamed', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/old.lua', 'content')
      })

      act(() => {
        result.current.openFile('/old.lua')
      })

      // Act
      act(() => {
        result.current.renameFile('/old.lua', 'new.lua')
      })

      // Assert
      expect(result.current.tabs[0].path).toBe('/new.lua')
      expect(result.current.tabs[0].name).toBe('new.lua')
      expect(result.current.activeTab).toBe('/new.lua')
    })

    it('should update tab path when file is moved via moveFile', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create folder and file
      act(() => {
        result.current.createFolder('/dest')
        result.current.createFile('/test.lua', 'content')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/test.lua')
      expect(result.current.activeTab).toBe('/test.lua')

      // Act - move file via moveFile (drag-and-drop)
      act(() => {
        result.current.moveFile('/test.lua', '/dest')
      })

      // Assert - tab should be updated to new path
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/dest/test.lua')
      expect(result.current.tabs[0].name).toBe('test.lua')
      expect(result.current.activeTab).toBe('/dest/test.lua')
    })

    it('should update tabs for all files when folder is moved via moveFile', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create folders and files
      act(() => {
        result.current.createFolder('/src')
        result.current.createFolder('/dest')
        result.current.createFile('/src/a.lua', 'content-a')
        result.current.createFile('/src/b.lua', 'content-b')
      })

      // Open both files
      act(() => {
        result.current.openFile('/src/a.lua')
      })
      act(() => {
        result.current.openFile('/src/b.lua')
      })

      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.tabs.map(t => t.path)).toContain('/src/a.lua')
      expect(result.current.tabs.map(t => t.path)).toContain('/src/b.lua')

      // Act - move folder via moveFile (drag-and-drop)
      act(() => {
        result.current.moveFile('/src', '/dest')
      })

      // Assert - all tabs should be updated to new paths
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.tabs.map(t => t.path)).toContain('/dest/src/a.lua')
      expect(result.current.tabs.map(t => t.path)).toContain('/dest/src/b.lua')
    })

    it('should show error toast and not save when file is read-only', () => {
      // Arrange - provide a mock isPathReadOnly function that marks /readonly-test.lua as read-only
      const isPathReadOnly = vi.fn((path: string) => path === '/readonly-test.lua')

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider isPathReadOnly={isPathReadOnly}>
            {children}
          </IDEContextProvider>
        ),
      })

      // Create and open a file that will be marked as read-only
      act(() => {
        result.current.createFile('/readonly-test.lua', 'original')
      })

      act(() => {
        result.current.openFile('/readonly-test.lua')
      })

      act(() => {
        result.current.setCode('modified')
      })

      // Verify dirty state
      expect(result.current.isDirty).toBe(true)

      // Act - try to save read-only file
      act(() => {
        result.current.saveFile()
      })

      // Assert - should show error toast and remain dirty
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('error')
      expect(result.current.toasts[0].message).toBe('This file is read-only and cannot be saved')
      expect(result.current.isDirty).toBe(true) // Still dirty - save was blocked
    })

    it('should save normally when file is not read-only', () => {
      // Arrange - provide a mock isPathReadOnly function that doesn't mark the file as read-only
      const isPathReadOnly = vi.fn((path: string) => path === '/readonly-test.lua')

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider isPathReadOnly={isPathReadOnly}>
            {children}
          </IDEContextProvider>
        ),
      })

      // Create and open a regular file (not read-only)
      act(() => {
        result.current.createFile('/normal-test.lua', 'original')
      })

      act(() => {
        result.current.openFile('/normal-test.lua')
      })

      act(() => {
        result.current.setCode('modified')
      })

      expect(result.current.isDirty).toBe(true)

      // Act - save regular file
      act(() => {
        result.current.saveFile()
      })

      // Assert - should save successfully
      expect(result.current.toasts).toHaveLength(0) // No error toast
      expect(result.current.isDirty).toBe(false) // No longer dirty
    })
  })

  describe('empty state', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should return null fileName when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert - when no file is open, fileName should be null
      expect(result.current.fileName).toBeNull()
    })

    it('should have empty code when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.code).toBe('')
    })

    it('should have null activeTab when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.activeTab).toBeNull()
    })

    it('should have empty tabs array when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.tabs).toEqual([])
    })
  })
})
