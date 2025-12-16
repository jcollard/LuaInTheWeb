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
  /** Callback when stop button is clicked */
  onStop?: () => void
  /** Callback when process exits */
  onExit?: (code: number) => void
  /** Callback when pop-out button is clicked */
  onPopOut?: () => void
}

export function CanvasGamePanel({
  code,
  width = 800,
  height = 600,
  autoStart = true,
  className,
  onStop,
  onExit,
  onPopOut,
}: CanvasGamePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { state, isRunning, error, mode, startGame, stopGame, clearError } =
    useCanvasGame({
      onExit,
    })

  // Auto-start game when mounted
  useEffect(() => {
    if (autoStart && canvasRef.current && state === 'idle') {
      startGame(code, canvasRef.current)
    }
  }, [autoStart, code, state, startGame])

  const handleStop = useCallback(() => {
    stopGame()
    onStop?.()
  }, [stopGame, onStop])

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
            {onPopOut && (
              <button
                type="button"
                className={styles.popOutButton}
                onClick={onPopOut}
                aria-label="Pop out"
                title="Open in new window"
              >
                Pop Out
              </button>
            )}
            <button
              type="button"
              className={styles.stopButton}
              onClick={handleStop}
              aria-label="Stop game"
            >
              Stop
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
