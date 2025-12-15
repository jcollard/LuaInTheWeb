import { useState, useCallback, useRef } from 'react'
import {
  ProcessManager,
  type IProcess,
  type KeyModifiers,
} from '@lua-learning/shell-core'

export interface UseProcessManagerOptions {
  /** Callback when a process exits */
  onProcessExit?: (code: number) => void
  /** Callback for process output */
  onOutput?: (text: string) => void
  /** Callback for process errors */
  onError?: (text: string) => void
  /**
   * Callback when process requests input (io.read).
   * @param charCount - If provided, read exactly this many characters (no Enter required).
   *                    If undefined, read a full line (wait for Enter).
   */
  onRequestInput?: (charCount?: number) => void
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
  /** Check if the current process supports raw key input */
  supportsRawInput: () => boolean
  /** Route a key event to the current process */
  handleKey: (key: string, modifiers?: KeyModifiers) => boolean
}

/**
 * React hook wrapping ProcessManager with state management.
 * Provides reactive isProcessRunning state and callbacks for process events.
 */
export function useProcessManager(
  options: UseProcessManagerOptions = {}
): UseProcessManagerReturn {
  const { onProcessExit, onOutput, onError, onRequestInput } = options

  const [isProcessRunning, setIsProcessRunning] = useState(false)
  const processManagerRef = useRef<ProcessManager>(new ProcessManager())

  // Keep callback refs up to date
  const onProcessExitRef = useRef(onProcessExit)
  const onOutputRef = useRef(onOutput)
  const onErrorRef = useRef(onError)
  const onRequestInputRef = useRef(onRequestInput)
  onProcessExitRef.current = onProcessExit
  onOutputRef.current = onOutput
  onErrorRef.current = onError
  onRequestInputRef.current = onRequestInput

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

    // Wire up onRequestInput callback if the process supports it
    // This is used by LuaScriptProcess and LuaReplProcess for io.read()
    if ('onRequestInput' in process) {
      ;(process as IProcess & { onRequestInput: (charCount?: number) => void }).onRequestInput = (
        charCount?: number
      ) => {
        if (onRequestInputRef.current) {
          onRequestInputRef.current(charCount)
        }
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

  const supportsRawInput = useCallback((): boolean => {
    return processManagerRef.current.supportsRawInput()
  }, [])

  const handleKey = useCallback(
    (key: string, modifiers?: KeyModifiers): boolean => {
      return processManagerRef.current.handleKey(key, modifiers)
    },
    []
  )

  return {
    isProcessRunning,
    hasForegroundProcess,
    startProcess,
    stopProcess,
    handleInput,
    supportsRawInput,
    handleKey,
  }
}
