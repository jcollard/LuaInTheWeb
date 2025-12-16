/**
 * CanvasGamePanel component.
 * Renders the canvas game and provides controls.
 */
import { useRef, useEffect, useCallback } from 'react'
import { useCanvasGame } from '../../hooks/useCanvasGame'
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
}

export function CanvasGamePanel({
  code,
  width = 800,
  height = 600,
  autoStart = true,
  className,
  onExit,
  onCanvasReady,
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

  // Auto-start game when mounted
  useEffect(() => {
    if (autoStart && canvasRef.current && state === 'idle') {
      startGame(code, canvasRef.current)
    }
  }, [autoStart, code, state, startGame])

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

  const panelClassName = [styles.panel, className].filter(Boolean).join(' ')

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
      </div>

      {/* Canvas container */}
      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
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
