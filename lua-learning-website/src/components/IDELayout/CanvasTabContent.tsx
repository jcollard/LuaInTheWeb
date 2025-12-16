/**
 * Canvas tab content component.
 * Renders the canvas game panel with a simple tab bar for switching between tabs.
 */
import { useCallback } from 'react'
import { CanvasGamePanel } from '../CanvasGamePanel'
import type { TabInfo } from '../TabBar'
import { openCanvasPopout } from '../../utils/canvasPopout'
import styles from './IDELayout.module.css'

export interface CanvasTabContentProps {
  /** List of all tabs */
  tabs: TabInfo[]
  /** Currently active tab path */
  activeTab: string | null
  /** Code to run in the canvas */
  canvasCode: string
  /** Callback when a tab is selected */
  onSelectTab: (path: string) => void
  /** Callback when a tab is closed */
  onCloseTab: (path: string) => void
  /** Callback when the canvas game exits */
  onExit: (exitCode: number) => void
  /** Callback when an error occurs */
  onError?: (message: string) => void
}

export function CanvasTabContent({
  tabs,
  activeTab,
  canvasCode,
  onSelectTab,
  onCloseTab,
  onExit,
  onError,
}: CanvasTabContentProps) {
  const handlePopOut = useCallback(() => {
    if (!canvasCode) return
    const popup = openCanvasPopout(canvasCode, { title: 'Lua Canvas' })
    if (!popup) {
      onError?.('Pop-out was blocked. Please allow popups for this site.')
    }
  }, [canvasCode, onError])

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
      </div>
      <CanvasGamePanel
        code={canvasCode}
        onExit={onExit}
        onPopOut={handlePopOut}
      />
    </div>
  )
}
