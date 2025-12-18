/**
 * CanvasGamePanel component.
 * Renders the canvas game and provides controls.
 */
import { useRef, useEffect, useCallback, type ChangeEvent } from 'react'
import { useCanvasGame } from '../../hooks/useCanvasGame'
import type { CanvasScalingMode } from '../../hooks/useCanvasScaling'
import styles from './CanvasGamePanel.module.css'

export interface CanvasGamePanelProps {
  /** Lua code to run */
  code: string
  /** Canvas width in pixels */
  width?: number
  /** Canvas height in pixels */
  height?: number
  /** Whether to start the game automatically */
  autoStart?: boolean
  /** Additional CSS class */
  className?: string
  /** Callback when process exits */
  onExit?: (code: number) => void
  /** Callback when canvas element is ready (for shell integration) */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
  /** Canvas scaling mode: 'fit' (auto-fit to container) or 'native' (original size) */
  scalingMode?: CanvasScalingMode
  /** Callback when scaling mode is changed (enables the scaling selector UI) */
  onScalingModeChange?: (mode: CanvasScalingMode) => void
}

export function CanvasGamePanel({
  code,
  width = 800,
  height = 600,
  autoStart = true,
  className,
  onExit,
  onCanvasReady,
  scalingMode = 'fit',
  onScalingModeChange,
}: CanvasGamePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    state,
    isRunning,
    isPaused,
    error,
    mode,
    startGame,
    pauseGame,
    resumeGame,
    clearError,
  } = useCanvasGame({
    onExit,
  })

  // Auto-start game when mounted (only in standalone mode, not shell integration mode)
  // When onCanvasReady is provided, the shell manages the Lua execution
  useEffect(() => {
    if (autoStart && canvasRef.current && state === 'idle' && !onCanvasReady) {
      startGame(code, canvasRef.current)
    }
  }, [autoStart, code, state, startGame, onCanvasReady])

  // Notify when canvas element is ready (for shell integration)
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current)
    }
  }, [onCanvasReady])

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeGame()
    } else {
      pauseGame()
    }
  }, [isPaused, pauseGame, resumeGame])

  const handleScalingModeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onScalingModeChange?.(e.target.value as CanvasScalingMode)
    },
    [onScalingModeChange]
  )

  const panelClassName = [styles.panel, className].filter(Boolean).join(' ')

  // Build canvas container and canvas class names based on scaling mode
  const containerClassName = [
    styles.canvasContainer,
    scalingMode === 'fit' ? styles.canvasContainerFit : styles.canvasContainerNative,
  ].join(' ')

  const canvasClassName = [
    styles.canvas,
    scalingMode === 'fit' ? styles.canvasFit : styles.canvasNative,
  ].join(' ')

  return (
    <div className={panelClassName}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {isRunning && (
          <>
            <span
              className={`${styles.modeIndicator} ${styles[mode]}`}
              title={
                mode === 'performance'
                  ? 'Using SharedArrayBuffer for best performance'
                  : 'Using postMessage fallback for compatibility'
              }
            >
              {mode === 'performance' ? 'Performance' : 'Compatibility'}
            </span>
            <button
              type="button"
              className={styles.pauseButton}
              onClick={handlePauseResume}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </>
        )}

        {/* Scaling mode selector */}
        {onScalingModeChange && (
          <div className={styles.scalingSelector}>
            <label htmlFor="canvas-scaling-mode" className={styles.scalingLabel}>
              Scale:
            </label>
            <select
              id="canvas-scaling-mode"
              className={styles.scalingSelect}
              value={scalingMode}
              onChange={handleScalingModeChange}
              aria-label="Scale"
            >
              <option value="fit">Fit</option>
              <option value="native">1x</option>
            </select>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div className={containerClassName}>
        <canvas
          ref={canvasRef}
          className={canvasClassName}
          width={width}
          height={height}
          tabIndex={0}
          aria-label="Canvas game"
        />

        {/* Error overlay */}
        {error && (
          <div className={styles.errorOverlay}>
            <div className={styles.errorContent}>
              <h3 className={styles.errorTitle}>Error</h3>
              <p className={styles.errorMessage}>{error}</p>
              <button
                type="button"
                className={styles.dismissButton}
                onClick={clearError}
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
