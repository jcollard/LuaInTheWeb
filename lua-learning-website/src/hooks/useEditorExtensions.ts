import { useCallback } from 'react'
import type { EditorReadyInfo } from '../components/CodeEditor/types'
import { useIDEDiagnostics } from './useIDEDiagnostics'
import { useLuaHoverProvider } from './useLuaHoverProvider'

/**
 * Options for the useEditorExtensions hook
 */
export interface UseEditorExtensionsOptions {
  /** Current code in the editor - used for real-time syntax checking */
  code?: string
}

/**
 * Return type for the useEditorExtensions hook
 */
export interface UseEditorExtensionsReturn {
  /** Combined callback to be passed to CodeEditor's onEditorReady */
  handleEditorReady: (info: EditorReadyInfo) => void
  /** Set an error marker in the editor (for execution errors) */
  setError: (errorMessage: string) => void
  /** Clear all error markers */
  clearErrors: () => void
  /** Whether syntax checking is in progress */
  isCheckingSyntax: boolean
}

/**
 * Hook that combines all editor extensions (diagnostics, hover documentation)
 * into a single handleEditorReady callback
 *
 * @param options - Configuration options
 * @returns Combined handler and diagnostics functions
 */
export function useEditorExtensions(
  options: UseEditorExtensionsOptions = {}
): UseEditorExtensionsReturn {
  // Diagnostics for showing Lua errors in editor (including real-time syntax checking)
  const {
    handleEditorReady: handleDiagnosticsReady,
    setError,
    clearErrors,
    isCheckingSyntax,
  } = useIDEDiagnostics(options)

  // Hover provider for showing Lua documentation on hover
  const { handleEditorReady: handleHoverReady } = useLuaHoverProvider()

  // Combined editor ready handler for all editor extensions
  const handleEditorReady = useCallback(
    (info: EditorReadyInfo) => {
      handleDiagnosticsReady(info)
      handleHoverReady(info)
    },
    [handleDiagnosticsReady, handleHoverReady]
  )

  return {
    handleEditorReady,
    setError,
    clearErrors,
    isCheckingSyntax,
  }
}
