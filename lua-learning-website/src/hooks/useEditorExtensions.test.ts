import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditorExtensions } from './useEditorExtensions'
import type { EditorReadyInfo } from '../components/CodeEditor/types'
import { useIDEDiagnostics } from './useIDEDiagnostics'
import { useLuaHoverProvider } from './useLuaHoverProvider'
import { useEditorScrollPersistence } from './useEditorScrollPersistence'

// Create mock functions that we can inspect
const mockDiagnosticsHandleEditorReady = vi.fn()
const mockDiagnosticsSetError = vi.fn()
const mockDiagnosticsClearErrors = vi.fn()
const mockHoverHandleEditorReady = vi.fn()
const mockScrollSetEditor = vi.fn()

// Mock the dependencies
vi.mock('./useIDEDiagnostics', () => ({
  useIDEDiagnostics: vi.fn(() => ({
    handleEditorReady: mockDiagnosticsHandleEditorReady,
    setError: mockDiagnosticsSetError,
    clearErrors: mockDiagnosticsClearErrors,
    isCheckingSyntax: false,
  })),
}))

vi.mock('./useLuaHoverProvider', () => ({
  useLuaHoverProvider: vi.fn(() => ({
    handleEditorReady: mockHoverHandleEditorReady,
  })),
}))

vi.mock('./useEditorScrollPersistence', () => ({
  useEditorScrollPersistence: vi.fn(() => ({
    setEditor: mockScrollSetEditor,
  })),
}))

// Create mock editor info
function createMockEditorInfo(path = '/test.lua'): EditorReadyInfo {
  return {
    monaco: {} as EditorReadyInfo['monaco'],
    editor: {
      getModel: vi.fn(() => ({ uri: { path } })),
      getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
      setPosition: vi.fn(),
      revealLine: vi.fn(),
      onDidDispose: vi.fn(),
    } as unknown as EditorReadyInfo['editor'],
    model: {} as EditorReadyInfo['model'],
  }
}

