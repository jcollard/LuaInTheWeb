import { useState, useCallback, useRef } from 'react'
import type { TerminalLine } from '../BottomPanel/types'

export interface UseIDETerminalReturn {
  terminalOutput: TerminalLine[]
  isAwaitingInput: boolean
  handleOutput: (text: string) => void
  handleError: (error: string) => void
  handleReadInput: () => Promise<string>
  submitInput: (input: string) => void
  clearTerminal: () => void
}

export function useIDETerminal(): UseIDETerminalReturn {
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([])
  const lineCounterRef = useRef(0)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)
  const inputResolverRef = useRef<((value: string) => void) | null>(null)

  const handleOutput = useCallback((text: string) => {
    const id = `line-${++lineCounterRef.current}`
    setTerminalOutput(prev => [...prev, { id, text }])
  }, [])

  const handleError = useCallback((error: string) => {
    const id = `line-${++lineCounterRef.current}`
    setTerminalOutput(prev => [...prev, { id, text: error }])
  }, [])

  const handleReadInput = useCallback((): Promise<string> => {
    setIsAwaitingInput(true)
    const id = `line-${++lineCounterRef.current}`
    setTerminalOutput(prev => [...prev, { id, text: '> Waiting for input...' }])

    return new Promise<string>((resolve) => {
      inputResolverRef.current = resolve
    })
  }, [])

  const submitInput = useCallback((input: string) => {
    if (inputResolverRef.current) {
      inputResolverRef.current(input)
      inputResolverRef.current = null
      setIsAwaitingInput(false)
    }
  }, [])

  const clearTerminal = useCallback(() => {
    setTerminalOutput([])
  }, [])

  return {
    terminalOutput,
    isAwaitingInput,
    handleOutput,
    handleError,
    handleReadInput,
    submitInput,
    clearTerminal,
  }
}
