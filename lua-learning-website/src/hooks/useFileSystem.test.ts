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
