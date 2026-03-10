import { AnsiTerminalPanel, type AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { useCrt } from '../../contexts/CrtContext'
import type { TabInfo } from '../TabBar'
import styles from './IDELayout.module.css'

export interface AnsiTabContentProps {
  tabs: TabInfo[]
  activeTab: string | null
  onSelectTab: (path: string) => void
  onCloseTab: (path: string) => void
  isActive?: boolean
  /** Callback when the terminal is ready, providing a handle for programmatic control */
  onTerminalReady?: (ansiId: string, handle: AnsiTerminalHandle | null) => void
}

export function AnsiTabContent({
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  isActive,
  onTerminalReady,
}: AnsiTabContentProps) {
  const { enabled: crtEnabled, toggleCrt } = useCrt()

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.canvasToolbar}>
        <div className={styles.canvasTabs}>
          {tabs.map((tab) => (
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
        <button
          type="button"
          className={`${styles.crtToggle} ${crtEnabled ? styles.crtToggleActive : ''}`}
          onClick={toggleCrt}
          aria-pressed={crtEnabled}
          title="Toggle CRT effect"
        >
          CRT
        </button>
      </div>
      <AnsiTerminalPanel
        isActive={isActive}
        onTerminalReady={onTerminalReady
          ? (handle) => {
              // Extract ansiId from active tab path (ansi://{ansiId})
              const ansiTab = tabs.find(t => t.type === 'ansi')
              if (ansiTab || handle === null) {
                onTerminalReady(ansiTab?.path ?? '', handle)
              }
            }
          : undefined
        }
      />
    </div>
  )
}
