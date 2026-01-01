import { useCallback, useMemo, useRef } from 'react'
import type { EditorReadyInfo } from '../components/CodeEditor/types'
import { useIDEDiagnostics } from './useIDEDiagnostics'
import { useLuaHoverProvider } from './useLuaHoverProvider'

/** Monaco editor instance type */
type MonacoEditor = EditorReadyInfo['editor']

/** Minimal filesystem interface for reading files */
interface FileSystemReader {
  readFile(path: string): string
}

/**
 * Options for the useEditorExtensions hook
 */
export interface UseEditorExtensionsOptions {
  /** Current code in the editor - used for real-time syntax checking */
  code?: string
  /** Filesystem for reading module files (for hover docs on required modules) */
  fileSystem?: FileSystemReader | null
  /** Absolute path to the current file being edited */
  currentFilePath?: string | null
}

/**
 * Return type for the useEditorExtensions hook
 */
export interface UseEditorExtensionsReturn {
  /** Combined callback to be passed to CodeEditor's onEditorReady (with path) */
  handleEditorReady: (path: string, info: EditorReadyInfo) => void
  /** Get an editor instance by path */
  getEditor: (path: string) => MonacoEditor | undefined
  /** Dispose an editor (remove from tracking) */
  disposeEditor: (path: string) => void
  /** Set an error marker in the editor (for execution errors) */
  setError: (path: string, errorMessage: string) => void
  /** Clear all error markers */
  clearErrors: (path: string) => void
  /** Whether syntax checking is in progress */
  isCheckingSyntax: boolean
}

/**
 * Hook that combines all editor extensions (diagnostics, hover documentation)
 * into a single handleEditorReady callback. Tracks multiple editors by path.
 *
 * @param options - Configuration options
 * @returns Combined handler and diagnostics functions
 */
export function useEditorExtensions(
  options: UseEditorExtensionsOptions = {}
): UseEditorExtensionsReturn {
  const { code, fileSystem, currentFilePath } = options

  // Map of path -> editor instance
  const editorsRef = useRef<Map<string, MonacoEditor>>(new Map())

  // Create fileReader from fileSystem
  const fileReader = useMemo(() => {
    if (!fileSystem) return undefined
    return (path: string): string | null => {
      try {
        return fileSystem.readFile(path)
      } catch {
        return null
      }
    }
  }, [fileSystem])

  // Diagnostics for showing Lua errors in editor (including real-time syntax checking)
  const {
    handleEditorReady: handleDiagnosticsReady,
    setError: setDiagnosticsError,
    clearErrors: clearDiagnosticsErrors,
    isCheckingSyntax,
  } = useIDEDiagnostics({ code })

  // Hover provider for showing Lua documentation on hover
  const { handleEditorReady: handleHoverReady } = useLuaHoverProvider({
    fileReader,
    currentFilePath,
  })

  // Note: Scroll persistence is now handled internally by each CodeEditor component

  // Get an editor by path
  const getEditor = useCallback((path: string): MonacoEditor | undefined => {
    return editorsRef.current.get(path)
  }, [])

  // Dispose an editor (remove from tracking)
  const disposeEditor = useCallback((path: string): void => {
    editorsRef.current.delete(path)
  }, [])

  // Set error on a specific editor
  const setError = useCallback(
    (_path: string, errorMessage: string): void => {
      // For now, delegate to the single diagnostics handler
      // In the future, we could target specific editors
      setDiagnosticsError(errorMessage)
    },
    [setDiagnosticsError]
  )

  // Clear errors on a specific editor
  const clearErrors = useCallback(
    (_path: string): void => {
      // For now, delegate to the single diagnostics handler
      clearDiagnosticsErrors()
    },
    [clearDiagnosticsErrors]
  )

  // Combined editor ready handler for all editor extensions
  const handleEditorReady = useCallback(
    (path: string, info: EditorReadyInfo) => {
      // Store editor reference by path
      editorsRef.current.set(path, info.editor)

      // Initialize diagnostics
      handleDiagnosticsReady(info)

      // Initialize hover provider
      handleHoverReady(info)

      // Note: Scroll persistence is now handled internally by CodeEditor
    },
    [handleDiagnosticsReady, handleHoverReady]
  )

  return {
    handleEditorReady,
    getEditor,
    disposeEditor,
    setError,
    clearErrors,
    isCheckingSyntax,
  }
}
