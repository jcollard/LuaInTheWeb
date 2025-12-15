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

    it('should rename folder with deeply nested structure', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/old')
      })
      act(() => {
        result.current.createFolder('/old/level1')
        result.current.createFile('/old/file0.lua', 'file0')
      })
      act(() => {
        result.current.createFolder('/old/level1/level2')
        result.current.createFile('/old/level1/file1.lua', 'file1')
      })
      act(() => {
        result.current.createFile('/old/level1/level2/file2.lua', 'file2')
      })

      // Act
      act(() => {
        result.current.renameFolder('/old', '/new')
      })

      // Assert - all old paths should not exist
      expect(result.current.exists('/old')).toBe(false)
      expect(result.current.exists('/old/file0.lua')).toBe(false)
      expect(result.current.exists('/old/level1')).toBe(false)
      expect(result.current.exists('/old/level1/file1.lua')).toBe(false)
      expect(result.current.exists('/old/level1/level2')).toBe(false)
      expect(result.current.exists('/old/level1/level2/file2.lua')).toBe(false)

      // Assert - all new paths should exist with correct content
      expect(result.current.exists('/new')).toBe(true)
      expect(result.current.exists('/new/file0.lua')).toBe(true)
      expect(result.current.exists('/new/level1')).toBe(true)
      expect(result.current.exists('/new/level1/file1.lua')).toBe(true)
      expect(result.current.exists('/new/level1/level2')).toBe(true)
      expect(result.current.exists('/new/level1/level2/file2.lua')).toBe(true)
      expect(result.current.readFile('/new/file0.lua')).toBe('file0')
      expect(result.current.readFile('/new/level1/file1.lua')).toBe('file1')
      expect(result.current.readFile('/new/level1/level2/file2.lua')).toBe('file2')
    })

    it('should not rename folders with similar path prefixes', () => {
      // Arrange - /folder and /folder-extra
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/folder')
        result.current.createFolder('/folder-extra')
      })
      act(() => {
        result.current.createFile('/folder/file.lua', 'folder')
        result.current.createFile('/folder-extra/file.lua', 'folder-extra')
      })

      // Act
      act(() => {
        result.current.renameFolder('/folder', '/renamed')
      })

      // Assert - /folder-extra should be untouched
      expect(result.current.exists('/folder')).toBe(false)
      expect(result.current.exists('/renamed')).toBe(true)
      expect(result.current.exists('/renamed/file.lua')).toBe(true)
      expect(result.current.exists('/folder-extra')).toBe(true)
      expect(result.current.exists('/folder-extra/file.lua')).toBe(true)
      expect(result.current.readFile('/folder-extra/file.lua')).toBe('folder-extra')
    })

    it('should rename nested subfolder correctly', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFolder('/parent/oldname')
      })
      act(() => {
        result.current.createFile('/parent/oldname/file.lua', 'content')
      })

      // Act - rename the subfolder, not the parent
      act(() => {
        result.current.renameFolder('/parent/oldname', '/parent/newname')
      })

      // Assert
      expect(result.current.exists('/parent')).toBe(true)
      expect(result.current.exists('/parent/oldname')).toBe(false)
      expect(result.current.exists('/parent/newname')).toBe(true)
      expect(result.current.exists('/parent/newname/file.lua')).toBe(true)
      expect(result.current.readFile('/parent/newname/file.lua')).toBe('content')
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

    it('should move folder with deeply nested structure', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/source')
      })
      act(() => {
        result.current.createFolder('/source/level1')
        result.current.createFile('/source/file0.lua', 'file0')
      })
      act(() => {
        result.current.createFolder('/source/level1/level2')
        result.current.createFile('/source/level1/file1.lua', 'file1')
      })
      act(() => {
        result.current.createFile('/source/level1/level2/file2.lua', 'file2')
      })
      act(() => {
        result.current.createFolder('/target')
      })

      // Act
      act(() => {
        result.current.moveFile('/source', '/target')
      })

      // Assert - all old paths should not exist
      expect(result.current.exists('/source')).toBe(false)
      expect(result.current.exists('/source/file0.lua')).toBe(false)
      expect(result.current.exists('/source/level1')).toBe(false)
      expect(result.current.exists('/source/level1/file1.lua')).toBe(false)
      expect(result.current.exists('/source/level1/level2')).toBe(false)
      expect(result.current.exists('/source/level1/level2/file2.lua')).toBe(false)

      // Assert - all new paths should exist with correct content
      expect(result.current.exists('/target/source')).toBe(true)
      expect(result.current.exists('/target/source/file0.lua')).toBe(true)
      expect(result.current.exists('/target/source/level1')).toBe(true)
      expect(result.current.exists('/target/source/level1/file1.lua')).toBe(true)
      expect(result.current.exists('/target/source/level1/level2')).toBe(true)
      expect(result.current.exists('/target/source/level1/level2/file2.lua')).toBe(true)
      expect(result.current.readFile('/target/source/file0.lua')).toBe('file0')
      expect(result.current.readFile('/target/source/level1/file1.lua')).toBe('file1')
      expect(result.current.readFile('/target/source/level1/level2/file2.lua')).toBe('file2')
    })

    it('should not move folders with similar path prefixes', () => {
      // Arrange - /folder and /folder-extra
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/folder')
        result.current.createFolder('/folder-extra')
        result.current.createFolder('/target')
      })
      act(() => {
        result.current.createFile('/folder/file.lua', 'folder')
        result.current.createFile('/folder-extra/file.lua', 'folder-extra')
      })

      // Act
      act(() => {
        result.current.moveFile('/folder', '/target')
      })

      // Assert - /folder-extra should be untouched
      expect(result.current.exists('/folder')).toBe(false)
      expect(result.current.exists('/target/folder')).toBe(true)
      expect(result.current.exists('/target/folder/file.lua')).toBe(true)
      expect(result.current.exists('/folder-extra')).toBe(true)
      expect(result.current.exists('/folder-extra/file.lua')).toBe(true)
      expect(result.current.readFile('/folder-extra/file.lua')).toBe('folder-extra')
    })

    it('should move folder with multiple sibling subfolders', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFolder('/src/a')
        result.current.createFolder('/src/b')
        result.current.createFolder('/src/c')
      })
      act(() => {
        result.current.createFile('/src/a/file.lua', 'a')
        result.current.createFile('/src/b/file.lua', 'b')
        result.current.createFile('/src/c/file.lua', 'c')
      })
      act(() => {
        result.current.createFolder('/dest')
      })

      // Act
      act(() => {
        result.current.moveFile('/src', '/dest')
      })

      // Assert
      expect(result.current.exists('/src')).toBe(false)
      expect(result.current.exists('/dest/src')).toBe(true)
      expect(result.current.exists('/dest/src/a')).toBe(true)
      expect(result.current.exists('/dest/src/b')).toBe(true)
      expect(result.current.exists('/dest/src/c')).toBe(true)
      expect(result.current.readFile('/dest/src/a/file.lua')).toBe('a')
      expect(result.current.readFile('/dest/src/b/file.lua')).toBe('b')
      expect(result.current.readFile('/dest/src/c/file.lua')).toBe('c')
    })

    it('should throw when target folder does not exist for folder move', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/folder')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.moveFile('/folder', '/nonexistent')
        })
      }).toThrow(/not found/i)
    })
  })
})
