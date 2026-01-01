import { useCallback } from 'react'
import { CodeEditor } from '../CodeEditor'
import { FormatButton } from '../FormatButton'
import { TabBar } from '../TabBar'
import type { TabBarProps } from '../TabBar'
import type { EditorReadyInfo } from '../CodeEditor/types'
import type { UseTabEditorManagerReturn } from '../../hooks/useTabEditorManager'
import styles from './EditorPanel.module.css'

/**
 * Props for the VirtualizedEditorPanel component
 */
export interface VirtualizedEditorPanelProps {
  /** Tab editor manager from useTabEditorManager hook */
  tabEditorManager: UseTabEditorManagerReturn
  /** Currently active tab path */
  activeTab: string | null
  /** Props for TabBar */
  tabBarProps?: Omit<TabBarProps, 'className'>
  /** Called when format button is clicked */
  onFormat?: () => void
  /** Whether formatting is in progress */
  isFormatting?: boolean
  /** Called when an editor becomes ready */
  onEditorReady?: (path: string, info: EditorReadyInfo) => void
  /** Whether auto-save is currently enabled */
  autoSaveEnabled?: boolean
  /** Called when auto-save is toggled */
  onToggleAutoSave?: () => void
  /** Called when "Save All Files" command is invoked */
  onSaveAllFiles?: () => void
  /** Optional additional className */
  className?: string
}

/**
 * Editor panel that virtualizes multiple CodeEditor instances.
 *
 * Mounts up to 5 CodeEditor instances based on MRU tracking.
 * Inactive editors are hidden with CSS `display: none` to preserve their state.
 */
export function VirtualizedEditorPanel({
  tabEditorManager,
  activeTab,
  tabBarProps,
  onFormat,
  isFormatting = false,
  onEditorReady,
  autoSaveEnabled,
  onToggleAutoSave,
  onSaveAllFiles,
  className,
}: VirtualizedEditorPanelProps) {
  const { mountedTabs, getContent, getActiveContent, updateContent } = tabEditorManager

  const combinedClassName = className
    ? `${styles.editorPanel} ${className}`
    : styles.editorPanel

  // Create onChange handler for a specific tab
  const createOnChange = useCallback(
    (path: string) => (newCode: string) => {
      updateContent(path, newCode)
    },
    [updateContent]
  )

  // Create onEditorReady handler for a specific tab
  const createOnEditorReady = useCallback(
    (path: string) => (info: EditorReadyInfo) => {
      onEditorReady?.(path, info)
    },
    [onEditorReady]
  )

  const renderTabs = () => {
    if (tabBarProps) {
      return <TabBar {...tabBarProps} />
    }

    // Empty state - no file is open
    return (
      <div className={styles.welcomeMessage}>
        <span>Create a new file or open an existing one to get started</span>
      </div>
    )
  }

  const renderEditors = () => {
    if (mountedTabs.length === 0) {
      return null
    }

    return mountedTabs.map((path) => {
      const isActive = path === activeTab
      const content = getContent(path)

      return (
        <div
          key={path}
          data-testid={`editor-container-${path}`}
          className={styles.editorContainer}
          style={{ display: isActive ? undefined : 'none' }}
        >
          <CodeEditor
            data-testid={`editor-${path}`}
            value={content}
            onChange={createOnChange(path)}
            language="lua"
            height="100%"
            onFormat={onFormat}
            onEditorReady={createOnEditorReady(path)}
            autoSaveEnabled={autoSaveEnabled}
            onToggleAutoSave={onToggleAutoSave}
            onSaveAllFiles={onSaveAllFiles}
          />
        </div>
      )
    })
  }

  return (
    <div className={combinedClassName} data-testid="editor-panel">
      <div className={styles.toolbar}>
        {renderTabs()}
        {onFormat && (
          <div className={styles.actions}>
            <FormatButton
              onFormat={onFormat}
              loading={isFormatting}
              disabled={!getActiveContent().trim()}
            />
          </div>
        )}
      </div>
      <div className={styles.editorsWrapper}>
        {mountedTabs.length === 0 ? (
          <div className={styles.emptyEditor} />
        ) : (
          renderEditors()
        )}
      </div>
    </div>
  )
}
