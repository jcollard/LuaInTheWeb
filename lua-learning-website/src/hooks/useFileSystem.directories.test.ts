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

  describe('createFolder', () => {
    it('should create folder at given path', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      act(() => {
        result.current.createFolder('/utils')
      })

      // Assert
      expect(result.current.exists('/utils')).toBe(true)
    })

    it('should create nested folders', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act - separate act() blocks for dependent operations
      act(() => {
        result.current.createFolder('/a')
      })
      act(() => {
        result.current.createFolder('/a/b')
      })
      act(() => {
        result.current.createFolder('/a/b/c')
      })

      // Assert
      expect(result.current.exists('/a/b/c')).toBe(true)
    })

    it('should reject duplicate folder names', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFolder('/utils')
        })
      }).toThrow(/exists/i)
    })

    it('should throw when parent folder does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFolder('/nonexistent/child')
        })
      }).toThrow(/not found/i)
    })

    it('should reject folder with same name as existing file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/name.lua')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFolder('/name.lua')
        })
      }).toThrow(/exists/i)
    })

    it('should reject invalid folder names', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.createFolder('/invalid<name>')
        })
      }).toThrow(/invalid/i)
    })
  })

  describe('deleteFolder', () => {
    it('should remove folder and contents', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/utils')
      })
      act(() => {
        result.current.createFile('/utils/math.lua')
      })
      act(() => {
        result.current.createFile('/utils/string.lua')
      })

      // Act
      act(() => {
        result.current.deleteFolder('/utils')
      })

      // Assert
      expect(result.current.exists('/utils')).toBe(false)
      expect(result.current.exists('/utils/math.lua')).toBe(false)
      expect(result.current.exists('/utils/string.lua')).toBe(false)
    })

    it('should throw for non-existent folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.deleteFolder('/nonexistent')
        })
      }).toThrow(/not found/i)
    })

    it('should remove nested subfolders recursively', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFolder('/parent/child')
      })
      act(() => {
        result.current.createFolder('/parent/child/grandchild')
      })
      act(() => {
        result.current.createFile('/parent/child/grandchild/deep.lua')
      })

      // Act
      act(() => {
        result.current.deleteFolder('/parent')
      })

      // Assert
      expect(result.current.exists('/parent')).toBe(false)
      expect(result.current.exists('/parent/child')).toBe(false)
      expect(result.current.exists('/parent/child/grandchild')).toBe(false)
      expect(result.current.exists('/parent/child/grandchild/deep.lua')).toBe(false)
    })

    it('should only delete the specified folder and not siblings', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/folder1')
      })
      act(() => {
        result.current.createFolder('/folder2')
      })
      act(() => {
        result.current.createFile('/folder1/file.lua')
      })
      act(() => {
        result.current.createFile('/folder2/file.lua')
      })

      // Act
      act(() => {
        result.current.deleteFolder('/folder1')
      })

      // Assert
      expect(result.current.exists('/folder1')).toBe(false)
      expect(result.current.exists('/folder2')).toBe(true)
      expect(result.current.exists('/folder2/file.lua')).toBe(true)
    })
  })

  describe('exists', () => {
    it('should return true for existing file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/test.lua')
      })

      // Act & Assert
      expect(result.current.exists('/test.lua')).toBe(true)
    })

    it('should return true for existing folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act & Assert
      expect(result.current.exists('/utils')).toBe(true)
    })

    it('should return false for non-existent path', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(result.current.exists('/nonexistent')).toBe(false)
    })
  })

  describe('isDirectory', () => {
    it('should return true for existing folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act & Assert
      expect(result.current.isDirectory('/utils')).toBe(true)
    })

    it('should return true for root folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(result.current.isDirectory('/')).toBe(true)
    })

    it('should return false for existing file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/test.lua')
      })

      // Act & Assert
      expect(result.current.isDirectory('/test.lua')).toBe(false)
    })

    it('should return false for non-existent path', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act & Assert
      expect(result.current.isDirectory('/nonexistent')).toBe(false)
    })

    it('should return true for nested folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFolder('/parent/child')
      })

      // Act & Assert
      expect(result.current.isDirectory('/parent/child')).toBe(true)
    })
  })

  describe('listDirectory', () => {
    it('should return children of folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/a.lua')
        result.current.createFile('/b.lua')
        result.current.createFolder('/utils')
      })

      // Act
      const children = result.current.listDirectory('/')

      // Assert
      expect(children).toContain('a.lua')
      expect(children).toContain('b.lua')
      expect(children).toContain('utils')
    })

    it('should return empty array for empty folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/empty')
      })

      // Act
      const children = result.current.listDirectory('/empty')

      // Assert
      expect(children).toEqual([])
    })

    it('should return empty array for non-existent folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())

      // Act
      const children = result.current.listDirectory('/nonexistent')

      // Assert
      expect(children).toEqual([])
    })
  })

  describe('getTree', () => {
    it('should return hierarchical tree structure', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua')
      })
      act(() => {
        result.current.createFolder('/utils')
      })
      act(() => {
        result.current.createFile('/utils/math.lua')
      })

      // Act
      const tree = result.current.getTree()

      // Assert
      expect(tree).toHaveLength(2) // main.lua and utils folder

      const mainFile = tree.find(node => node.name === 'main.lua')
      expect(mainFile).toBeDefined()
      expect(mainFile?.type).toBe('file')
      expect(mainFile?.path).toBe('/main.lua')

      const utilsFolder = tree.find(node => node.name === 'utils')
      expect(utilsFolder).toBeDefined()
      expect(utilsFolder?.type).toBe('folder')
      expect(utilsFolder?.children).toHaveLength(1)
      expect(utilsFolder?.children?.[0].name).toBe('math.lua')
    })

    it('should sort folders before files', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/z.lua')
        result.current.createFolder('/a-folder')
        result.current.createFile('/a.lua')
      })

      // Act
      const tree = result.current.getTree()

      // Assert - folder should come first
      expect(tree[0].type).toBe('folder')
      expect(tree[0].name).toBe('a-folder')
    })

    it('should sort items alphabetically within type', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/c.lua')
        result.current.createFile('/a.lua')
        result.current.createFile('/b.lua')
      })

      // Act
      const tree = result.current.getTree()

      // Assert
      expect(tree.map(n => n.name)).toEqual(['a.lua', 'b.lua', 'c.lua'])
    })

    it('should sort files after folders when mixed', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/file1.lua')
        result.current.createFolder('/folder1')
        result.current.createFile('/file2.lua')
        result.current.createFolder('/folder2')
      })

      // Act
      const tree = result.current.getTree()

      // Assert - all folders first, then all files
      expect(tree[0].type).toBe('folder')
      expect(tree[1].type).toBe('folder')
      expect(tree[2].type).toBe('file')
      expect(tree[3].type).toBe('file')
    })

    it('should return 1 when file compared to folder in sort', () => {
      // Arrange - create file first, then folder to test sort comparison
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/z-file.lua') // File with name after folder alphabetically
        result.current.createFolder('/a-folder')  // Folder with name before file alphabetically
      })

      // Act
      const tree = result.current.getTree()

      // Assert - folder should still come first despite alphabetical order
      expect(tree[0].name).toBe('a-folder')
      expect(tree[0].type).toBe('folder')
      expect(tree[1].name).toBe('z-file.lua')
      expect(tree[1].type).toBe('file')
    })

    it('should sort folders alphabetically among themselves', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/zebra')
        result.current.createFolder('/alpha')
        result.current.createFolder('/beta')
      })

      // Act
      const tree = result.current.getTree()

      // Assert
      expect(tree.map(n => n.name)).toEqual(['alpha', 'beta', 'zebra'])
    })

    it('should apply sorting recursively in nested folders', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFile('/parent/z.lua')
        result.current.createFolder('/parent/subfolder')
        result.current.createFile('/parent/a.lua')
      })

      // Act
      const tree = result.current.getTree()
      const parent = tree.find(n => n.name === 'parent')

      // Assert - subfolder first, then files alphabetically
      expect(parent?.children?.[0].name).toBe('subfolder')
      expect(parent?.children?.[1].name).toBe('a.lua')
      expect(parent?.children?.[2].name).toBe('z.lua')
    })
  })
})
