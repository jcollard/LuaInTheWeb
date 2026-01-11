/**
 * Canvas tab content component.
 * Renders the canvas game panel with a simple tab bar for switching between tabs.
 */
import { CanvasGamePanel } from '../CanvasGamePanel'
import type { TabInfo } from '../TabBar'
import { useCanvasScaling } from '../../hooks/useCanvasScaling'
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
  /** Callback when canvas element is ready (for shell integration) */
  onCanvasReady?: (canvasId: string, canvas: HTMLCanvasElement) => void
  /** Callback when reload is requested (for hot reload) */
  onReload?: (canvasId: string) => void
  /** Whether the canvas tab is active and should receive focus */
  isActive?: boolean
  /** Control state for each canvas (canvasId -> { isRunning, isPaused }) */
  canvasControlStates?: Map<string, { isRunning: boolean; isPaused: boolean }>
  /** Error state for each canvas (canvasId -> error message) */
  canvasErrorStates?: Map<string, string>
  /** Callback when pause is requested */
  onPause?: (canvasId: string) => void
  /** Callback when play is requested */
  onPlay?: (canvasId: string) => void
  /** Callback when stop is requested */
  onStop?: (canvasId: string) => void
  /** Callback when step is requested */
  onStep?: (canvasId: string) => void
}

export function CanvasTabContent({
  tabs,
  activeTab,
  canvasCode,
  onSelectTab,
  onCloseTab,
  onExit,
  onCanvasReady,
  onReload,
  isActive,
  canvasControlStates,
  canvasErrorStates,
  onPause,
  onPlay,
  onStop,
  onStep,
}: CanvasTabContentProps) {
  const { scalingMode, setScalingMode } = useCanvasScaling()

  // Get the canvasId from the active tab path
  const activeCanvasId = activeTab?.replace('canvas://', '') ?? null

  // Get the control state for the active canvas
  const controlState = activeCanvasId ? canvasControlStates?.get(activeCanvasId) : undefined

  // Get the error for the active canvas
  const shellError = activeCanvasId ? canvasErrorStates?.get(activeCanvasId) : undefined

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
        onCanvasReady={activeTab && onCanvasReady ? (canvas) => onCanvasReady(activeTab, canvas) : undefined}
        onReload={activeTab && onReload ? () => onReload(activeTab.replace('canvas://', '')) : undefined}
        scalingMode={scalingMode}
        onScalingModeChange={setScalingMode}
        isActive={isActive}
        shellIsRunning={controlState?.isRunning}
        shellIsPaused={controlState?.isPaused}
        shellError={shellError}
        onPause={activeCanvasId && onPause ? () => onPause(activeCanvasId) : undefined}
        onPlay={activeCanvasId && onPlay ? () => onPlay(activeCanvasId) : undefined}
        onStop={activeCanvasId && onStop ? () => onStop(activeCanvasId) : undefined}
        onStep={activeCanvasId && onStep ? () => onStep(activeCanvasId) : undefined}
      />
    </div>
  )
}
