import { useState, useCallback, useRef } from 'react'
import { ProcessManager, type IProcess } from '@lua-learning/shell-core'

export interface UseProcessManagerOptions {
  /** Callback when a process exits */
  onProcessExit?: (code: number) => void
  /** Callback for process output */
  onOutput?: (text: string) => void
  /** Callback for process errors */
  onError?: (text: string) => void
}

export interface UseProcessManagerReturn {
  /** Whether a process is currently running */
  isProcessRunning: boolean
  /** Check if there is a foreground process */
  hasForegroundProcess: () => boolean
  /** Start a process */
  startProcess: (process: IProcess) => void
  /** Stop the current process */
  stopProcess: () => void
  /** Route input to the current process */
  handleInput: (input: string) => boolean
}

/**
 * React hook wrapping ProcessManager with state management.
 * Provides reactive isProcessRunning state and callbacks for process events.
 */
export function useProcessManager(
  options: UseProcessManagerOptions = {}
): UseProcessManagerReturn {
  const { onProcessExit, onOutput, onError } = options

  const [isProcessRunning, setIsProcessRunning] = useState(false)
  const processManagerRef = useRef<ProcessManager>(new ProcessManager())

  // Keep callback refs up to date
  const onProcessExitRef = useRef(onProcessExit)
  const onOutputRef = useRef(onOutput)
  const onErrorRef = useRef(onError)
  onProcessExitRef.current = onProcessExit
  onOutputRef.current = onOutput
  onErrorRef.current = onError

  const hasForegroundProcess = useCallback((): boolean => {
    return processManagerRef.current.hasForegroundProcess()
  }, [])

  const startProcess = useCallback((process: IProcess): void => {
    const pm = processManagerRef.current

    // Wire up output/error callbacks before starting
    process.onOutput = (text: string) => {
      if (onOutputRef.current) {
        onOutputRef.current(text)
      }
    }

    process.onError = (text: string) => {
      if (onErrorRef.current) {
        onErrorRef.current(text)
      }
    }

    // Set up process exit handler to update React state
    pm.onProcessExit = (code: number) => {
      setIsProcessRunning(false)
      if (onProcessExitRef.current) {
        onProcessExitRef.current(code)
      }
    }

    pm.startProcess(process)
    setIsProcessRunning(true)
  }, [])

  const stopProcess = useCallback((): void => {
    processManagerRef.current.stopProcess()
    setIsProcessRunning(false)
  }, [])

  const handleInput = useCallback((input: string): boolean => {
    return processManagerRef.current.handleInput(input)
  }, [])

  return {
    isProcessRunning,
    hasForegroundProcess,
    startProcess,
    stopProcess,
    handleInput,
  }
}
