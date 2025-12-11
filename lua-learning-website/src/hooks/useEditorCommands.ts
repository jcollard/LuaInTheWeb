import { useRef, useState, useCallback } from 'react'
import type * as monaco from 'monaco-editor'

interface UseEditorCommandsReturn {
  /** Reference to the Monaco editor instance */
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>
  /** Whether an editor is currently mounted */
  hasEditor: boolean
  /** Whether undo is available */
  canUndo: boolean
  /** Whether redo is available */
  canRedo: boolean
  /** Whether there is a text selection */
  hasSelection: boolean
  /** Undo the last action */
  undo: () => void
  /** Redo the last undone action */
  redo: () => void
  /** Cut selected text */
  cut: () => void
  /** Copy selected text */
  copy: () => void
  /** Paste from clipboard */
  paste: () => void
  /** Select all text */
  selectAll: () => void
  /** Update state from editor (call when editor state might have changed) */
  updateState: () => void
}

/**
 * Hook for interacting with Monaco editor commands
 * Provides edit operations and state tracking for menu integration
 */
export function useEditorCommands(): UseEditorCommandsReturn {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [hasEditor, setHasEditor] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)

  const updateState = useCallback(() => {
    const editor = editorRef.current
    if (!editor) {
      setHasEditor(false)
      setCanUndo(false)
      setCanRedo(false)
      setHasSelection(false)
      return
    }

    setHasEditor(true)

    const model = editor.getModel()
    if (model) {
      setCanUndo(model.canUndo())
      setCanRedo(model.canRedo())
    } else {
      setCanUndo(false)
      setCanRedo(false)
    }

    const selection = editor.getSelection()
    if (selection) {
      setHasSelection(!selection.isEmpty())
    } else {
      setHasSelection(false)
    }
  }, [])

  const undo = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('menu', 'undo', null)
    editor.focus()
  }, [])

  const redo = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('menu', 'redo', null)
    editor.focus()
  }, [])

  const cut = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('menu', 'editor.action.clipboardCutAction', null)
    editor.focus()
  }, [])

  const copy = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('menu', 'editor.action.clipboardCopyAction', null)
    editor.focus()
  }, [])

  const paste = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('menu', 'editor.action.clipboardPasteAction', null)
    editor.focus()
  }, [])

  const selectAll = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.trigger('menu', 'editor.action.selectAll', null)
    editor.focus()
  }, [])

  return {
    editorRef,
    hasEditor,
    canUndo,
    canRedo,
    hasSelection,
    undo,
    redo,
    cut,
    copy,
    paste,
    selectAll,
    updateState,
  }
}
