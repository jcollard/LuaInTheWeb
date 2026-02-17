import { AnsiGraphicsEditor } from '../AnsiGraphicsEditor'
import type { TabBarProps } from '../TabBar'
import styles from './IDELayout.module.css'

export interface AnsiEditorTabContentProps {
  tabBarProps?: TabBarProps
}

export function AnsiEditorTabContent({ tabBarProps }: AnsiEditorTabContentProps) {
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
      <AnsiGraphicsEditor />
    </div>
  )
}
