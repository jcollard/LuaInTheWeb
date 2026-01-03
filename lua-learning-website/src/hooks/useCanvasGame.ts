/**
 * Hook for managing canvas game process lifecycle.
 * Wraps LuaCanvasProcess from @lua-learning/canvas-runtime.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  LuaCanvasProcess,
  isSharedArrayBufferAvailable,
} from '@lua-learning/canvas-runtime'

export type CanvasGameState = 'idle' | 'running' | 'error'
export type CanvasGameMode = 'performance' | 'compatibility'

export interface UseCanvasGameOptions {
  onOutput?: (text: string) => void
  onError?: (text: string) => void
  onExit?: (code: number) => void
}

/**
 * Options for starting a game.
 */
export interface StartGameOptions {
  /** Device pixel ratio for HiDPI rendering (default: 1) */
  devicePixelRatio?: number
}

export interface UseCanvasGameReturn {
  state: CanvasGameState
  isRunning: boolean
  isPaused: boolean
  error: string | null
  output: string
  mode: CanvasGameMode
  process: LuaCanvasProcess | null
  startGame: (code: string, canvas: HTMLCanvasElement, options?: StartGameOptions) => void
  stopGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  clearOutput: () => void
  clearError: () => void
  /** Set the device pixel ratio for the current process */
  setDevicePixelRatio: (dpr: number) => void
}

/**
 * Hook to manage a canvas game's lifecycle.
 * Provides start/stop controls and state tracking.
 */
export function useCanvasGame(
  options: UseCanvasGameOptions = {}
): UseCanvasGameReturn {
  const { onOutput, onError, onExit } = options

  const [state, setState] = useState<CanvasGameState>('idle')
  const [isPaused, setIsPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<string>('')

  const processRef = useRef<LuaCanvasProcess | null>(null)

  // Determine mode based on SharedArrayBuffer availability
  const mode: CanvasGameMode = isSharedArrayBufferAvailable()
    ? 'performance'
    : 'compatibility'

  const startGame = useCallback(
    (code: string, canvas: HTMLCanvasElement, options?: StartGameOptions) => {
      // Clean up any existing process
      if (processRef.current) {
        processRef.current.stop()
      }

      // Clear previous error
      setError(null)

      // Create new process
      const process = new LuaCanvasProcess({
        code,
        canvas,
      })

      // Set device pixel ratio before start (if provided)
      if (options?.devicePixelRatio && options.devicePixelRatio !== 1) {
        process.setDevicePixelRatio(options.devicePixelRatio)
      }

      // Wire up callbacks
      process.onOutput = (text: string) => {
        setOutput((prev) => prev + text)
        onOutput?.(text)
      }

      process.onError = (text: string) => {
        setError(text)
        setState('error')
        onError?.(text)
      }

      process.onExit = (exitCode: number) => {
        // Only set to 'idle' on successful exit (code 0)
        // On error exit (code != 0), keep the 'error' state to prevent restart loops
        if (exitCode === 0) {
          setState('idle')
        }
        onExit?.(exitCode)
      }

      // Store reference and start
      processRef.current = process
      process.start()
      setState('running')
    },
    [onOutput, onError, onExit]
  )

  const stopGame = useCallback(() => {
    if (processRef.current) {
      processRef.current.stop()
      processRef.current = null
      setState('idle')
      setIsPaused(false)
    }
  }, [])

  const pauseGame = useCallback(() => {
    if (processRef.current) {
      processRef.current.pause()
      setIsPaused(true)
    }
  }, [])

  const resumeGame = useCallback(() => {
    if (processRef.current) {
      processRef.current.resume()
      setIsPaused(false)
    }
  }, [])

  const clearOutput = useCallback(() => {
    setOutput('')
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    if (state === 'error') {
      setState('idle')
    }
  }, [state])

  // Set device pixel ratio on the current process
  const setDevicePixelRatio = useCallback((dpr: number) => {
    if (processRef.current) {
      processRef.current.setDevicePixelRatio(dpr)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processRef.current) {
        processRef.current.stop()
      }
    }
  }, [])

  return {
    state,
    isRunning: state === 'running',
    isPaused,
    error,
    output,
    mode,
    process: processRef.current,
    startGame,
    stopGame,
    pauseGame,
    resumeGame,
    clearOutput,
    clearError,
    setDevicePixelRatio,
  }
}
