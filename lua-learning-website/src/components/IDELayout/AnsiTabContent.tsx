import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { TabInfo } from '../TabBar'
import styles from './IDELayout.module.css'

export interface AnsiTabContentProps {
  tabs: TabInfo[]
  activeTab: string | null
  onSelectTab: (path: string) => void
  onCloseTab: (path: string) => void
  isActive?: boolean
}

export function AnsiTabContent({
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  isActive,
}: AnsiTabContentProps) {
  return (
    <div className={styles.canvasContainer}>
      <div className={styles.canvasToolbar}>
        <div className={styles.canvasTabs}>
          {tabs.filter(tab => tab.type === 'ansi').map((tab) => (
            <button
              key={tab.path}
              type="button"
              className={`${styles.canvasTab} ${tab.path === activeTab ? styles.canvasTabActive : ''}`}
              onClick={() => onSelectTab(tab.path)}
            >
              {tab.name}
              <span
                className={styles.canvasTabClose}
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.path)
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </div>
      <AnsiTerminalPanel isActive={isActive} />
    </div>
  )
}
