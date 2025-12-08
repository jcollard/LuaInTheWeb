import Editor from '@monaco-editor/react'
import type { CodeEditorProps } from './types'
import styles from './CodeEditor.module.css'

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
}: CodeEditorProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      onRun?.()
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
        onChange={(newValue) => onChange(newValue ?? '')}
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
