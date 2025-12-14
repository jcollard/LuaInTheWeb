import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { useFileSystem } from './useFileSystem'

describe('useFileSystem copyFile', () => {
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

  describe('copy file to folder', () => {
    it('should copy file to target folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua', 'original content')
      })
      act(() => {
        result.current.createFolder('/backup')
      })

      // Act
      act(() => {
        result.current.copyFile('/main.lua', '/backup')
      })

      // Assert - original file should still exist
      expect(result.current.exists('/main.lua')).toBe(true)
      expect(result.current.readFile('/main.lua')).toBe('original content')

      // Assert - copy should exist in target folder
      expect(result.current.exists('/backup/main.lua')).toBe(true)
      expect(result.current.readFile('/backup/main.lua')).toBe('original content')
    })

    it('should copy file to root folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/helper.lua', 'helper code')
      })

      // Act
      act(() => {
        result.current.copyFile('/src/helper.lua', '/')
      })

      // Assert - original should remain
      expect(result.current.exists('/src/helper.lua')).toBe(true)

      // Assert - copy should be at root
      expect(result.current.exists('/helper.lua')).toBe(true)
      expect(result.current.readFile('/helper.lua')).toBe('helper code')
    })

    it('should create independent copy with different content after modification', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/original.lua', 'initial')
      })
      act(() => {
        result.current.createFolder('/copies')
      })
      act(() => {
        result.current.copyFile('/original.lua', '/copies')
      })

      // Act - modify the original
      act(() => {
        result.current.writeFile('/original.lua', 'modified')
      })

      // Assert - copy should not be affected
      expect(result.current.readFile('/original.lua')).toBe('modified')
      expect(result.current.readFile('/copies/original.lua')).toBe('initial')
    })
  })

  describe('copy folder', () => {
    it('should copy empty folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/source')
      })
      act(() => {
        result.current.createFolder('/target')
      })

      // Act
      act(() => {
        result.current.copyFile('/source', '/target')
      })

      // Assert
      expect(result.current.exists('/source')).toBe(true)
      expect(result.current.exists('/target/source')).toBe(true)
      expect(result.current.isDirectory('/target/source')).toBe(true)
    })

    it('should copy folder with files', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/project')
      })
      act(() => {
        result.current.createFile('/project/main.lua', 'main code')
      })
      act(() => {
        result.current.createFile('/project/config.lua', 'config')
      })
      act(() => {
        result.current.createFolder('/backup')
      })

      // Act
      act(() => {
        result.current.copyFile('/project', '/backup')
      })

      // Assert - originals remain
      expect(result.current.exists('/project')).toBe(true)
      expect(result.current.exists('/project/main.lua')).toBe(true)
      expect(result.current.exists('/project/config.lua')).toBe(true)

      // Assert - copies exist
      expect(result.current.exists('/backup/project')).toBe(true)
      expect(result.current.exists('/backup/project/main.lua')).toBe(true)
      expect(result.current.exists('/backup/project/config.lua')).toBe(true)
      expect(result.current.readFile('/backup/project/main.lua')).toBe('main code')
      expect(result.current.readFile('/backup/project/config.lua')).toBe('config')
    })

    it('should copy folder with nested subfolders', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFolder('/src/utils')
      })
      act(() => {
        result.current.createFolder('/src/utils/math')
      })
      act(() => {
        result.current.createFile('/src/main.lua', 'main')
      })
      act(() => {
        result.current.createFile('/src/utils/helper.lua', 'helper')
      })
      act(() => {
        result.current.createFile('/src/utils/math/calc.lua', 'calc')
      })
      act(() => {
        result.current.createFolder('/backup')
      })

      // Act
      act(() => {
        result.current.copyFile('/src', '/backup')
      })

      // Assert - deeply nested structure is preserved
      expect(result.current.exists('/backup/src')).toBe(true)
      expect(result.current.exists('/backup/src/utils')).toBe(true)
      expect(result.current.exists('/backup/src/utils/math')).toBe(true)
      expect(result.current.exists('/backup/src/main.lua')).toBe(true)
      expect(result.current.exists('/backup/src/utils/helper.lua')).toBe(true)
      expect(result.current.exists('/backup/src/utils/math/calc.lua')).toBe(true)

      // Assert - content is preserved
      expect(result.current.readFile('/backup/src/main.lua')).toBe('main')
      expect(result.current.readFile('/backup/src/utils/helper.lua')).toBe('helper')
      expect(result.current.readFile('/backup/src/utils/math/calc.lua')).toBe('calc')
    })

    it('should copy folder to root', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/deep')
      })
      act(() => {
        result.current.createFolder('/deep/nested')
      })
      act(() => {
        result.current.createFile('/deep/nested/file.lua', 'content')
      })

      // Act
      act(() => {
        result.current.copyFile('/deep/nested', '/')
      })

      // Assert
      expect(result.current.exists('/nested')).toBe(true)
      expect(result.current.exists('/nested/file.lua')).toBe(true)
      expect(result.current.readFile('/nested/file.lua')).toBe('content')
    })
  })

  describe('error handling', () => {
    it('should throw when source file does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/target')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.copyFile('/nonexistent.lua', '/target')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when source folder does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/target')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.copyFile('/nonexistent', '/target')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when target folder does not exist', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua', 'content')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.copyFile('/main.lua', '/nonexistent')
        })
      }).toThrow(/not found/i)
    })

    it('should throw when target file already exists', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua', 'original')
      })
      act(() => {
        result.current.createFolder('/target')
      })
      act(() => {
        result.current.createFile('/target/main.lua', 'existing')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.copyFile('/main.lua', '/target')
        })
      }).toThrow(/exists/i)
    })

    it('should throw when target folder already exists with same name', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/source')
      })
      act(() => {
        result.current.createFolder('/target')
      })
      act(() => {
        result.current.createFolder('/target/source')
      })

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.copyFile('/source', '/target')
        })
      }).toThrow(/exists/i)
    })
  })

  describe('edge cases', () => {
    it('should handle copying to root when target exists as file', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/file.lua', 'in src')
      })
      act(() => {
        result.current.createFile('/file.lua', 'at root')
      })

      // Act & Assert - should throw because /file.lua already exists at root
      expect(() => {
        act(() => {
          result.current.copyFile('/src/file.lua', '/')
        })
      }).toThrow(/exists/i)
    })

    it('should copy file with empty content', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/empty.lua', '')
      })
      act(() => {
        result.current.createFolder('/target')
      })

      // Act
      act(() => {
        result.current.copyFile('/empty.lua', '/target')
      })

      // Assert
      expect(result.current.exists('/target/empty.lua')).toBe(true)
      expect(result.current.readFile('/target/empty.lua')).toBe('')
    })

    it('should allow copying file multiple times to different targets', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFile('/main.lua', 'content')
      })
      act(() => {
        result.current.createFolder('/backup1')
      })
      act(() => {
        result.current.createFolder('/backup2')
      })
      act(() => {
        result.current.createFolder('/backup3')
      })

      // Act
      act(() => {
        result.current.copyFile('/main.lua', '/backup1')
      })
      act(() => {
        result.current.copyFile('/main.lua', '/backup2')
      })
      act(() => {
        result.current.copyFile('/main.lua', '/backup3')
      })

      // Assert
      expect(result.current.exists('/main.lua')).toBe(true)
      expect(result.current.exists('/backup1/main.lua')).toBe(true)
      expect(result.current.exists('/backup2/main.lua')).toBe(true)
      expect(result.current.exists('/backup3/main.lua')).toBe(true)
    })

    it('should handle folder with only subfolders (no files)', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/parent')
      })
      act(() => {
        result.current.createFolder('/parent/child1')
      })
      act(() => {
        result.current.createFolder('/parent/child2')
      })
      act(() => {
        result.current.createFolder('/target')
      })

      // Act
      act(() => {
        result.current.copyFile('/parent', '/target')
      })

      // Assert
      expect(result.current.exists('/target/parent')).toBe(true)
      expect(result.current.exists('/target/parent/child1')).toBe(true)
      expect(result.current.exists('/target/parent/child2')).toBe(true)
      expect(result.current.isDirectory('/target/parent/child1')).toBe(true)
      expect(result.current.isDirectory('/target/parent/child2')).toBe(true)
    })

    it('should not copy files outside the source folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileSystem())
      act(() => {
        result.current.createFolder('/src')
      })
      act(() => {
        result.current.createFile('/src/in.lua', 'inside')
      })
      act(() => {
        result.current.createFile('/out.lua', 'outside')
      })
      act(() => {
        result.current.createFolder('/target')
      })

      // Act
      act(() => {
        result.current.copyFile('/src', '/target')
      })

      // Assert - only files inside /src should be copied
      expect(result.current.exists('/target/src/in.lua')).toBe(true)
      expect(result.current.exists('/target/out.lua')).toBe(false)
    })
  })
})
