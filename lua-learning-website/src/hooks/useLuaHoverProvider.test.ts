import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLuaHoverProvider } from './useLuaHoverProvider'
import type { Monaco } from '@monaco-editor/react'
import type { editor, IDisposable, languages, Position, CancellationToken } from 'monaco-editor'

// Mock Monaco types
interface MockModel {
  getWordAtPosition: ReturnType<typeof vi.fn>
  getValueInRange: ReturnType<typeof vi.fn>
  getLineContent: ReturnType<typeof vi.fn>
  getValue: ReturnType<typeof vi.fn>
}

interface MockHoverProvider {
  provideHover: (
    model: editor.ITextModel,
    position: Position,
    token: CancellationToken
  ) => languages.ProviderResult<languages.Hover>
}

describe('useLuaHoverProvider', () => {
  let mockMonaco: Partial<Monaco>
  let mockModel: MockModel
  let mockEditor: Partial<editor.IStandaloneCodeEditor>
  let registeredProvider: MockHoverProvider | null = null
  let mockDisposable: IDisposable

  beforeEach(() => {
    registeredProvider = null
    mockDisposable = { dispose: vi.fn() }

    mockModel = {
      getWordAtPosition: vi.fn(),
      getValueInRange: vi.fn(),
      getLineContent: vi.fn(),
      getValue: vi.fn().mockReturnValue(''),
    }

    mockEditor = {
      getModel: vi.fn(() => mockModel as unknown as editor.ITextModel),
    }

    mockMonaco = {
      languages: {
        registerHoverProvider: vi.fn((_language: string, provider: MockHoverProvider) => {
          registeredProvider = provider
          return mockDisposable
        }),
      } as unknown as typeof languages,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('does not register provider until editor is ready', () => {
      renderHook(() => useLuaHoverProvider())

      expect(mockMonaco.languages?.registerHoverProvider).not.toHaveBeenCalled()
    })

    it('registers hover provider when editor becomes ready', () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      expect(mockMonaco.languages?.registerHoverProvider).toHaveBeenCalledWith(
        'lua',
        expect.any(Object)
      )
    })

    it('disposes provider on unmount', () => {
      const { result, unmount } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      unmount()

      expect(mockDisposable.dispose).toHaveBeenCalled()
    })
  })

  describe('hover provider', () => {
    it('returns documentation for global functions like print', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({ word: 'print', startColumn: 1, endColumn: 6 })
      mockModel.getLineContent.mockReturnValue('print("hello")')

      const mockPosition = { lineNumber: 1, column: 3 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
      expect(hover?.contents).toBeDefined()
      expect(hover?.contents.length).toBeGreaterThan(0)
    })

    it('returns documentation for library functions like string.sub', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      // For qualified names, getWordAtPosition returns just "sub"
      mockModel.getWordAtPosition.mockReturnValue({ word: 'sub', startColumn: 8, endColumn: 11 })
      mockModel.getLineContent.mockReturnValue('string.sub(s, 1, 3)')
      mockModel.getValueInRange.mockReturnValue('string')

      const mockPosition = { lineNumber: 1, column: 10 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
      expect(hover?.contents).toBeDefined()
    })

    it('returns null for unknown identifiers', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({
        word: 'myCustomFunction',
        startColumn: 1,
        endColumn: 17,
      })
      mockModel.getLineContent.mockReturnValue('myCustomFunction()')

      const mockPosition = { lineNumber: 1, column: 5 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).toBeNull()
    })

    it('returns null when no word at position', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue(null)

      const mockPosition = { lineNumber: 1, column: 1 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).toBeNull()
    })

    it('includes signature in hover content', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({ word: 'print', startColumn: 1, endColumn: 6 })
      mockModel.getLineContent.mockReturnValue('print("hello")')

      const mockPosition = { lineNumber: 1, column: 3 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      const content = hover?.contents[0]
      expect(content).toBeDefined()
      // Content should be markdown with signature
      if (typeof content === 'object' && 'value' in content) {
        expect(content.value).toContain('print')
      }
    })

    it('includes description in hover content', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({ word: 'type', startColumn: 1, endColumn: 5 })
      mockModel.getLineContent.mockReturnValue('type(x)')

      const mockPosition = { lineNumber: 1, column: 3 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      const content = hover?.contents[0]
      expect(content).toBeDefined()
      if (typeof content === 'object' && 'value' in content) {
        // Should contain description about returning type
        expect(content.value.toLowerCase()).toContain('type')
      }
    })

    it('sets correct range for hover', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({ word: 'print', startColumn: 1, endColumn: 6 })
      mockModel.getLineContent.mockReturnValue('print("hello")')

      const mockPosition = { lineNumber: 1, column: 3 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover?.range).toBeDefined()
      expect(hover?.range?.startLineNumber).toBe(1)
      expect(hover?.range?.startColumn).toBe(1)
      expect(hover?.range?.endColumn).toBe(6)
    })
  })

  describe('qualified name detection', () => {
    it('detects string.sub when hovering over sub', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      // Word is "sub", but we need to detect "string.sub"
      mockModel.getWordAtPosition.mockReturnValue({ word: 'sub', startColumn: 8, endColumn: 11 })
      mockModel.getLineContent.mockReturnValue('string.sub(s, 1, 3)')
      // When checking for prefix, return "string"
      mockModel.getValueInRange.mockReturnValue('string')

      const mockPosition = { lineNumber: 1, column: 10 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
      // Should get string.sub documentation
      const content = hover?.contents[0]
      if (typeof content === 'object' && 'value' in content) {
        expect(content.value).toContain('string.sub')
      }
    })

    it('detects table.insert when hovering over insert', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({
        word: 'insert',
        startColumn: 7,
        endColumn: 13,
      })
      mockModel.getLineContent.mockReturnValue('table.insert(t, v)')
      mockModel.getValueInRange.mockReturnValue('table')

      const mockPosition = { lineNumber: 1, column: 10 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
    })

    it('detects math.floor when hovering over floor', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      mockModel.getWordAtPosition.mockReturnValue({ word: 'floor', startColumn: 6, endColumn: 11 })
      mockModel.getLineContent.mockReturnValue('math.floor(x)')
      mockModel.getValueInRange.mockReturnValue('math')

      const mockPosition = { lineNumber: 1, column: 8 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
    })
  })

  describe('library documentation via require', () => {
    it('returns documentation for shell.clear when shell is required', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      // Simulate code with require statement
      const code = `local shell = require('shell')
shell.clear()`
      mockModel.getValue.mockReturnValue(code)
      mockModel.getWordAtPosition.mockReturnValue({ word: 'clear', startColumn: 7, endColumn: 12 })
      mockModel.getLineContent.mockReturnValue('shell.clear()')

      const mockPosition = { lineNumber: 2, column: 9 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
      expect(hover?.contents).toBeDefined()
      const content = hover?.contents[0]
      if (typeof content === 'object' && 'value' in content) {
        expect(content.value).toContain('shell.clear')
        expect(content.value.toLowerCase()).toContain('clear')
      }
    })

    it('returns documentation for shell.foreground with parameters', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      const code = `local shell = require('shell')
shell.foreground(shell.RED)`
      mockModel.getValue.mockReturnValue(code)
      mockModel.getWordAtPosition.mockReturnValue({
        word: 'foreground',
        startColumn: 7,
        endColumn: 17,
      })
      mockModel.getLineContent.mockReturnValue('shell.foreground(shell.RED)')

      const mockPosition = { lineNumber: 2, column: 10 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
      const content = hover?.contents[0]
      if (typeof content === 'object' && 'value' in content) {
        expect(content.value).toContain('shell.foreground')
        expect(content.value.toLowerCase()).toContain('color')
      }
    })

    // Note: Color constants are defined with @field annotations which are
    // not currently parsed. This is documented as a future enhancement.
    it('returns null for shell color constants (not parsed yet)', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      const code = `local shell = require('shell')
print(shell.RED)`
      mockModel.getValue.mockReturnValue(code)
      mockModel.getWordAtPosition.mockReturnValue({ word: 'RED', startColumn: 13, endColumn: 16 })
      mockModel.getLineContent.mockReturnValue('print(shell.RED)')

      const mockPosition = { lineNumber: 2, column: 14 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      // @field annotations are out of scope for initial unification
      expect(hover).toBeNull()
    })

    it('works with aliased require (local sh = require("shell"))', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      const code = `local sh = require('shell')
sh.reset()`
      mockModel.getValue.mockReturnValue(code)
      mockModel.getWordAtPosition.mockReturnValue({ word: 'reset', startColumn: 4, endColumn: 9 })
      mockModel.getLineContent.mockReturnValue('sh.reset()')

      const mockPosition = { lineNumber: 2, column: 6 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).not.toBeNull()
      const content = hover?.contents[0]
      if (typeof content === 'object' && 'value' in content) {
        expect(content.value).toContain('shell.reset')
      }
    })

    it('returns null for unknown library members', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      const code = `local shell = require('shell')
shell.unknownFunction()`
      mockModel.getValue.mockReturnValue(code)
      mockModel.getWordAtPosition.mockReturnValue({
        word: 'unknownFunction',
        startColumn: 7,
        endColumn: 22,
      })
      mockModel.getLineContent.mockReturnValue('shell.unknownFunction()')

      const mockPosition = { lineNumber: 2, column: 12 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      expect(hover).toBeNull()
    })

    it('does not confuse local variables with libraries', async () => {
      const { result } = renderHook(() => useLuaHoverProvider())

      act(() => {
        result.current.handleEditorReady({
          monaco: mockMonaco as Monaco,
          editor: mockEditor as editor.IStandaloneCodeEditor,
          model: mockModel as unknown as editor.ITextModel,
        })
      })

      // No require statement, so mylib.clear should not get shell docs
      const code = `local mylib = {}
mylib.clear()`
      mockModel.getValue.mockReturnValue(code)
      mockModel.getWordAtPosition.mockReturnValue({ word: 'clear', startColumn: 7, endColumn: 12 })
      mockModel.getLineContent.mockReturnValue('mylib.clear()')

      const mockPosition = { lineNumber: 2, column: 9 } as Position
      const mockToken = { isCancellationRequested: false } as CancellationToken

      const hover = await registeredProvider?.provideHover(
        mockModel as unknown as editor.ITextModel,
        mockPosition,
        mockToken
      )

      // Should return null since mylib is not a require'd library
      expect(hover).toBeNull()
    })
  })
})
