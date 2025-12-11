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

  describe('new file creation', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should provide generateUniqueFileName function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.generateUniqueFileName).toBeInstanceOf(Function)
    })

    it('should generate untitled-1.lua for first new file', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      const fileName = result.current.generateUniqueFileName()

      // Assert
      expect(fileName).toBe('untitled-1.lua')
    })

    it('should generate untitled-2.lua if untitled-1.lua exists', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create untitled-1.lua
      act(() => {
        result.current.createFile('/untitled-1.lua', '')
      })

      // Act
      const fileName = result.current.generateUniqueFileName()

      // Assert
      expect(fileName).toBe('untitled-2.lua')
    })

    it('should skip existing numbered files to find unique name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create files 1, 2, and 3
      act(() => {
        result.current.createFile('/untitled-1.lua', '')
        result.current.createFile('/untitled-2.lua', '')
        result.current.createFile('/untitled-3.lua', '')
      })

      // Act
      const fileName = result.current.generateUniqueFileName()

      // Assert
      expect(fileName).toBe('untitled-4.lua')
    })

    it('should provide pendingNewFilePath state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBeNull()
    })

    it('should provide createFileWithRename function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFileWithRename).toBeInstanceOf(Function)
    })

    it('should set pendingNewFilePath when createFileWithRename is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFileWithRename()
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBe('/untitled-1.lua')
    })

    it('should create file in filesystem when createFileWithRename is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFileWithRename()
      })

      // Assert
      expect(result.current.fileTree).toContainEqual(
        expect.objectContaining({ path: '/untitled-1.lua' })
      )
    })

    it('should clear pendingNewFilePath after clearPendingNewFile is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFileWithRename()
      })
      expect(result.current.pendingNewFilePath).toBe('/untitled-1.lua')

      // Act
      act(() => {
        result.current.clearPendingNewFile()
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBeNull()
    })

    it('should create file in specified parent folder', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a folder first
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act
      act(() => {
        result.current.createFileWithRename('/utils')
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBe('/utils/untitled-1.lua')
    })
  })

  describe('new folder creation', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should provide generateUniqueFolderName function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.generateUniqueFolderName).toBeInstanceOf(Function)
    })

    it('should generate new-folder for first new folder', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      const folderName = result.current.generateUniqueFolderName()

      // Assert
      expect(folderName).toBe('new-folder')
    })

    it('should generate new-folder-1 if new-folder exists', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create new-folder
      act(() => {
        result.current.createFolder('/new-folder')
      })

      // Act
      const folderName = result.current.generateUniqueFolderName()

      // Assert
      expect(folderName).toBe('new-folder-1')
    })

    it('should skip existing numbered folders to find unique name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create folders
      act(() => {
        result.current.createFolder('/new-folder')
        result.current.createFolder('/new-folder-1')
        result.current.createFolder('/new-folder-2')
      })

      // Act
      const folderName = result.current.generateUniqueFolderName()

      // Assert
      expect(folderName).toBe('new-folder-3')
    })

    it('should generate unique folder name in specified parent', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create parent folder first
      act(() => {
        result.current.createFolder('/parent')
      })

      // Then create new-folder inside it (needs separate act for state to update)
      act(() => {
        result.current.createFolder('/parent/new-folder')
      })

      // Act
      const folderName = result.current.generateUniqueFolderName('/parent')

      // Assert
      expect(folderName).toBe('new-folder-1')
    })

    it('should provide pendingNewFolderPath state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.pendingNewFolderPath).toBeNull()
    })

    it('should provide createFolderWithRename function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFolderWithRename).toBeInstanceOf(Function)
    })

    it('should set pendingNewFolderPath when createFolderWithRename is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFolderWithRename()
      })

      // Assert
      expect(result.current.pendingNewFolderPath).toBe('/new-folder')
    })

    it('should create folder in filesystem when createFolderWithRename is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFolderWithRename()
      })

      // Assert
      expect(result.current.fileTree).toContainEqual(
        expect.objectContaining({ path: '/new-folder', type: 'folder' })
      )
    })

    it('should clear pendingNewFolderPath after clearPendingNewFolder is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFolderWithRename()
      })
      expect(result.current.pendingNewFolderPath).toBe('/new-folder')

      // Act
      act(() => {
        result.current.clearPendingNewFolder()
      })

      // Assert
      expect(result.current.pendingNewFolderPath).toBeNull()
    })

    it('should create folder in specified parent folder', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a folder first
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act
      act(() => {
        result.current.createFolderWithRename('/utils')
      })

      // Assert
      expect(result.current.pendingNewFolderPath).toBe('/utils/new-folder')
    })

    it('should generate unique name when folder already exists at target', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create new-folder first
      act(() => {
        result.current.createFolder('/new-folder')
      })

      // Act
      act(() => {
        result.current.createFolderWithRename()
      })

      // Assert
      expect(result.current.pendingNewFolderPath).toBe('/new-folder-1')
      expect(result.current.fileTree).toContainEqual(
        expect.objectContaining({ path: '/new-folder-1', type: 'folder' })
      )
    })
  })
})
