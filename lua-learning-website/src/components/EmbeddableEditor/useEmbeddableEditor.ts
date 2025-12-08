import { useState, useCallback, useRef } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import type { UseEmbeddableEditorOptions, UseEmbeddableEditorReturn } from './types'

/**
 * Hook that manages the state and logic for an embeddable code editor
 */
export function useEmbeddableEditor(options: UseEmbeddableEditorOptions): UseEmbeddableEditorReturn {
  const { initialCode, onRun, onChange } = options

  const [code, setCodeState] = useState(initialCode)
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track output during current run for onRun callback
  const currentRunOutput = useRef<string[]>([])

  const handleOutput = useCallback((message: string) => {
    setOutput(prev => [...prev, message])
    currentRunOutput.current.push(message)
  }, [])

  const handleError = useCallback((message: string) => {
    setError(message)
  }, [])

  const luaEngine = useLuaEngine({
    onOutput: handleOutput,
    onError: handleError,
  })

  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode)
    onChange?.(newCode)
  }, [onChange])

  const reset = useCallback(() => {
    setCodeState(initialCode)
    setOutput([])
    setError(null)
  }, [initialCode])

  const run = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    currentRunOutput.current = []

    try {
      await luaEngine.execute(code)
    } finally {
      setIsRunning(false)
      onRun?.(code, currentRunOutput.current.join('\n'))
    }
  }, [code, luaEngine, onRun])

  const clearOutput = useCallback(() => {
    setOutput([])
  }, [])

  return {
    code,
    output,
    isRunning,
    error,
    setCode,
    run,
    reset,
    clearOutput,
  }
}
