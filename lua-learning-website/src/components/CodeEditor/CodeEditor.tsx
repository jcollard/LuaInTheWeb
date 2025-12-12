import Editor from '@monaco-editor/react'
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
}: CodeEditorProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  return (
    <div className={styles.wrapper} data-testid="code-editor-wrapper">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={monacoTheme}
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
