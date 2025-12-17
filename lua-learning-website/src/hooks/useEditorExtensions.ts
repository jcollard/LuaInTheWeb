import { useCallback, useMemo } from 'react'
import type { EditorReadyInfo } from '../components/CodeEditor/types'
import { useIDEDiagnostics } from './useIDEDiagnostics'
import { useLuaHoverProvider } from './useLuaHoverProvider'
import { useEditorScrollPersistence } from './useEditorScrollPersistence'

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
  const { code, fileSystem, currentFilePath } = options

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
    setError,
    clearErrors,
    isCheckingSyntax,
  } = useIDEDiagnostics({ code })

  // Hover provider for showing Lua documentation on hover
  const { handleEditorReady: handleHoverReady } = useLuaHoverProvider({
    fileReader,
    currentFilePath,
  })

  // Scroll position persistence across tab switches
  const { setEditor } = useEditorScrollPersistence({
    activeTab: currentFilePath ?? null,
    code,
  })

  // Combined editor ready handler for all editor extensions
  const handleEditorReady = useCallback(
    (info: EditorReadyInfo) => {
      handleDiagnosticsReady(info)
      handleHoverReady(info)
      setEditor(info.editor)
    },
    [handleDiagnosticsReady, handleHoverReady, setEditor]
  )

  return {
    handleEditorReady,
    setError,
    clearErrors,
    isCheckingSyntax,
  }
}
