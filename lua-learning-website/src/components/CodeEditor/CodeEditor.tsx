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

  return (
    <div className={styles.wrapper} data-testid="code-editor-wrapper">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={monacoTheme}
        onChange={(newValue) => onChange(newValue ?? '')}
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