describe('useEditorExtensions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleEditorReady with path parameter', () => {
    it('should accept path as first parameter', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/a.lua')

      // Should not throw when called with path
      expect(() => {
        act(() => {
          result.current.handleEditorReady('/a.lua', mockInfo)
        })
      }).not.toThrow()
    })

    it('should track multiple editors by path', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfoA = createMockEditorInfo('/a.lua')
      const mockInfoB = createMockEditorInfo('/b.lua')

      act(() => {
        result.current.handleEditorReady('/a.lua', mockInfoA)
        result.current.handleEditorReady('/b.lua', mockInfoB)
      })

      // Both editors should be tracked (we can verify via getEditor)
      expect(result.current.getEditor('/a.lua')).toBe(mockInfoA.editor)
      expect(result.current.getEditor('/b.lua')).toBe(mockInfoB.editor)
    })

    it('should return undefined for non-existent editor path', () => {
      const { result } = renderHook(() => useEditorExtensions())

      expect(result.current.getEditor('/nonexistent.lua')).toBeUndefined()
    })

    it('should call diagnostics handleEditorReady with the info', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      expect(mockDiagnosticsHandleEditorReady).toHaveBeenCalledTimes(1)
      expect(mockDiagnosticsHandleEditorReady).toHaveBeenCalledWith(mockInfo)
    })

    it('should call hover handleEditorReady with the info', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      expect(mockHoverHandleEditorReady).toHaveBeenCalledTimes(1)
      expect(mockHoverHandleEditorReady).toHaveBeenCalledWith(mockInfo)
    })

    it('should call scroll persistence setEditor with the editor', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      expect(mockScrollSetEditor).toHaveBeenCalledTimes(1)
      expect(mockScrollSetEditor).toHaveBeenCalledWith(mockInfo.editor)
    })

    it('should store the correct editor reference in the map', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      // The exact editor object should be stored
      const storedEditor = result.current.getEditor('/test.lua')
      expect(storedEditor).toBe(mockInfo.editor)
      expect(storedEditor).not.toBe({}) // Not just any object
    })
  })

  describe('disposeEditor', () => {
    it('should remove editor from tracking when disposed', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      expect(result.current.getEditor('/test.lua')).toBe(mockInfo.editor)

      act(() => {
        result.current.disposeEditor('/test.lua')
      })

      expect(result.current.getEditor('/test.lua')).toBeUndefined()
    })

    it('should be safe to dispose non-existent editor', () => {
      const { result } = renderHook(() => useEditorExtensions())

      expect(() => {
        act(() => {
          result.current.disposeEditor('/nonexistent.lua')
        })
      }).not.toThrow()
    })

    it('should only remove the specified editor, not others', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfoA = createMockEditorInfo('/a.lua')
      const mockInfoB = createMockEditorInfo('/b.lua')

      act(() => {
        result.current.handleEditorReady('/a.lua', mockInfoA)
        result.current.handleEditorReady('/b.lua', mockInfoB)
      })

      act(() => {
        result.current.disposeEditor('/a.lua')
      })

      // A should be gone, B should remain
      expect(result.current.getEditor('/a.lua')).toBeUndefined()
      expect(result.current.getEditor('/b.lua')).toBe(mockInfoB.editor)
    })
  })

  describe('setError with path parameter', () => {
    it('should accept path as first parameter', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      // Should not throw when setting error with path
      expect(() => {
        result.current.setError('/test.lua', 'Error message')
      }).not.toThrow()
    })

    it('should delegate to diagnostics setError with the error message', () => {
      const { result } = renderHook(() => useEditorExtensions())

      result.current.setError('/test.lua', 'Syntax error on line 5')

      expect(mockDiagnosticsSetError).toHaveBeenCalledTimes(1)
      expect(mockDiagnosticsSetError).toHaveBeenCalledWith('Syntax error on line 5')
    })

    it('should pass different error messages correctly', () => {
      const { result } = renderHook(() => useEditorExtensions())

      result.current.setError('/a.lua', 'First error')
      result.current.setError('/b.lua', 'Second error')

      expect(mockDiagnosticsSetError).toHaveBeenCalledTimes(2)
      expect(mockDiagnosticsSetError).toHaveBeenNthCalledWith(1, 'First error')
      expect(mockDiagnosticsSetError).toHaveBeenNthCalledWith(2, 'Second error')
    })
  })

  describe('clearErrors with path parameter', () => {
    it('should accept path as first parameter', () => {
      const { result } = renderHook(() => useEditorExtensions())

      const mockInfo = createMockEditorInfo('/test.lua')

      act(() => {
        result.current.handleEditorReady('/test.lua', mockInfo)
      })

      // Should not throw when clearing errors with path
      expect(() => {
        result.current.clearErrors('/test.lua')
      }).not.toThrow()
    })

    it('should delegate to diagnostics clearErrors', () => {
      const { result } = renderHook(() => useEditorExtensions())

      result.current.clearErrors('/test.lua')

      expect(mockDiagnosticsClearErrors).toHaveBeenCalledTimes(1)
    })

    it('should call clearErrors each time it is invoked', () => {
      const { result } = renderHook(() => useEditorExtensions())

      result.current.clearErrors('/a.lua')
      result.current.clearErrors('/b.lua')
      result.current.clearErrors('/c.lua')

      expect(mockDiagnosticsClearErrors).toHaveBeenCalledTimes(3)
    })
  })

  describe('backward compatibility', () => {
    it('should still provide isCheckingSyntax', () => {
      const { result } = renderHook(() => useEditorExtensions())

      expect(result.current.isCheckingSyntax).toBe(false)
    })
  })

  describe('options handling', () => {
    it('should work with empty options', () => {
      const { result } = renderHook(() => useEditorExtensions({}))

      expect(result.current.handleEditorReady).toBeDefined()
      expect(result.current.getEditor).toBeDefined()
      expect(result.current.disposeEditor).toBeDefined()
    })

    it('should work with no options', () => {
      const { result } = renderHook(() => useEditorExtensions())

      expect(result.current.handleEditorReady).toBeDefined()
    })

    it('should pass code option to useIDEDiagnostics', () => {
      renderHook(() => useEditorExtensions({ code: 'print("hello")' }))

      expect(useIDEDiagnostics).toHaveBeenCalledWith({ code: 'print("hello")' })
    })

    it('should pass currentFilePath to useEditorScrollPersistence', () => {
      renderHook(() => useEditorExtensions({ currentFilePath: '/test.lua' }))

      expect(useEditorScrollPersistence).toHaveBeenCalledWith({ activeTab: '/test.lua' })
    })

    it('should pass null to useEditorScrollPersistence when currentFilePath is undefined', () => {
      renderHook(() => useEditorExtensions({ currentFilePath: undefined }))

      expect(useEditorScrollPersistence).toHaveBeenCalledWith({ activeTab: null })
    })

    it('should pass null to useEditorScrollPersistence when currentFilePath is null', () => {
      renderHook(() => useEditorExtensions({ currentFilePath: null }))

      expect(useEditorScrollPersistence).toHaveBeenCalledWith({ activeTab: null })
    })

    it('should pass currentFilePath to useLuaHoverProvider', () => {
      renderHook(() => useEditorExtensions({ currentFilePath: '/myfile.lua' }))

      expect(useLuaHoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({ currentFilePath: '/myfile.lua' })
      )
    })
  })

  describe('fileSystem option', () => {
    it('should pass undefined fileReader when fileSystem is not provided', () => {
      renderHook(() => useEditorExtensions({}))

      expect(useLuaHoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({ fileReader: undefined })
      )
    })

    it('should pass undefined fileReader when fileSystem is null', () => {
      renderHook(() => useEditorExtensions({ fileSystem: null }))

      expect(useLuaHoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({ fileReader: undefined })
      )
    })

    it('should create fileReader function when fileSystem is provided', () => {
      const mockFileSystem = {
        readFile: vi.fn().mockReturnValue('file content'),
      }

      renderHook(() => useEditorExtensions({ fileSystem: mockFileSystem }))

      // fileReader should be a function, not undefined
      expect(useLuaHoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({ fileReader: expect.any(Function) })
      )
    })

    it('should create fileReader that calls fileSystem.readFile', () => {
      const mockFileSystem = {
        readFile: vi.fn().mockReturnValue('file content'),
      }

      renderHook(() => useEditorExtensions({ fileSystem: mockFileSystem }))

      // Get the fileReader passed to useLuaHoverProvider
      const lastCall = vi.mocked(useLuaHoverProvider).mock.calls.at(-1)
      const fileReader = lastCall?.[0]?.fileReader

      expect(fileReader).toBeDefined()

      // Call the fileReader and verify it delegates to fileSystem
      const result = fileReader!('/some/path.lua')

      expect(mockFileSystem.readFile).toHaveBeenCalledWith('/some/path.lua')
      expect(result).toBe('file content')
    })

    it('should create fileReader that returns null on error', () => {
      const mockFileSystem = {
        readFile: vi.fn().mockImplementation(() => {
          throw new Error('File not found')
        }),
      }

      renderHook(() => useEditorExtensions({ fileSystem: mockFileSystem }))

      // Get the fileReader passed to useLuaHoverProvider
      const lastCall = vi.mocked(useLuaHoverProvider).mock.calls.at(-1)
      const fileReader = lastCall?.[0]?.fileReader

      expect(fileReader).toBeDefined()

      // Call the fileReader - should return null on error
      const result = fileReader!('/nonexistent.lua')

      expect(mockFileSystem.readFile).toHaveBeenCalledWith('/nonexistent.lua')
      expect(result).toBeNull()
    })

    it('should recreate fileReader when fileSystem changes', () => {
      const mockFileSystem1 = {
        readFile: vi.fn().mockReturnValue('content 1'),
      }
      const mockFileSystem2 = {
        readFile: vi.fn().mockReturnValue('content 2'),
      }

      const { rerender } = renderHook(
        ({ fileSystem }) => useEditorExtensions({ fileSystem }),
        { initialProps: { fileSystem: mockFileSystem1 } }
      )

      // Get first fileReader
      const firstCall = vi.mocked(useLuaHoverProvider).mock.calls.at(-1)
      const fileReader1 = firstCall?.[0]?.fileReader

      // Change fileSystem
      rerender({ fileSystem: mockFileSystem2 })

      // Get second fileReader
      const secondCall = vi.mocked(useLuaHoverProvider).mock.calls.at(-1)
      const fileReader2 = secondCall?.[0]?.fileReader

      // Both should be defined
      expect(fileReader1).toBeDefined()
      expect(fileReader2).toBeDefined()

      // They should be different functions (recreated)
      expect(fileReader1).not.toBe(fileReader2)

      // Each should use its respective fileSystem
      fileReader1!('/test.lua')
      expect(mockFileSystem1.readFile).toHaveBeenCalledWith('/test.lua')

      fileReader2!('/test.lua')
      expect(mockFileSystem2.readFile).toHaveBeenCalledWith('/test.lua')
    })
  })

  describe('callback stability', () => {
    it('should maintain stable getEditor reference across renders', () => {
      const { result, rerender } = renderHook(() => useEditorExtensions())

      const getEditor1 = result.current.getEditor

      rerender()

      const getEditor2 = result.current.getEditor

      expect(getEditor1).toBe(getEditor2)
    })

    it('should maintain stable disposeEditor reference across renders', () => {
      const { result, rerender } = renderHook(() => useEditorExtensions())

      const disposeEditor1 = result.current.disposeEditor

      rerender()

      const disposeEditor2 = result.current.disposeEditor

      expect(disposeEditor1).toBe(disposeEditor2)
    })
  })
})
