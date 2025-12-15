import { useState, useCallback, useEffect } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useLuaDiagnostics } from './useLuaDiagnostics'
import type { EditorReadyInfo } from '../components/CodeEditor/types'

/**
 * Return type for the useIDEDiagnostics hook
 */
export interface UseIDEDiagnosticsReturn {
  /** Callback to be passed to CodeEditor's onEditorReady */
  handleEditorReady: (info: EditorReadyInfo) => void
  /** Set an error marker in the editor */
  setError: (errorMessage: string) => void
  /** Clear all error markers */
  clearErrors: () => void
}

/**
 * Hook to manage Monaco editor diagnostics for the IDE
 *
 * Handles:
 * - Storing Monaco instance and model refs
 * - Clearing errors when switching files (model changes)
 * - Exposing setError/clearErrors on window for shell integration
 *
 * @returns Functions to handle editor ready and manage diagnostics
 */
export function useIDEDiagnostics(): UseIDEDiagnosticsReturn {
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null)
  const [editorModel, setEditorModel] = useState<editor.ITextModel | null>(null)

  // Diagnostics hook for showing Lua errors in editor
  const { setError, clearErrors } = useLuaDiagnostics(monacoInstance, editorModel)

  // Handle editor ready event
  const handleEditorReady = useCallback((info: EditorReadyInfo) => {
    setMonacoInstance(info.monaco)
    setEditorModel(info.model)
  }, [])

  // Clear errors when editor model changes (e.g., switching files)
  useEffect(() => {
    clearErrors()
  }, [editorModel, clearErrors])

  // Expose setError for shell integration (allows shell to set error markers)
  // This is stored on window for testing and shell terminal access
  useEffect(() => {
    const win = window as Window & { __luaSetError?: (msg: string) => void; __luaClearErrors?: () => void }
    win.__luaSetError = setError
    win.__luaClearErrors = clearErrors
    return () => {
      delete win.__luaSetError
      delete win.__luaClearErrors
    }
  }, [setError, clearErrors])

  return {
    handleEditorReady,
    setError,
    clearErrors,
  }
}
