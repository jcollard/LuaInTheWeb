import Editor, { type OnMount, type BeforeMount, type Monaco } from '@monaco-editor/react'
import { useCallback, useRef, useEffect } from 'react'
import type { CodeEditorProps } from './types'
import styles from './CodeEditor.module.css'
import { useTheme } from '../../contexts/useTheme'
import type { editor, IDisposable } from 'monaco-editor'
import {
  getAutoIndentEnabled,
  registerLuaLanguage,
  setAutoIndentEnabled,
} from '../../utils/luaTokenizer'

// How many recently-emitted values we remember for stale-echo detection.
// In a minimal scenario (single file, no autosave) the drift maxes out around
// 4 keystrokes; with more state churn per keystroke (many tabs, autosave,
// large files) it gets deeper. 32 covers comfortably wider bursts without
// the per-tab memory of a much larger buffer. Each entry is a full snapshot
// of the model, so the limit also caps memory cost.
// False-positive risk from this size is small because `isStaleValueSync`
// also requires `edit.forceMoveMarkers === true`, which only the
// @monaco-editor/react value-sync emits in this codebase.
const EMISSION_HISTORY_LIMIT = 32

/**
 * True iff the given edit is the signature of @monaco-editor/react's value-sync
 * useEffect firing with a stale value (React state lagging behind Monaco's
 * local model during rapid typing). Suppressing such edits prevents the cursor
 * from jumping to end-of-file.
 *
 * Detection requires ALL of:
 *   - source === '' — the wrapper's executeEdits call uses an empty source;
 *     Monaco's own paths (typing, paste, format) use a non-empty source.
 *   - exactly one edit covering the full model range — partial edits are real.
 *   - edit.forceMoveMarkers === true — the wrapper's call sets this; nothing
 *     else in this codebase does.
 *   - text was recently emitted via our onChange — proves the editor has
 *     already moved past this snapshot, so the sync would corrupt user state.
 *   - text !== current model value — a no-op sync is harmless to pass through.
 */
function isStaleValueSync(
  source: string | null | undefined,
  edits: editor.IIdentifiedSingleEditOperation[],
  model: editor.ITextModel,
  emittedHistory: ReadonlySet<string>,
): boolean {
  if (source !== '' || edits.length !== 1) return false
  const edit = edits[0]
  if (edit.forceMoveMarkers !== true) return false
  if (typeof edit.text !== 'string') return false
  if (!emittedHistory.has(edit.text)) return false
  if (edit.text === model.getValue()) return false
  const fullRange = model.getFullModelRange()
  return !!edit.range
    && edit.range.startLineNumber === fullRange.startLineNumber
    && edit.range.startColumn === fullRange.startColumn
    && edit.range.endLineNumber === fullRange.endLineNumber
    && edit.range.endColumn === fullRange.endColumn
}

/**
 * Wrap editor.executeEdits to drop the @monaco-editor/react value-sync's
 * stale rewinds. See {@link isStaleValueSync} for the detection rule and
 * the cursor-jump bug it prevents.
 */
function patchExecuteEditsForStaleSync(
  editorInstance: editor.IStandaloneCodeEditor,
  emittedHistoryRef: { current: ReadonlySet<string> },
): void {
  const original = editorInstance.executeEdits.bind(editorInstance)
  editorInstance.executeEdits = (source, edits, endCursorState) => {
    const model = editorInstance.getModel()
    if (model && isStaleValueSync(source, edits, model, emittedHistoryRef.current)) {
      return true
    }
    return original(source, edits, endCursorState)
  }
}

/**
 * A code editor component wrapping Monaco Editor
 */
