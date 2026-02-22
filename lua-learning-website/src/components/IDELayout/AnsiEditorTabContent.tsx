import { AnsiGraphicsEditor } from '../AnsiGraphicsEditor'
import { useIDE } from '../IDEContext/useIDE'
import type { TabBarProps } from '../TabBar'
import styles from './IDELayout.module.css'

export interface AnsiEditorTabContentProps {
  tabBarProps?: TabBarProps
  filePath?: string
}

export function AnsiEditorTabContent({ tabBarProps, filePath }: AnsiEditorTabContentProps) {
  const { fileSystem } = useIDE()

  const isNewFile = !filePath || filePath.startsWith('ansi-editor://')
  const fileReady = isNewFile || fileSystem.readFile(filePath) !== null

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
      {fileReady ? (
        <AnsiGraphicsEditor key={filePath} filePath={filePath} />
      ) : (
        <div className={styles.canvasLoading}>Loading...</div>
      )}
    </div>
  )
}
