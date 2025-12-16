import { CodeEditor } from '../CodeEditor'
import { FormatButton } from '../FormatButton'
import { TabBar } from '../TabBar'
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
  className,
  tabBarProps,
  onFormat,
  isFormatting = false,
  onEditorReady,
  onRunCanvas,
}: EditorPanelProps) {
  const combinedClassName = className
    ? `${styles.editorPanel} ${className}`
    : styles.editorPanel

  const displayFileName = isDirty ? `${fileName} *` : fileName

  const renderTabs = () => {
    if (tabBarProps) {
      return <TabBar {...tabBarProps} />
    }

    // Empty state - no file is open
    if (fileName === null) {
      return (
        <div className={styles.welcomeMessage}>
          <span>Create a new file or open an existing one to get started</span>
        </div>
      )
    }

    return (
      <div className={styles.tabs}>
        <div className={styles.tab}>
          <span className={styles.tabName}>{displayFileName}</span>
        </div>
      </div>
    )
  }

  const hasActions = onFormat || onRunCanvas

  return (
    <div className={combinedClassName} data-testid="editor-panel">
      <div className={styles.toolbar}>
        {renderTabs()}
        {hasActions && (
          <div className={styles.actions}>
            {onRunCanvas && (
              <button
                type="button"
                className={styles.runButton}
                onClick={onRunCanvas}
                disabled={!code.trim()}
                aria-label="Run canvas"
                title="Run in canvas"
              >
                Run Canvas
              </button>
            )}
            {onFormat && (
              <FormatButton
                onFormat={onFormat}
                loading={isFormatting}
                disabled={!code.trim()}
              />
            )}
          </div>
        )}
      </div>
      <div className={styles.editorContainer}>
        <CodeEditor
          value={code}
          onChange={onChange}
          language="lua"
          height="100%"
          onFormat={onFormat}
          onEditorReady={onEditorReady}
        />
      </div>
    </div>
  )
}
