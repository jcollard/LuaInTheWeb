import { useState, useCallback, useRef } from 'react'

/**
 * Terminal command types for rendering.
 * Similar to BashTerminal but with 'clear' for Ctrl+L.
 */
export interface TerminalCommand {
  type: 'write' | 'writeln' | 'moveCursor' | 'clearLine' | 'clearToEnd' | 'clear'
  data?: string
  direction?: 'up' | 'down' | 'left' | 'right'
  count?: number
}

export interface UseShellTerminalOptions {
  /** Command history from useShell hook */
  history?: string[]
  /** Callback when command is submitted */
  onCommand?: (command: string) => void
}

export interface UseShellTerminalReturn {
  // State
  currentLine: string
  cursorPosition: number
  historyIndex: number

  // Handlers - each returns TerminalCommand[] for rendering
  handleCharacter: (char: string) => TerminalCommand[]
  handleBackspace: () => TerminalCommand[]
  handleEnter: () => TerminalCommand[]
  handleArrowUp: () => TerminalCommand[]
  handleArrowDown: () => TerminalCommand[]
  handleArrowLeft: () => TerminalCommand[]
  handleArrowRight: () => TerminalCommand[]
  handleCtrlC: () => TerminalCommand[]
  handleCtrlL: () => TerminalCommand[]
}

/**
 * Hook that handles shell terminal input logic.
 * Extracts input handling from ShellTerminal component for testability.
 */
export function useShellTerminal(
  options: UseShellTerminalOptions
): UseShellTerminalReturn {
  const { history = [], onCommand } = options

  const [currentLine, setCurrentLine] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Use refs to track latest values for callbacks
  const currentLineRef = useRef(currentLine)
  const cursorPositionRef = useRef(cursorPosition)
  const historyIndexRef = useRef(historyIndex)
  const historyRef = useRef(history)

  // Keep refs in sync
  currentLineRef.current = currentLine
  cursorPositionRef.current = cursorPosition
  historyIndexRef.current = historyIndex
  historyRef.current = history

  const handleCharacter = useCallback((char: string): TerminalCommand[] => {
    const line = currentLineRef.current
    const pos = cursorPositionRef.current
    const beforeCursor = line.slice(0, pos)
    const afterCursor = line.slice(pos)
    const newLine = beforeCursor + char + afterCursor

    setCurrentLine(newLine)
    setCursorPosition(pos + 1)

    // Return commands for rendering
    const commands: TerminalCommand[] = [
      { type: 'write', data: char + afterCursor },
    ]
    // Move cursor back if there was text after
    if (afterCursor.length > 0) {
      commands.push({ type: 'moveCursor', direction: 'left', count: afterCursor.length })
    }
    return commands
  }, [])

  const handleBackspace = useCallback((): TerminalCommand[] => {
    const line = currentLineRef.current
    const pos = cursorPositionRef.current

    if (pos === 0) {
      return []
    }

    const beforeCursor = line.slice(0, pos - 1)
    const afterCursor = line.slice(pos)
    const newLine = beforeCursor + afterCursor

    setCurrentLine(newLine)
    setCursorPosition(pos - 1)

    // Return commands for rendering
    return [
      { type: 'moveCursor', direction: 'left', count: 1 },
      { type: 'write', data: afterCursor + ' ' },
      { type: 'moveCursor', direction: 'left', count: afterCursor.length + 1 },
    ]
  }, [])

  const handleEnter = useCallback((): TerminalCommand[] => {
    const line = currentLineRef.current
    const trimmedLine = line.trim()

    if (trimmedLine && onCommand) {
      onCommand(trimmedLine)
    }

    // Clear line and reset state
    setCurrentLine('')
    setCursorPosition(0)
    setHistoryIndex(-1)

    // Return writeln only for empty input (to show new prompt)
    // When there's content, newline is handled by onCommand callback
    if (!trimmedLine) {
      return [{ type: 'writeln', data: '' }]
    }

    return []
  }, [onCommand])

  const handleArrowUp = useCallback((): TerminalCommand[] => {
    const hist = historyRef.current
    const idx = historyIndexRef.current

    // No history
    if (hist.length === 0) {
      return []
    }

    // Calculate new index
    let newIndex: number
    if (idx === -1) {
      // Start from last item
      newIndex = hist.length - 1
    } else if (idx > 0) {
      newIndex = idx - 1
    } else {
      // Already at first item
      return []
    }

    const historyCommand = hist[newIndex]
    setHistoryIndex(newIndex)
    setCurrentLine(historyCommand)
    setCursorPosition(historyCommand.length)

    return [
      { type: 'clearLine' },
      { type: 'write', data: historyCommand },
    ]
  }, [])

  const handleArrowDown = useCallback((): TerminalCommand[] => {
    const hist = historyRef.current
    const idx = historyIndexRef.current

    // Not in history navigation
    if (idx === -1) {
      return []
    }

    // Navigate forward
    const newIndex = idx + 1

    if (newIndex >= hist.length) {
      // Past end of history - clear line
      setHistoryIndex(-1)
      setCurrentLine('')
      setCursorPosition(0)

      return [{ type: 'clearLine' }]
    }

    const historyCommand = hist[newIndex]
    setHistoryIndex(newIndex)
    setCurrentLine(historyCommand)
    setCursorPosition(historyCommand.length)

    return [
      { type: 'clearLine' },
      { type: 'write', data: historyCommand },
    ]
  }, [])

  const handleArrowLeft = useCallback((): TerminalCommand[] => {
    const pos = cursorPositionRef.current

    if (pos > 0) {
      setCursorPosition(pos - 1)
      return [{ type: 'moveCursor', direction: 'left', count: 1 }]
    }
    return []
  }, [])

  const handleArrowRight = useCallback((): TerminalCommand[] => {
    const pos = cursorPositionRef.current
    const line = currentLineRef.current

    if (pos < line.length) {
      setCursorPosition(pos + 1)
      return [{ type: 'moveCursor', direction: 'right', count: 1 }]
    }
    return []
  }, [])

  const handleCtrlC = useCallback((): TerminalCommand[] => {
    setCurrentLine('')
    setCursorPosition(0)
    setHistoryIndex(-1)

    return [
      { type: 'write', data: '^C' },
      { type: 'writeln', data: '' },
    ]
  }, [])

  const handleCtrlL = useCallback((): TerminalCommand[] => {
    return [{ type: 'clear' }]
  }, [])

  return {
    currentLine,
    cursorPosition,
    historyIndex,
    handleCharacter,
    handleBackspace,
    handleEnter,
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleCtrlC,
    handleCtrlL,
  }
}
