import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { useShell } from './useShell'
import type { UseFileSystemReturn } from './useFileSystem'

describe('useShell', () => {
  // Create a mock filesystem
  const createMockFileSystem = (): UseFileSystemReturn => ({
    createFile: vi.fn(),
    readFile: vi.fn().mockReturnValue(null),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    moveFile: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    renameFolder: vi.fn(),
    exists: vi.fn().mockReturnValue(true),
    isDirectory: vi.fn().mockReturnValue(true),
    listDirectory: vi.fn().mockReturnValue([]),
    getTree: vi.fn().mockReturnValue([]),
  })

  let mockFileSystem: UseFileSystemReturn

  beforeEach(() => {
    mockFileSystem = createMockFileSystem()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default cwd of "/"', () => {
      // Act
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Assert
      expect(result.current.cwd).toBe('/')
    })

    it('should initialize with empty history', () => {
      // Act
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Assert
      expect(result.current.history).toEqual([])
    })
  })

  describe('executeCommand', () => {
    it('should return success for empty input', () => {
      // Arrange
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('')
      })

      // Assert
      expect(commandResult!.exitCode).toBe(0)
      expect(commandResult!.stdout).toBe('')
      expect(commandResult!.stderr).toBe('')
      expect(commandResult!.cwd).toBe('/')
    })

    it('should add command to history', () => {
      // Arrange
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Act
      act(() => {
        result.current.executeCommand('pwd')
      })

      // Assert
      expect(result.current.history).toContain('pwd')
    })

    it('should execute pwd command', () => {
      // Arrange
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('pwd')
      })

      // Assert
      expect(commandResult!.exitCode).toBe(0)
      expect(commandResult!.stdout).toBe('/')
      expect(commandResult!.cwd).toBe('/')
    })

    it('should execute help command', () => {
      // Arrange
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('help')
      })

      // Assert
      expect(commandResult!.exitCode).toBe(0)
      expect(commandResult!.stdout).toContain('Available commands')
    })

    it('should return error for unknown command', () => {
      // Arrange
      const { result } = renderHook(() => useShell(mockFileSystem))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('unknowncommand')
      })

      // Assert
      expect(commandResult!.exitCode).not.toBe(0)
      expect(commandResult!.stderr).toContain('unknowncommand')
    })
  })

  describe('clearHistory', () => {
    it('should clear command history', () => {
      // Arrange
      const { result } = renderHook(() => useShell(mockFileSystem))
      act(() => {
        result.current.executeCommand('pwd')
        result.current.executeCommand('help')
      })
      expect(result.current.history.length).toBe(2)

      // Act
      act(() => {
        result.current.clearHistory()
      })

      // Assert
      expect(result.current.history).toEqual([])
    })
  })

  describe('cd command', () => {
    it('should change working directory', () => {
      // Arrange
      const mockFs = createMockFileSystem()
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isDirectory = vi.fn().mockReturnValue(true)
      const { result } = renderHook(() => useShell(mockFs))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('cd /test')
      })

      // Assert - the cwd should be updated and returned
      expect(commandResult!.cwd).toBe('/test')
      expect(result.current.cwd).toBe('/test')
    })

    it('should return error when directory does not exist', () => {
      // Arrange
      const mockFs = createMockFileSystem()
      mockFs.exists = vi.fn().mockReturnValue(false)
      const { result } = renderHook(() => useShell(mockFs))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('cd /nonexistent')
      })

      // Assert
      expect(commandResult!.exitCode).not.toBe(0)
    })
  })

  describe('ls command', () => {
    it('should list directory contents', () => {
      // Arrange
      const mockFs = createMockFileSystem()
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isDirectory = vi.fn().mockReturnValue(true)
      mockFs.listDirectory = vi.fn().mockReturnValue(['file1.lua', 'folder1'])
      const { result } = renderHook(() => useShell(mockFs))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('ls')
      })

      // Assert
      expect(commandResult!.exitCode).toBe(0)
      expect(commandResult!.stdout).toContain('file1.lua')
      expect(commandResult!.stdout).toContain('folder1')
    })
  })

  describe('cp command with multiple sources', () => {
    it('should copy multiple files to destination directory', () => {
      // Arrange - foo and foo2 are files, baz is a directory
      const mockFs = createMockFileSystem()
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/baz' // only baz is a directory
      })
      mockFs.readFile = vi.fn().mockImplementation((path: string) => {
        if (path === '/foo') return 'foo content'
        if (path === '/foo2') return 'foo2 content'
        return null
      })
      const { result } = renderHook(() => useShell(mockFs))

      // Act - cp foo foo2 baz (should copy foo and foo2 into baz)
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('cp foo foo2 baz')
      })

      // Assert
      expect(commandResult!.exitCode).toBe(0)
      expect(commandResult!.stderr).toBe('')
      // Should write to /baz/foo and /baz/foo2
      expect(mockFs.writeFile).toHaveBeenCalledWith('/baz/foo', 'foo content')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/baz/foo2', 'foo2 content')
      // Should NOT write to /foo2 (that would be the 2-arg behavior)
      expect(mockFs.writeFile).not.toHaveBeenCalledWith('/foo2', expect.anything())
    })

    it('should return error when destination directory does not exist', () => {
      // Arrange
      const mockFs = createMockFileSystem()
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path !== '/nonexistent'
      })
      const { result } = renderHook(() => useShell(mockFs))

      // Act
      let commandResult: { exitCode: number; stdout: string; stderr: string; cwd: string }
      act(() => {
        commandResult = result.current.executeCommand('cp foo foo2 nonexistent')
      })

      // Assert
      expect(commandResult!.exitCode).toBe(1)
      expect(commandResult!.stderr).toContain('No such file or directory')
    })
  })
})
