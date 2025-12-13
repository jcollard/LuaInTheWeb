import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { useShell } from './useShell'
import type { UseFileSystemReturn } from './useFileSystem'
import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'

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

/**
 * Tests for useShell with IFileSystem directly (workspace integration).
 * Issue #202: Shell Multi-Workspace Integration
 */
describe('useShell with IFileSystem', () => {
  // Create a mock IFileSystem (like CompositeFileSystem would provide)
  function createMockIFileSystem(): IFileSystem {
    let currentDir = '/'
    const files: Record<string, string> = {
      '/test.txt': 'hello world',
      '/my-files/script.lua': 'print("Hello")',
    }
    const directories = new Set(['/', '/my-files'])

    return {
      getCurrentDirectory: () => currentDir,
      setCurrentDirectory: (path: string) => {
        currentDir = path
      },
      exists: (path: string) => path in files || directories.has(path),
      isDirectory: (path: string) => directories.has(path),
      isFile: (path: string) => path in files && !directories.has(path),
      listDirectory: (path: string): FileEntry[] => {
        if (!directories.has(path)) {
          throw new Error(`Not a directory: ${path}`)
        }
        const entries: FileEntry[] = []
        const prefix = path === '/' ? '/' : path + '/'
        for (const filePath of Object.keys(files)) {
          if (filePath.startsWith(prefix) && filePath !== path) {
            const relativePath = filePath.slice(prefix.length)
            const name = relativePath.split('/')[0]
            if (!entries.some((e) => e.name === name)) {
              const isDir = directories.has(path === '/' ? '/' + name : prefix + name)
              entries.push({
                name,
                type: isDir ? 'directory' : 'file',
                path: path === '/' ? '/' + name : prefix + name,
              })
            }
          }
        }
        // Also add directories that are direct children
        for (const dir of directories) {
          if (dir !== path && dir.startsWith(prefix)) {
            const relativePath = dir.slice(prefix.length)
            const name = relativePath.split('/')[0]
            if (!entries.some((e) => e.name === name)) {
              entries.push({
                name,
                type: 'directory',
                path: path === '/' ? '/' + name : prefix + name,
              })
            }
          }
        }
        return entries
      },
      readFile: (path: string) => {
        if (!(path in files) || directories.has(path)) {
          throw new Error(`File not found: ${path}`)
        }
        return files[path]
      },
      writeFile: (path: string, content: string) => {
        files[path] = content
      },
      createDirectory: (path: string) => {
        directories.add(path)
      },
      delete: (path: string) => {
        delete files[path]
        directories.delete(path)
      },
    }
  }

  let mockFs: IFileSystem

  beforeEach(() => {
    mockFs = createMockIFileSystem()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('accepts an IFileSystem directly', () => {
      const { result } = renderHook(() => useShell(mockFs))

      expect(result.current).toBeDefined()
      expect(result.current.executeCommand).toBeDefined()
      expect(result.current.cwd).toBe('/')
    })

    it('starts with empty history', () => {
      const { result } = renderHook(() => useShell(mockFs))

      expect(result.current.history).toEqual([])
    })

    it('provides command names for completion', () => {
      const { result } = renderHook(() => useShell(mockFs))

      expect(result.current.commandNames).toBeDefined()
      expect(result.current.commandNames.length).toBeGreaterThan(0)
      expect(result.current.commandNames).toContain('ls')
      expect(result.current.commandNames).toContain('cd')
    })
  })

  describe('command execution', () => {
    it('executes ls command and returns directory contents', () => {
      const { result } = renderHook(() => useShell(mockFs))

      let output: ReturnType<typeof result.current.executeCommand>
      act(() => {
        output = result.current.executeCommand('ls')
      })

      expect(output!.exitCode).toBe(0)
      expect(output!.stdout).toContain('test.txt')
      expect(output!.stdout).toContain('my-files')
    })

    it('executes cd command and updates cwd', () => {
      const { result } = renderHook(() => useShell(mockFs))

      act(() => {
        result.current.executeCommand('cd /my-files')
      })

      expect(result.current.cwd).toBe('/my-files')
    })

    it('executes pwd command to show current directory', () => {
      const { result } = renderHook(() => useShell(mockFs))

      let output: ReturnType<typeof result.current.executeCommand>
      act(() => {
        output = result.current.executeCommand('pwd')
      })

      expect(output!.exitCode).toBe(0)
      expect(output!.stdout).toBe('/')
    })

    it('adds commands to history', () => {
      const { result } = renderHook(() => useShell(mockFs))

      act(() => {
        result.current.executeCommand('ls')
        result.current.executeCommand('cd /my-files')
      })

      expect(result.current.history).toEqual(['ls', 'cd /my-files'])
    })

    it('returns error for invalid commands', () => {
      const { result } = renderHook(() => useShell(mockFs))

      let output: ReturnType<typeof result.current.executeCommand>
      act(() => {
        output = result.current.executeCommand('nonexistent-command')
      })

      expect(output!.exitCode).not.toBe(0)
    })
  })

  describe('executeCommandWithContext', () => {
    it('executes commands with output handlers', () => {
      const { result } = renderHook(() => useShell(mockFs))

      const outputHandler = vi.fn()
      const errorHandler = vi.fn()

      act(() => {
        result.current.executeCommandWithContext('ls', outputHandler, errorHandler)
      })

      expect(outputHandler).toHaveBeenCalled()
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('returns cwd after execution', () => {
      const { result } = renderHook(() => useShell(mockFs))

      let execResult: ReturnType<typeof result.current.executeCommandWithContext>
      act(() => {
        execResult = result.current.executeCommandWithContext('cd /my-files', vi.fn(), vi.fn())
      })

      expect(execResult!.cwd).toBe('/my-files')
    })
  })

  describe('path completion', () => {
    it('provides path completions for tab completion', () => {
      const { result } = renderHook(() => useShell(mockFs))

      let completions: ReturnType<typeof result.current.getPathCompletionsForTab> = []
      act(() => {
        completions = result.current.getPathCompletionsForTab('/my')
      })

      expect(completions).toBeDefined()
      // Should include /my-files
      expect(completions.some((c) => c.name === 'my-files')).toBe(true)
    })
  })

  describe('clearHistory', () => {
    it('clears the command history', () => {
      const { result } = renderHook(() => useShell(mockFs))

      act(() => {
        result.current.executeCommand('ls')
        result.current.executeCommand('cd /my-files')
      })

      expect(result.current.history).toHaveLength(2)

      act(() => {
        result.current.clearHistory()
      })

      expect(result.current.history).toEqual([])
    })
  })

  describe('disconnected workspace handling', () => {
    it('reports errors when operating on a disconnected filesystem', () => {
      // Create a mock disconnected filesystem (like a disconnected local workspace)
      // In a disconnected workspace, exists() returns false and operations throw
      const throwDisconnected = (): never => {
        throw new Error('Workspace is disconnected. Please reconnect to access files.')
      }

      const disconnectedFs: IFileSystem = {
        getCurrentDirectory: () => '/',
        setCurrentDirectory: throwDisconnected,
        exists: () => false,
        isDirectory: () => false,
        isFile: () => false,
        listDirectory: throwDisconnected,
        readFile: throwDisconnected,
        writeFile: throwDisconnected,
        createDirectory: throwDisconnected,
        delete: throwDisconnected,
      }

      const { result } = renderHook(() => useShell(disconnectedFs))

      // ls should fail because the directory doesn't exist in disconnected state
      let output: ReturnType<typeof result.current.executeCommand>
      act(() => {
        output = result.current.executeCommand('ls')
      })

      expect(output!.exitCode).not.toBe(0)
      // The error is "no such file or directory" because exists() returns false
      expect(output!.stderr).toContain('no such file or directory')
    })

    it('handles mkdir on disconnected filesystem', () => {
      // Create a mock disconnected filesystem
      const throwDisconnected = (): never => {
        throw new Error('Workspace is disconnected. Please reconnect to access files.')
      }

      const disconnectedFs: IFileSystem = {
        getCurrentDirectory: () => '/',
        setCurrentDirectory: throwDisconnected,
        exists: () => false,
        isDirectory: () => false,
        isFile: () => false,
        listDirectory: throwDisconnected,
        readFile: throwDisconnected,
        writeFile: throwDisconnected,
        createDirectory: throwDisconnected,
        delete: throwDisconnected,
      }

      const { result } = renderHook(() => useShell(disconnectedFs))

      // mkdir should fail with disconnection error
      let output: ReturnType<typeof result.current.executeCommand>
      act(() => {
        output = result.current.executeCommand('mkdir /newdir')
      })

      expect(output!.exitCode).not.toBe(0)
      expect(output!.stderr).toContain('disconnected')
    })
  })
})
