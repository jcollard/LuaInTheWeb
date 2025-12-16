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
}: CodeEditorProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const formatActionRef = useRef<IDisposable | null>(null)
  const toggleAutoIndentActionRef = useRef<IDisposable | null>(null)
  const onFormatRef = useRef(onFormat)
  const onEditorReadyRef = useRef(onEditorReady)

  // Keep refs up to date
  useEffect(() => {
    onFormatRef.current = onFormat
  }, [onFormat])

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady
  }, [onEditorReady])

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
