import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { useRecentFiles } from './useRecentFiles'

describe('useRecentFiles', () => {
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
    it('should initialize with empty recent files list', () => {
      // Arrange & Act
      const { result } = renderHook(() => useRecentFiles())

      // Assert
      expect(result.current.recentFiles).toEqual([])
    })

    it('should load recent files from localStorage on init', () => {
      // Arrange
      const savedFiles = [
        { path: '/main.lua', name: 'main.lua', accessedAt: 1000 },
        { path: '/utils.lua', name: 'utils.lua', accessedAt: 900 },
      ]
      localStorageMock.setItem('lua-ide-recent-files', JSON.stringify(savedFiles))

      // Act
      const { result } = renderHook(() => useRecentFiles())

      // Assert
      expect(result.current.recentFiles).toHaveLength(2)
      expect(result.current.recentFiles[0].path).toBe('/main.lua')
    })

    it('should handle corrupted localStorage gracefully', () => {
      // Arrange
      localStorageMock.getItem.mockReturnValue('not valid json{{{')

      // Act & Assert
      expect(() => {
        renderHook(() => useRecentFiles())
      }).not.toThrow()
    })

    it('should handle non-array localStorage data gracefully', () => {
      // Arrange
      localStorageMock.setItem('lua-ide-recent-files', JSON.stringify({ invalid: true }))

      // Act
      const { result } = renderHook(() => useRecentFiles())

      // Assert
      expect(result.current.recentFiles).toEqual([])
    })
  })

  describe('addRecentFile', () => {
    it('should add file to recent list', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())

      // Act
      act(() => {
        result.current.addRecentFile('/main.lua')
      })

      // Assert
      expect(result.current.recentFiles).toHaveLength(1)
      expect(result.current.recentFiles[0].path).toBe('/main.lua')
      expect(result.current.recentFiles[0].name).toBe('main.lua')
    })

    it('should move existing file to top when re-added', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())
      act(() => {
        result.current.addRecentFile('/first.lua')
      })
      act(() => {
        result.current.addRecentFile('/second.lua')
      })

      // Act
      act(() => {
        result.current.addRecentFile('/first.lua')
      })

      // Assert
      expect(result.current.recentFiles).toHaveLength(2)
      expect(result.current.recentFiles[0].path).toBe('/first.lua')
      expect(result.current.recentFiles[1].path).toBe('/second.lua')
    })

    it('should limit recent files to maximum of 10', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())

      // Act - add 12 files
      act(() => {
        for (let i = 0; i < 12; i++) {
          result.current.addRecentFile(`/file${i}.lua`)
        }
      })

      // Assert
      expect(result.current.recentFiles).toHaveLength(10)
      // Most recent should be first
      expect(result.current.recentFiles[0].path).toBe('/file11.lua')
      // Oldest should be dropped
      expect(result.current.recentFiles.find(f => f.path === '/file0.lua')).toBeUndefined()
    })

    it('should extract file name from path', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())

      // Act
      act(() => {
        result.current.addRecentFile('/path/to/deep/file.lua')
      })

      // Assert
      expect(result.current.recentFiles[0].name).toBe('file.lua')
    })

    it('should set accessedAt timestamp', () => {
      // Arrange
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      const { result } = renderHook(() => useRecentFiles())

      // Act
      act(() => {
        result.current.addRecentFile('/main.lua')
      })

      // Assert
      expect(result.current.recentFiles[0].accessedAt).toBe(now)
    })
  })

  describe('removeRecentFile', () => {
    it('should remove file from recent list', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())
      act(() => {
        result.current.addRecentFile('/main.lua')
        result.current.addRecentFile('/utils.lua')
      })

      // Act
      act(() => {
        result.current.removeRecentFile('/main.lua')
      })

      // Assert
      expect(result.current.recentFiles).toHaveLength(1)
      expect(result.current.recentFiles[0].path).toBe('/utils.lua')
    })

    it('should do nothing when removing non-existent file', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())
      act(() => {
        result.current.addRecentFile('/main.lua')
      })

      // Act
      act(() => {
        result.current.removeRecentFile('/nonexistent.lua')
      })

      // Assert
      expect(result.current.recentFiles).toHaveLength(1)
    })
  })

  describe('clearRecentFiles', () => {
    it('should clear all recent files', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())
      act(() => {
        result.current.addRecentFile('/main.lua')
        result.current.addRecentFile('/utils.lua')
      })

      // Act
      act(() => {
        result.current.clearRecentFiles()
      })

      // Assert
      expect(result.current.recentFiles).toEqual([])
    })
  })

  describe('persistence', () => {
    it('should persist to localStorage when adding file', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())

      // Act
      act(() => {
        result.current.addRecentFile('/main.lua')
      })

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lua-ide-recent-files',
        expect.any(String)
      )
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData[0].path).toBe('/main.lua')
    })

    it('should persist to localStorage when removing file', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())
      act(() => {
        result.current.addRecentFile('/main.lua')
        result.current.addRecentFile('/utils.lua')
      })

      // Act
      act(() => {
        result.current.removeRecentFile('/main.lua')
      })

      // Assert
      const lastCall = localStorageMock.setItem.mock.calls.slice(-1)[0]
      const savedData = JSON.parse(lastCall[1])
      expect(savedData).toHaveLength(1)
      expect(savedData[0].path).toBe('/utils.lua')
    })

    it('should persist to localStorage when clearing files', () => {
      // Arrange
      const { result } = renderHook(() => useRecentFiles())
      act(() => {
        result.current.addRecentFile('/main.lua')
      })

      // Act
      act(() => {
        result.current.clearRecentFiles()
      })

      // Assert
      const lastCall = localStorageMock.setItem.mock.calls.slice(-1)[0]
      const savedData = JSON.parse(lastCall[1])
      expect(savedData).toEqual([])
    })
  })
})
