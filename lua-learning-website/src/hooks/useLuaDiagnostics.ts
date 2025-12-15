import { useCallback } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { parseLuaError } from '../utils/luaErrorParser'

/** Unique identifier for Lua diagnostics markers */
const DIAGNOSTICS_OWNER = 'lua-diagnostics'

/** Large column number to highlight entire line */
const END_OF_LINE = 1000

export interface UseLuaDiagnosticsReturn {
  /** Set an error marker in the editor */
  setError: (errorMessage: string) => void
  /** Clear all error markers */
  clearErrors: () => void
}

/**
 * Hook to manage Monaco editor diagnostics/markers for Lua errors
 *
 * @param monaco - Monaco instance (can be null during initial load)
 * @param model - Editor text model (can be null during initial load)
 * @returns Functions to set and clear error markers
 */
export function useLuaDiagnostics(
  monaco: Monaco | null,
  model: editor.ITextModel | null
): UseLuaDiagnosticsReturn {
  const setError = useCallback(
    (errorMessage: string) => {
      if (!monaco || !model) return

      const error = parseLuaError(errorMessage)

      const markers: editor.IMarkerData[] = [
        {
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: END_OF_LINE,
          message: error.message,
          severity: monaco.MarkerSeverity.Error,
        },
      ]

      monaco.editor.setModelMarkers(model, DIAGNOSTICS_OWNER, markers)
    },
    [monaco, model]
  )

  const clearErrors = useCallback(() => {
    if (!monaco || !model) return

    monaco.editor.setModelMarkers(model, DIAGNOSTICS_OWNER, [])
  }, [monaco, model])

  return {
    setError,
    clearErrors,
  }
}