export function CodeEditor({
  value,
  onChange,
  language = 'lua',
  height = '400px',
  readOnly = false,
  onFormat,
  onEditorReady,
  autoSaveEnabled = false,
  onToggleAutoSave,
  onSaveAllFiles,
}: CodeEditorProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  // Recently-emitted values from our onChange. Used to detect stale-echo renders:
  // when the parent re-renders with a value we've already emitted *and* the
  // editor has since moved on, the @monaco-editor/react value-sync would call
  // executeEdits(forceMoveMarkers:true), jumping the cursor to end of file.
  // We detect that case below and pass the editor's current value instead, so
  // the wrapper sees no change.
  const emittedHistoryRef = useRef<Set<string>>(new Set([value]))
  const formatActionRef = useRef<IDisposable | null>(null)
  const toggleAutoIndentActionRef = useRef<IDisposable | null>(null)
  const toggleAutoSaveActionRef = useRef<IDisposable | null>(null)
  const saveAllFilesActionRef = useRef<IDisposable | null>(null)
  const onFormatRef = useRef(onFormat)
  const onEditorReadyRef = useRef(onEditorReady)
  const onToggleAutoSaveRef = useRef(onToggleAutoSave)
  const onSaveAllFilesRef = useRef(onSaveAllFiles)
  const autoSaveEnabledRef = useRef(autoSaveEnabled)

  // Keep refs up to date
  useEffect(() => {
    onFormatRef.current = onFormat
  }, [onFormat])

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady
  }, [onEditorReady])

  useEffect(() => {
    onToggleAutoSaveRef.current = onToggleAutoSave
  }, [onToggleAutoSave])

  useEffect(() => {
    onSaveAllFilesRef.current = onSaveAllFiles
  }, [onSaveAllFiles])

  useEffect(() => {
    autoSaveEnabledRef.current = autoSaveEnabled
  }, [autoSaveEnabled])

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // Store monaco reference for later use
    monacoRef.current = monaco
    // Register enhanced Lua syntax highlighting
    registerLuaLanguage(monaco)
  }, [])

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance
    patchExecuteEditsForStaleSync(editorInstance, emittedHistoryRef)

    // Register format action with keyboard shortcut (Shift+Alt+F)
    formatActionRef.current = editorInstance.addAction({
      id: 'format-lua-code',
      label: 'Format Lua Code',
      keybindings: [
        (window.monaco?.KeyMod.Shift || 0) |
        (window.monaco?.KeyMod.Alt || 0) |
        (window.monaco?.KeyCode.KeyF || 0),
      ],
      run: () => {
        onFormatRef.current?.()
      },
    })

    // Helper to register auto-indent action with current state label
    const registerAutoIndentAction = () => {
      const isEnabled = getAutoIndentEnabled()
      const label = isEnabled ? 'Turn Off Auto-Indent' : 'Turn On Auto-Indent'

      return editorInstance.addAction({
        id: 'toggle-auto-indent',
        label,
        run: () => {
          setAutoIndentEnabled(!isEnabled)
          // Re-register with updated label
          toggleAutoIndentActionRef.current?.dispose()
          toggleAutoIndentActionRef.current = registerAutoIndentAction()
        },
      })
    }

    // Register auto-indent toggle action (accessible via Command Palette)
    toggleAutoIndentActionRef.current = registerAutoIndentAction()

    // Helper to register auto-save toggle action with current state label
    const registerAutoSaveAction = () => {
      const isEnabled = autoSaveEnabledRef.current
      const label = isEnabled ? 'Turn Off Auto-Save' : 'Turn On Auto-Save'

      return editorInstance.addAction({
        id: 'toggle-auto-save',
        label,
        run: () => {
          onToggleAutoSaveRef.current?.()
          // Re-register with updated label after a short delay to allow state to update
          setTimeout(() => {
            toggleAutoSaveActionRef.current?.dispose()
            toggleAutoSaveActionRef.current = registerAutoSaveAction()
          }, 0)
        },
      })
    }

    // Register auto-save toggle action (accessible via Command Palette)
    toggleAutoSaveActionRef.current = registerAutoSaveAction()

    // Register "Save All Files" action with keyboard shortcut (Ctrl+Shift+S)
    saveAllFilesActionRef.current = editorInstance.addAction({
      id: 'save-all-files',
      label: 'Save All Files',
      keybindings: [
        (window.monaco?.KeyMod.CtrlCmd || 0) |
        (window.monaco?.KeyMod.Shift || 0) |
        (window.monaco?.KeyCode.KeyS || 0),
      ],
      run: () => {
        onSaveAllFilesRef.current?.()
      },
    })

    // Notify parent component that editor is ready
    const model = editorInstance.getModel()
    if (monacoRef.current && model) {
      onEditorReadyRef.current?.({
        monaco: monacoRef.current,
        editor: editorInstance,
        model,
      })
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      formatActionRef.current?.dispose()
      toggleAutoIndentActionRef.current?.dispose()
      toggleAutoSaveActionRef.current?.dispose()
      saveAllFilesActionRef.current?.dispose()
    }
  }, [])

  const handleInternalChange = useCallback((newValue: string | undefined) => {
    const next = newValue ?? ''
    if (emittedHistoryRef.current.size >= EMISSION_HISTORY_LIMIT) {
      const oldest = emittedHistoryRef.current.values().next().value
      if (oldest !== undefined) emittedHistoryRef.current.delete(oldest)
    }
    emittedHistoryRef.current.add(next)
    onChange(next)
  }, [onChange])

  return (
    <div className={styles.wrapper} data-testid="code-editor-wrapper">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={monacoTheme}
        onChange={handleInternalChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnType: true, // Enable auto-dedent for end/else/elseif/until
          quickSuggestions: false, // Only show autocomplete on Ctrl+Space
          suggestOnTriggerCharacters: false, // Don't auto-suggest on '.' etc.
        }}
        loading={<div className={styles.loading}>Loading editor...</div>}
      />
    </div>
  )
}
