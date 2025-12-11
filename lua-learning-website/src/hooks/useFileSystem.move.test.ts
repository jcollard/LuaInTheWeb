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

  describe('renameFolder', () => {
    it('should rename folder and update all nested paths', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/old')
      })
      act(() => {
        result.current.createFile('/old/file.lua', 'content')
      })

      // Act
      act(() => {
        result.current.renameFolder('/old', '/new')
      })

      // Assert
      expect(result.current.exists('/old')).toBe(false)
      expect(result.current.exists('/new')).toBe(true)
      expect(result.current.exists('/new/file.lua')).toBe(true)
      expect(result.current.readFile('/new/file.lua')).toBe('content')
    })

    it('should throw when folder does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFolder('/nonexistent', '/new')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when target already exists as folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/old')
      })
      act(() => {
        result.current.createFolder('/existing')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFolder('/old', '/existing')
        })
      }).toThrow(/exists/i)
    })

    it('should throw when target already exists as file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/old')
      })
      act(() => {
        result.current.createFile('/existing.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFolder('/old', '/existing.lua')
        })
      }).toThrow(/exists/i)
    })

    it('should throw for invalid new folder name', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/old')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.renameFolder('/old', '/new<invalid>')
        })
      }).toThrow(/invalid/i)
    })

    it('should rename folder with nested subfolders', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFolder('/parent/child')
      })
      act(() => {
        result.current.createFile('/parent/child/deep.lua', 'content')
      })

      // Act
      act(() => {
        result.current.renameFolder('/parent', '/renamed')
      })

      // Assert
      expect(result.current.exists('/parent')).toBe(false)
      expect(result.current.exists('/parent/child')).toBe(false)
      expect(result.current.exists('/renamed')).toBe(true)
      expect(result.current.exists('/renamed/child')).toBe(true)
      expect(result.current.exists('/renamed/child/deep.lua')).toBe(true)
      expect(result.current.readFile('/renamed/child/deep.lua')).toBe('content')
    })
  })

  describe('moveFile', () => {
    it('should move file to target folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua', 'content')
      })
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act
      act(() => {
        result.current.moveFile('/main.lua', '/utils')
      })

      // Assert
      expect(result.current.exists('/main.lua')).toBe(false)
      expect(result.current.exists('/utils/main.lua')).toBe(true)
      expect(result.current.readFile('/utils/main.lua')).toBe('content')
    })

    it('should move file to root folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/main.lua', 'content')
      })

      // Act
      act(() => {
        result.current.moveFile('/src/main.lua', '/')
      })

      // Assert
      expect(result.current.exists('/src/main.lua')).toBe(false)
      expect(result.current.exists('/main.lua')).toBe(true)
    })

    it('should throw when source does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.moveFile('/nonexistent.lua', '/utils')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when target folder does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.moveFile('/main.lua', '/nonexistent')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when file with same name exists in target', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua')
      })
      act(() => {
        result.current.createFolder('/utils')
      })
      act(() => {
        result.current.createFile('/utils/main.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.moveFile('/main.lua', '/utils')
        })
      }).toThrow(/exists/i)
    })

    it('should be a no-op when moving to same folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/main.lua', 'content')
      })

      // Act - move to same folder should be no-op
      act(() => {
        result.current.moveFile('/src/main.lua', '/src')
      })

      // Assert - file should still exist in same location
      expect(result.current.exists('/src/main.lua')).toBe(true)
      expect(result.current.readFile('/src/main.lua')).toBe('content')
    })

    it('should move folder to target folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/main.lua', 'content')
      })
      act(() => {
        result.current.createFolder('/lib')
      })

      // Act
      act(() => {
        result.current.moveFile('/src', '/lib')
      })

      // Assert
      expect(result.current.exists('/src')).toBe(false)
      expect(result.current.exists('/lib/src')).toBe(true)
      expect(result.current.exists('/lib/src/main.lua')).toBe(true)
      expect(result.current.readFile('/lib/src/main.lua')).toBe('content')
    })

    it('should not allow moving folder into itself', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFolder('/parent/child')
      })

      // Act & Assert - trying to move /parent into /parent/child should fail
      expect(() => {
        act(() => {
          result.current.moveFile('/parent', '/parent/child')
        })
      }).toThrow(/cannot move/i)
    })
  })
})
