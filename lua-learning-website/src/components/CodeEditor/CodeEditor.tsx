import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react'
import { useCallback, useRef, useEffect } from 'react'
import type { CodeEditorProps } from './types'
import styles from './CodeEditor.module.css'
import { useTheme } from '../../contexts/useTheme'
import type { editor, IDisposable } from 'monaco-editor'
import { registerLuaLanguage } from '../../utils/luaTokenizer'

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
}: CodeEditorProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const formatActionRef = useRef<IDisposable | null>(null)
  const onFormatRef = useRef(onFormat)

  // Keep ref up to date
  useEffect(() => {
    onFormatRef.current = onFormat
  }, [onFormat])

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
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
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      formatActionRef.current?.dispose()
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
        }}
        loading={<div className={styles.loading}>Loading editor...</div>}
      />
    </div>
  )
}
