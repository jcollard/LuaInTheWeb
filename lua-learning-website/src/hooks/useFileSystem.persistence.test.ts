import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { useFileSystem } from './useFileSystem'

describe('useFileSystem', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('persistence', () => {
    it('should persist state to localStorage', async () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      act(() => {
        result.current.createFile('/test.lua', 'content')
      })

      // Wait for debounced save
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350))
      })

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.files['/test.lua']).toBeDefined()
    })

    it('should handle corrupted localStorage gracefully', () => {
      // Arrange - set up corrupted data
      localStorageMock.getItem.mockReturnValue('not valid json{{{')

      // Act & Assert - should not throw
      expect(() => {
        renderHook(() => useFileSystem())
      }).not.toThrow()
    })

    it('should handle missing version field in stored data', () => {
      // Arrange - stored data has no version field
      localStorageMock.clear()
      const savedState = {
        files: {
          '/test.lua': { name: 'test.lua', content: 'content', createdAt: 1000, updatedAt: 1000 }
        }
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedState))

      // Act
      const { result } = renderHook(() => useFileSystem())

      // Assert - should still load the file despite missing version
      expect(result.current.exists('/test.lua')).toBe(true)
    })

    it('should handle missing files field in stored data', () => {
      // Arrange - stored data has only folders, no files
      localStorageMock.clear()
      const savedState = {
        version: 1,
        folders: ['/']
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedState))

      // Act
      const { result } = renderHook(() => useFileSystem())

      // Assert - should initialize without crashing, tree should be empty
      expect(result.current.getTree()).toEqual([])
    })

    it('should handle missing folders field in stored data', () => {
      // Arrange - stored data has files but no folders array
      localStorageMock.clear()
      const savedState = {
        version: 1,
        files: {
          '/test.lua': { name: 'test.lua', content: 'content', createdAt: 1000, updatedAt: 1000 }
        }
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedState))

      // Act
      const { result } = renderHook(() => useFileSystem())

      // Assert - file should exist because files are loaded
      expect(result.current.exists('/test.lua')).toBe(true)
    })

    it('should persist folders as array', async () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/utils')
      })

      // Wait for debounced save
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350))
      })

      // Assert
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(Array.isArray(savedData.folders)).toBe(true)
      expect(savedData.folders).toContain('/utils')
    })
  })

  describe('file name validation', () => {
    it('should allow forward slash as path separator', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Create parent folders first
      act(() => {
        result.current.createFolder('/path')
      })
      act(() => {
        result.current.createFolder('/path/name')
      })

      // Act & Assert - forward slash is allowed as path separator
      expect(() => {
        act(() => {
          result.current.createFile('/path/name/file.lua')
        })
      }).not.toThrow()

      expect(result.current.exists('/path/name/file.lua')).toBe(true)
    })

    it('should reject names with backslash', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name\\bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject names with colon', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name:bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject names with asterisk', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name*bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject names with question mark', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name?bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject names with quotes', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name"bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject names with angle brackets', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name<bad.lua')
        })
      }).toThrow(/invalid/i)

      expect(() => {
        act(() => {
          result.current.createFile('/name>bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject names with pipe', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name|bad.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject empty file names', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject whitespace-only file names', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/   ')
        })
      }).toThrow(/invalid/i)
    })
  })

  describe('path normalization', () => {
    it('should normalize path without leading slash', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      act(() => {
        result.current.createFile('main.lua', 'content')
      })

      // Assert - path should be normalized to /main.lua
      expect(result.current.exists('/main.lua')).toBe(true)
      expect(result.current.readFile('main.lua')).toBe('content')
    })

    it('should normalize path with trailing slash', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      act(() => {
        result.current.createFolder('/utils/')
      })

      // Assert - path should be normalized to /utils
      expect(result.current.exists('/utils')).toBe(true)
      expect(result.current.exists('/utils/')).toBe(true)
    })

    it('should handle root path with trailing slash', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/main.lua', 'content')
      })

      // Act - move to root with trailing slash
      act(() => {
        result.current.moveFile('/src/main.lua', '/')
      })

      // Assert
      expect(result.current.exists('/main.lua')).toBe(true)
    })
  })
})
