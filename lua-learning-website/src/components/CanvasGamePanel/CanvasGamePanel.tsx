/**
 * CanvasGamePanel component.
 * Renders the canvas game and provides controls.
 */
import { useRef, useEffect, useCallback, useMemo, useState, type ChangeEvent } from 'react'
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
  /** Callback when canvas element is ready (for shell integration), includes DPR for HiDPI scaling */
  onCanvasReady?: (canvas: HTMLCanvasElement, devicePixelRatio: number) => void
  /** Canvas scaling mode: 'fit' (auto-fit to container) or 'native' (original size) */
  scalingMode?: CanvasScalingMode
  /** Callback when scaling mode is changed (enables the scaling selector UI) */
  onScalingModeChange?: (mode: CanvasScalingMode) => void
  /** Whether the canvas tab is active and should receive focus */
  isActive?: boolean
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
  isActive,
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
    setDevicePixelRatio,
  } = useCanvasGame({
    onExit,
  })

  // Track window.devicePixelRatio for display switching support
  // This state updates when window is moved between displays with different DPR
  const [windowDpr, setWindowDpr] = useState(() =>
    typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1
  )

  // Listen for DPR changes (e.g., window moved to display with different resolution)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (scalingMode === 'native') return // Native mode doesn't need DPR tracking

    // Listen for DPR changes using matchMedia
    const mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    const handleChange = () => {
      setWindowDpr(window.devicePixelRatio ?? 1)
    }
    mql.addEventListener('change', handleChange)

    return () => mql.removeEventListener('change', handleChange)
  }, [scalingMode])

  // Calculate device pixel ratio based on scaling mode
  // Native mode: 1:1 pixel mapping (no DPR scaling)
  // Fit/Full modes: Use actual DPR for HiDPI rendering
  const devicePixelRatio = useMemo(() => {
    if (scalingMode === 'native') {
      return 1
    }
    return windowDpr
  }, [scalingMode, windowDpr])

  // Auto-start game when mounted (only in standalone mode, not shell integration mode)
  // When onCanvasReady is provided, the shell manages the Lua execution
  useEffect(() => {
    if (autoStart && canvasRef.current && state === 'idle' && !onCanvasReady) {
      startGame(code, canvasRef.current, { devicePixelRatio })
    }
  }, [autoStart, code, state, startGame, onCanvasReady, devicePixelRatio])

  // Update DPR when scaling mode changes (while game is running)
  useEffect(() => {
    if (isRunning) {
      setDevicePixelRatio(devicePixelRatio)
    }
  }, [devicePixelRatio, isRunning, setDevicePixelRatio])

  // Notify when canvas element is ready (for shell integration)
  // Passes the canvas element and current devicePixelRatio for HiDPI scaling
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current, devicePixelRatio)
    }
  }, [onCanvasReady, devicePixelRatio])

  // Auto-focus canvas when isActive becomes true
  useEffect(() => {
    if (isActive && canvasRef.current) {
      canvasRef.current.focus()
    }
  }, [isActive])

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
  const getContainerScalingClass = () => {
    switch (scalingMode) {
      case 'fit':
        return styles.canvasContainerFit
      case 'full':
        return styles.canvasContainerFull
      case 'native':
        return styles.canvasContainerNative
    }
  }

  const getCanvasScalingClass = () => {
    switch (scalingMode) {
      case 'fit':
        return styles.canvasFit
      case 'full':
        return styles.canvasFull
      case 'native':
        return styles.canvasNative
    }
  }

  const containerClassName = [
    styles.canvasContainer,
    getContainerScalingClass(),
  ].join(' ')

  const canvasClassName = [
    styles.canvas,
    getCanvasScalingClass(),
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
              <option value="full">Full</option>
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
