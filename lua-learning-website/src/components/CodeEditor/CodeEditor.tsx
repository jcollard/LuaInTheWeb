import Editor, { type OnMount } from '@monaco-editor/react'
import type { CodeEditorProps } from './types'
import styles from './CodeEditor.module.css'
import { useTheme } from '../../contexts/useTheme'

/**
 * A code editor component wrapping Monaco Editor
 */
export function CodeEditor({
  value,
  onChange,
  language = 'lua',
  height = '400px',
  readOnly = false,
  onRun,
  onMount,
  onCursorChange,
}: CodeEditorProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      onRun?.()
    }
  }

  const handleEditorMount: OnMount = (editor) => {
    // Call the onMount callback with the editor instance
    onMount?.(editor)

    // Set up cursor position change listener
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange(e.position.lineNumber, e.position.column)
      })
    }
  }

  return (
    <div
      className={styles.wrapper}
      onKeyDown={handleKeyDown}
      data-testid="code-editor-wrapper"
    >
      <Editor
        height={height}
        language={language}
        value={value}
        theme={monacoTheme}
        onChange={(newValue) => onChange(newValue ?? '')}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        loading={<div className={styles.loading}>Loading editor...</div>}
      />
    </div>
  )
}
