import { CodeEditor } from '../CodeEditor'
import styles from './EditorPanel.module.css'
import type { EditorPanelProps } from './types'

/**
 * Editor panel with toolbar and tabs
 */
export function EditorPanel({
  code,
  onChange,
  fileName,
  isDirty,
  onRun,
  isRunning = false,
  className,
}: EditorPanelProps) {
  const combinedClassName = className
    ? `${styles.editorPanel} ${className}`
    : styles.editorPanel

  const displayFileName = isDirty ? `${fileName} *` : fileName
  const runButtonLabel = isRunning ? 'Code is running' : 'Run code (Ctrl+Enter)'

  return (
    <div className={combinedClassName} data-testid="editor-panel">
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <div className={styles.tab}>
            <span className={styles.tabName}>{displayFileName}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.runButton}
            onClick={onRun}
            disabled={isRunning}
            aria-label={runButtonLabel}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
      <div className={styles.editorContainer}>
        <CodeEditor
          value={code}
          onChange={onChange}
          language="lua"
          height="100%"
          onRun={onRun}
        />
      </div>
    </div>
  )
}
