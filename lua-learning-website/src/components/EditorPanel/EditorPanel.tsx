import { CodeEditor } from '../CodeEditor'
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

  return (
    <div className={combinedClassName} data-testid="editor-panel">
      <div className={styles.toolbar}>
        {renderTabs()}
      </div>
      <div className={styles.editorContainer}>
        <CodeEditor
          value={code}
          onChange={onChange}
          language="lua"
          height="100%"
        />
      </div>
    </div>
  )
}
