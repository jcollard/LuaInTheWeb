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

  describe('initialization', () => {
    it('should initialize with empty root folder', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileSystem())

      // Assert
      const tree = result.current.getTree()
      expect(tree).toEqual([])
    })

    it('should load state from localStorage on init', () => {
      // Arrange - set up localStorage with existing data
      const savedState = {
        version: 1,
        files: {
          '/test.lua': { name: 'test.lua', content: 'print("hello")', createdAt: 1000, updatedAt: 1000 }
        }
      }
      localStorageMock.setItem('lua-ide-filesystem', JSON.stringify(savedState))

      // Act
      const { result } = renderHook(() => useFileSystem())

      // Assert
      expect(result.current.exists('/test.lua')).toBe(true)
      expect(result.current.readFile('/test.lua')).toBe('print("hello")')
    })
  })

  describe('createFile', () => {
    it('should create file at given path', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      act(() => {
        result.current.createFile('/main.lua')
      })

      // Assert
      expect(result.current.exists('/main.lua')).toBe(true)
    })

    it('should create file with initial content', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      act(() => {
        result.current.createFile('/main.lua', 'print("hello")')
      })

      // Assert
      expect(result.current.readFile('/main.lua')).toBe('print("hello")')
    })

    it('should create file in nested folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act - separate act() blocks for dependent operations
      act(() => {
        result.current.createFolder('/utils')
      })
      act(() => {
        result.current.createFile('/utils/math.lua', 'return {}')
      })

      // Assert
      expect(result.current.exists('/utils/math.lua')).toBe(true)
      expect(result.current.readFile('/utils/math.lua')).toBe('return {}')
    })

    it('should reject invalid file names with special characters', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/invalid<name>.lua')
        })
      }).toThrow(/invalid/i)
    })

    it('should reject duplicate file names in same folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/main.lua')
        })
      }).toThrow(/exists/i)
    })

    it('should throw when parent folder does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/nonexistent/file.lua')
        })
      }).toThrow(/not found/i)
    })

    it('should reject file with same name as existing folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/name')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFile('/name')
        })
      }).toThrow(/exists/i)
    })
  })

  describe('readFile', () => {
    it('should return file content', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/test.lua', 'local x = 1')
      })

      // Act
      const content = result.current.readFile('/test.lua')

      // Assert
      expect(content).toBe('local x = 1')
    })

    it('should return null for non-existent file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      const content = result.current.readFile('/nonexistent.lua')

      // Assert
      expect(content).toBeNull()
    })
  })

  describe('writeFile', () => {
    it('should update file content', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/test.lua', 'old content')
      })

      // Act
      act(() => {
        result.current.writeFile('/test.lua', 'new content')
      })

      // Assert
      expect(result.current.readFile('/test.lua')).toBe('new content')
    })

    it('should throw for non-existent file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.writeFile('/nonexistent.lua', 'content')
        })
      }).toThrow(/not found/i)
    })
  })

  describe('deleteFile', () => {
    it('should remove file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/test.lua')
      })

      // Act
      act(() => {
        result.current.deleteFile('/test.lua')
      })

      // Assert
      expect(result.current.exists('/test.lua')).toBe(false)
    })

    it('should throw for non-existent file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.deleteFile('/nonexistent.lua')
        })
      }).toThrow(/not found/i)
    })
  })

  describe('renameFile', () => {
    it('should move file to new path', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/old.lua', 'content')
      })

      // Act
      act(() => {
        result.current.renameFile('/old.lua', '/new.lua')
      })

      // Assert
      expect(result.current.exists('/old.lua')).toBe(false)
      expect(result.current.exists('/new.lua')).toBe(true)
      expect(result.current.readFile('/new.lua')).toBe('content')
    })

    it('should preserve file content when renaming', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/test.lua', 'print("hello")')
      })

      // Act
      act(() => {
        result.current.renameFile('/test.lua', '/renamed.lua')
      })

      // Assert
      expect(result.current.readFile('/renamed.lua')).toBe('print("hello")')
    })

    it('should throw when target already exists', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/a.lua')
      })
      act(() => {
        result.current.createFile('/b.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFile('/a.lua', '/b.lua')
        })
      }).toThrow(/exists/i)
    })

    it('should throw when source file does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFile('/nonexistent.lua', '/new.lua')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when target is an existing folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/file.lua')
      })
      act(() => {
        result.current.createFolder('/folder')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFile('/file.lua', '/folder')
        })
      }).toThrow(/exists/i)
    })

    it('should throw for invalid new file name', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/old.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFile('/old.lua', '/new<invalid>.lua')
        })
      }).toThrow(/invalid/i)
    })
  })
})
