import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditorCommands } from './useEditorCommands'
import type * as monaco from 'monaco-editor'

// Mock Monaco editor interface
type MockEditor = {
  trigger: ReturnType<typeof vi.fn>
  getModel: ReturnType<typeof vi.fn>
  getSelection: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
}

function createMockEditor(overrides: Partial<MockEditor> = {}): MockEditor {
  return {
    trigger: vi.fn(),
    getModel: vi.fn(() => ({
      canUndo: vi.fn(() => true),
      canRedo: vi.fn(() => true),
    })),
    getSelection: vi.fn(() => ({
      isEmpty: vi.fn(() => false),
    })),
    focus: vi.fn(),
    ...overrides,
  }
}

describe('useEditorCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return editor ref initially null', () => {
      // Arrange & Act
      const { result } = renderHook(() => useEditorCommands())

      // Assert
      expect(result.current.editorRef.current).toBeNull()
    })

    it('should have all commands defined', () => {
      // Arrange & Act
      const { result } = renderHook(() => useEditorCommands())

      // Assert
      expect(result.current.undo).toBeDefined()
      expect(result.current.redo).toBeDefined()
      expect(result.current.cut).toBeDefined()
      expect(result.current.copy).toBeDefined()
      expect(result.current.paste).toBeDefined()
      expect(result.current.selectAll).toBeDefined()
    })

    it('should return disabled state when no editor', () => {
      // Arrange & Act
      const { result } = renderHook(() => useEditorCommands())

      // Assert
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.hasSelection).toBe(false)
    })
  })

  describe('undo command', () => {
    it('should trigger undo on editor', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.undo()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'undo', null)
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should not throw when editor is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorCommands())

      // Act & Assert
      expect(() => result.current.undo()).not.toThrow()
    })
  })

  describe('redo command', () => {
    it('should trigger redo on editor', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.redo()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'redo', null)
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should not throw when editor is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorCommands())

      // Act & Assert
      expect(() => result.current.redo()).not.toThrow()
    })
  })

  describe('cut command', () => {
    it('should trigger cut on editor', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.cut()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.clipboardCutAction', null)
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should not throw when editor is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorCommands())

      // Act & Assert
      expect(() => result.current.cut()).not.toThrow()
    })
  })

  describe('copy command', () => {
    it('should trigger copy on editor', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.copy()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.clipboardCopyAction', null)
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should not throw when editor is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorCommands())

      // Act & Assert
      expect(() => result.current.copy()).not.toThrow()
    })
  })

  describe('paste command', () => {
    it('should trigger paste on editor', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.paste()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.clipboardPasteAction', null)
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should not throw when editor is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorCommands())

      // Act & Assert
      expect(() => result.current.paste()).not.toThrow()
    })
  })

  describe('selectAll command', () => {
    it('should trigger selectAll on editor', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.selectAll()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.selectAll', null)
      expect(mockEditor.focus).toHaveBeenCalled()
    })

    it('should not throw when editor is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorCommands())

      // Act & Assert
      expect(() => result.current.selectAll()).not.toThrow()
    })
  })

  describe('state tracking', () => {
    it('should update canUndo when editor model reports undo available', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => true),
          canRedo: vi.fn(() => false),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.canUndo).toBe(true)
    })

    it('should update canRedo when editor model reports redo available', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => false),
          canRedo: vi.fn(() => true),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.canRedo).toBe(true)
    })

    it('should update hasSelection when editor has non-empty selection', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getSelection: vi.fn(() => ({
          isEmpty: vi.fn(() => false),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.hasSelection).toBe(true)
    })

    it('should return false for hasSelection when selection is empty', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getSelection: vi.fn(() => ({
          isEmpty: vi.fn(() => true),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.hasSelection).toBe(false)
    })

    it('should return false for state when model is null', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => null),
        getSelection: vi.fn(() => null),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.hasSelection).toBe(false)
    })
  })

  describe('hasEditor', () => {
    it('should return false when editor is null', () => {
      // Arrange & Act
      const { result } = renderHook(() => useEditorCommands())

      // Assert
      expect(result.current.hasEditor).toBe(false)
    })

    it('should return true when editor is set', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.hasEditor).toBe(true)
    })
  })

  describe('command action string verification', () => {
    it('should use exact undo action string', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.undo()
      })

      // Assert - verify exact string to kill string mutants
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'undo', null)
      expect(mockEditor.trigger).not.toHaveBeenCalledWith('menu', 'redo', null)
    })

    it('should use exact redo action string', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.redo()
      })

      // Assert - verify exact string to kill string mutants
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'redo', null)
      expect(mockEditor.trigger).not.toHaveBeenCalledWith('menu', 'undo', null)
    })

    it('should use exact cut action string', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.cut()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.clipboardCutAction', null)
      expect(mockEditor.trigger).not.toHaveBeenCalledWith('menu', 'editor.action.clipboardCopyAction', null)
    })

    it('should use exact copy action string', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.copy()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.clipboardCopyAction', null)
      expect(mockEditor.trigger).not.toHaveBeenCalledWith('menu', 'editor.action.clipboardCutAction', null)
    })

    it('should use exact paste action string', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.paste()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.clipboardPasteAction', null)
      expect(mockEditor.trigger).not.toHaveBeenCalledWith('menu', 'editor.action.selectAll', null)
    })

    it('should use exact selectAll action string', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.selectAll()
      })

      // Assert
      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'editor.action.selectAll', null)
      expect(mockEditor.trigger).not.toHaveBeenCalledWith('menu', 'editor.action.clipboardPasteAction', null)
    })
  })

  describe('updateState edge cases', () => {
    it('should reset hasEditor to false when editor is removed', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // First set editor
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })
      expect(result.current.hasEditor).toBe(true)

      // Then remove editor
      act(() => {
        result.current.editorRef.current = null
        result.current.updateState()
      })

      // Assert
      expect(result.current.hasEditor).toBe(false)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.hasSelection).toBe(false)
    })

    it('should correctly report canUndo as false when model.canUndo returns false', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => false),
          canRedo: vi.fn(() => false),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })

    it('should call model.canUndo and model.canRedo methods', () => {
      // Arrange
      const canUndoMock = vi.fn(() => true)
      const canRedoMock = vi.fn(() => true)
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: canUndoMock,
          canRedo: canRedoMock,
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(canUndoMock).toHaveBeenCalled()
      expect(canRedoMock).toHaveBeenCalled()
    })

    it('should call selection.isEmpty method', () => {
      // Arrange
      const isEmptyMock = vi.fn(() => false)
      const mockEditor = createMockEditor({
        getSelection: vi.fn(() => ({
          isEmpty: isEmptyMock,
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(isEmptyMock).toHaveBeenCalled()
    })
  })

  describe('commands do not trigger focus or action when editor is null', () => {
    it('undo should not call focus when editor is null', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.undo()
      })

      // Assert - mock should never have been touched since ref was null
      expect(mockEditor.focus).not.toHaveBeenCalled()
      expect(mockEditor.trigger).not.toHaveBeenCalled()
    })

    it('redo should not call focus when editor is null', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.redo()
      })

      // Assert
      expect(mockEditor.focus).not.toHaveBeenCalled()
      expect(mockEditor.trigger).not.toHaveBeenCalled()
    })

    it('cut should not call focus when editor is null', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.cut()
      })

      // Assert
      expect(mockEditor.focus).not.toHaveBeenCalled()
      expect(mockEditor.trigger).not.toHaveBeenCalled()
    })

    it('copy should not call focus when editor is null', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.copy()
      })

      // Assert
      expect(mockEditor.focus).not.toHaveBeenCalled()
      expect(mockEditor.trigger).not.toHaveBeenCalled()
    })

    it('paste should not call focus when editor is null', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.paste()
      })

      // Assert
      expect(mockEditor.focus).not.toHaveBeenCalled()
      expect(mockEditor.trigger).not.toHaveBeenCalled()
    })

    it('selectAll should not call focus when editor is null', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.selectAll()
      })

      // Assert
      expect(mockEditor.focus).not.toHaveBeenCalled()
      expect(mockEditor.trigger).not.toHaveBeenCalled()
    })
  })

  describe('trigger source parameter', () => {
    it('should pass menu as source for all commands', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
      })

      // Act - call all commands
      act(() => {
        result.current.undo()
        result.current.redo()
        result.current.cut()
        result.current.copy()
        result.current.paste()
        result.current.selectAll()
      })

      // Assert - verify all calls have 'menu' as first arg
      expect(mockEditor.trigger).toHaveBeenCalledTimes(6)
      mockEditor.trigger.mock.calls.forEach((call: unknown[]) => {
        expect(call[0]).toBe('menu')
      })
    })
  })

  describe('state boolean values', () => {
    it('should set canUndo to true when model.canUndo() returns true', () => {
      // Arrange - test that the exact boolean value is passed
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => true),
          canRedo: vi.fn(() => false),
        })),
        getSelection: vi.fn(() => ({
          isEmpty: vi.fn(() => true),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert - verify exact boolean
      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
    })

    it('should set canRedo to true when model.canRedo() returns true', () => {
      // Arrange
      const mockEditor = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => false),
          canRedo: vi.fn(() => true),
        })),
        getSelection: vi.fn(() => ({
          isEmpty: vi.fn(() => true),
        })),
      })
      const { result } = renderHook(() => useEditorCommands())

      // Act
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })

      // Assert
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('should set hasSelection based on negation of isEmpty()', () => {
      // Test isEmpty() returning false -> hasSelection should be true
      const mockEditor1 = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => false),
          canRedo: vi.fn(() => false),
        })),
        getSelection: vi.fn(() => ({
          isEmpty: vi.fn(() => false), // not empty means selection exists
        })),
      })
      const { result: result1 } = renderHook(() => useEditorCommands())

      act(() => {
        result1.current.editorRef.current = mockEditor1 as unknown as monaco.editor.IStandaloneCodeEditor
        result1.current.updateState()
      })

      expect(result1.current.hasSelection).toBe(true)

      // Test isEmpty() returning true -> hasSelection should be false
      const mockEditor2 = createMockEditor({
        getModel: vi.fn(() => ({
          canUndo: vi.fn(() => false),
          canRedo: vi.fn(() => false),
        })),
        getSelection: vi.fn(() => ({
          isEmpty: vi.fn(() => true), // empty means no selection
        })),
      })
      const { result: result2 } = renderHook(() => useEditorCommands())

      act(() => {
        result2.current.editorRef.current = mockEditor2 as unknown as monaco.editor.IStandaloneCodeEditor
        result2.current.updateState()
      })

      expect(result2.current.hasSelection).toBe(false)
    })

    it('should set hasEditor to true only when editor exists', () => {
      // Arrange
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      // Initially false
      expect(result.current.hasEditor).toBe(false)

      // After setting editor
      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.updateState()
      })
      expect(result.current.hasEditor).toBe(true)

      // After clearing editor
      act(() => {
        result.current.editorRef.current = null
        result.current.updateState()
      })
      expect(result.current.hasEditor).toBe(false)
    })
  })

  describe('null argument to trigger', () => {
    it('should pass null as third argument to trigger for undo', () => {
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.undo()
      })

      expect(mockEditor.trigger).toHaveBeenCalledWith('menu', 'undo', null)
      expect(mockEditor.trigger.mock.calls[0][2]).toBeNull()
    })

    it('should pass null as third argument to trigger for redo', () => {
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.redo()
      })

      expect(mockEditor.trigger.mock.calls[0][2]).toBeNull()
    })

    it('should pass null as third argument to trigger for cut', () => {
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.cut()
      })

      expect(mockEditor.trigger.mock.calls[0][2]).toBeNull()
    })

    it('should pass null as third argument to trigger for copy', () => {
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.copy()
      })

      expect(mockEditor.trigger.mock.calls[0][2]).toBeNull()
    })

    it('should pass null as third argument to trigger for paste', () => {
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.paste()
      })

      expect(mockEditor.trigger.mock.calls[0][2]).toBeNull()
    })

    it('should pass null as third argument to trigger for selectAll', () => {
      const mockEditor = createMockEditor()
      const { result } = renderHook(() => useEditorCommands())

      act(() => {
        result.current.editorRef.current = mockEditor as unknown as monaco.editor.IStandaloneCodeEditor
        result.current.selectAll()
      })

      expect(mockEditor.trigger.mock.calls[0][2]).toBeNull()
    })
  })
})
