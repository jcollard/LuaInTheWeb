import { useCallback, useMemo } from 'react'
import { AnsiGraphicsEditor } from '../AnsiGraphicsEditor'
import { useIDE } from '../IDEContext/useIDE'
import type { TabBarProps } from '../TabBar'
import styles from './IDELayout.module.css'

export interface AnsiEditorTabContentProps {
  tabBarProps?: TabBarProps
  filePath?: string
}

export function AnsiEditorTabContent({ tabBarProps, filePath }: AnsiEditorTabContentProps) {
  const { fileSystem, setTabDirty } = useIDE()

  const ansiEditorTabs = useMemo(
    () => tabBarProps?.tabs.filter(t => t.type === 'ansi-editor') ?? [],
    [tabBarProps?.tabs],
  )

  const handleDirtyChange = useCallback((path: string, isDirty: boolean) => {
    setTabDirty(path, isDirty)
  }, [setTabDirty])

  function isFileReady(path: string | undefined): boolean {
    if (!path || path.startsWith('ansi-editor://')) return true
    return fileSystem.readFile(path) !== null
  }

  return (
    <div className={styles.canvasContainer}>
      {tabBarProps && (
        <div className={styles.canvasToolbar}>
          <div className={styles.canvasTabs}>
            {tabBarProps.tabs.map((tab) => (
              <button
                key={tab.path}
                type="button"
                className={`${styles.canvasTab} ${tab.path === tabBarProps.activeTab ? styles.canvasTabActive : ''}`}
                onClick={() => tabBarProps.onSelect(tab.path)}
              >
                {tab.isDirty && <span className={styles.canvasTabDirty} data-testid={`dirty-indicator-${tab.path}`}>*</span>}
                {tab.name}
                <span
                  className={styles.canvasTabClose}
                  onClick={(e) => {
                    e.stopPropagation()
                    tabBarProps.onClose(tab.path)
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {ansiEditorTabs.map((tab) => {
        const isActive = tab.path === filePath
        const ready = isFileReady(tab.path)
        return (
          <div key={tab.path} style={{ display: isActive ? 'contents' : 'none' }}>
            {ready ? (
              <AnsiGraphicsEditor
                filePath={tab.path}
                isActive={isActive}
                onDirtyChange={(dirty) => handleDirtyChange(tab.path, dirty)}
              />
            ) : (
              <div className={styles.canvasLoading}>Loading...</div>
            )}
          </div>
        )
      })}
      {ansiEditorTabs.length === 0 && (
        isFileReady(filePath) ? (
          <AnsiGraphicsEditor filePath={filePath} isActive={true} />
        ) : (
          <div className={styles.canvasLoading}>Loading...</div>
        )
      )}
    </div>
  )
}
