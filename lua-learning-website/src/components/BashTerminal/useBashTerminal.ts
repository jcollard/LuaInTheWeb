import { useState, useCallback, useRef } from 'react'
import { getTabCompletions, type CompletionEntry as ImportedCompletionEntry } from './inputKeyHandlers'

/**
 * Terminal command types for rendering
 */
export interface TerminalCommand {
  type: 'write' | 'writeln' | 'moveCursor' | 'clearLine' | 'clearToEnd'
  data?: string
  direction?: 'up' | 'down' | 'left' | 'right'
  count?: number
}

/**
 * File entry for tab completion (re-exported from inputKeyHandlers)
 */
export type CompletionEntry = ImportedCompletionEntry

/**
 * Result of tab completion operation
 */
export interface TabCompletionResult {
  /** Terminal commands to execute for displaying completion */
  commands: TerminalCommand[]
  /** Suggestions to display (for multiple matches when no common prefix extends input) */
  suggestions: string[]
  /** Total count when more than 10 matches (for "N options available" message) */
  truncatedCount?: number
}

export interface UseBashTerminalOptions {
  onCommand?: (command: string) => void
  /** Available command names for tab completion */
  commandNames?: string[]
  /** Callback to get path completions for a partial path */
  getPathCompletions?: (partialPath: string) => CompletionEntry[]
}

export interface UseBashTerminalReturn {
  // State
  currentLine: string
  cursorPosition: number
  history: string[]
  historyIndex: number
  isMultiLineMode: boolean
  multiLineBuffer: string[]
  multiLineCursorLine: number

  // Handlers
  handleCharacter: (char: string) => TerminalCommand[]
  handleBackspace: () => TerminalCommand[]
  handleEnter: () => TerminalCommand[]
  handleArrowUp: () => TerminalCommand[]
  handleArrowDown: () => TerminalCommand[]
  handleArrowLeft: () => TerminalCommand[]
  handleArrowRight: () => TerminalCommand[]
  handleHome: () => TerminalCommand[]
  handleEnd: () => TerminalCommand[]
  handleShiftEnter: () => TerminalCommand[]
  handleCtrlC: () => TerminalCommand[]
  handleTab: () => TabCompletionResult
}

export function useBashTerminal(options?: UseBashTerminalOptions): UseBashTerminalReturn {
  const [currentLine, setCurrentLine] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isMultiLineMode, setIsMultiLineMode] = useState(false)
  const [multiLineBuffer, setMultiLineBuffer] = useState<string[]>([])
  const [multiLineCursorLine, setMultiLineCursorLine] = useState(0)

  // Use refs to track latest values for callbacks
  const currentLineRef = useRef(currentLine)
  const cursorPositionRef = useRef(cursorPosition)
  const historyRef = useRef(history)
  const historyIndexRef = useRef(historyIndex)
  const isMultiLineModeRef = useRef(isMultiLineMode)
  const multiLineBufferRef = useRef(multiLineBuffer)
  const multiLineCursorLineRef = useRef(multiLineCursorLine)
  currentLineRef.current = currentLine
  cursorPositionRef.current = cursorPosition
  historyRef.current = history
  historyIndexRef.current = historyIndex
  isMultiLineModeRef.current = isMultiLineMode
  multiLineBufferRef.current = multiLineBuffer
  multiLineCursorLineRef.current = multiLineCursorLine

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
    const isMultiLine = isMultiLineModeRef.current
    const line = currentLineRef.current

    // In multi-line mode, add new line to buffer
    if (isMultiLine) {
      const buffer = multiLineBufferRef.current
      const cursorLine = multiLineCursorLineRef.current

      // Update buffer with current line and add empty new line
      const newBuffer = [...buffer]
      newBuffer[cursorLine] = line
      newBuffer.push('')

      setMultiLineBuffer(newBuffer)
      setMultiLineCursorLine(cursorLine + 1)
      setCurrentLine('')
      setCursorPosition(0)

      return [{ type: 'writeln', data: '' }]
    }

    // Single line mode - execute command
    const trimmedLine = line.trim()

    if (trimmedLine) {
      // Add to history
      setHistory((prev) => [...prev, trimmedLine])
      setHistoryIndex(-1)

      // Call onCommand callback
      if (options?.onCommand) {
        options.onCommand(trimmedLine)
      }
    }

    // Clear line
    setCurrentLine('')
    setCursorPosition(0)

    return [{ type: 'writeln', data: '' }]
  }, [options])

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

      return [
        { type: 'clearLine' },
      ]
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

  const handleHome = useCallback((): TerminalCommand[] => {
    const pos = cursorPositionRef.current

    if (pos > 0) {
      setCursorPosition(0)
      return [{ type: 'moveCursor', direction: 'left', count: pos }]
    }
    return []
  }, [])

  const handleEnd = useCallback((): TerminalCommand[] => {
    const pos = cursorPositionRef.current
    const line = currentLineRef.current
    const lineLength = line.length

    if (pos < lineLength) {
      setCursorPosition(lineLength)
      return [{ type: 'moveCursor', direction: 'right', count: lineLength - pos }]
    }
    return []
  }, [])

  const handleShiftEnter = useCallback((): TerminalCommand[] => {
    const isMultiLine = isMultiLineModeRef.current
    const line = currentLineRef.current

    if (!isMultiLine) {
      // Enter multi-line mode
      setIsMultiLineMode(true)
      setMultiLineBuffer([line])
      setMultiLineCursorLine(0)

      return [{ type: 'writeln', data: '' }]
    }

    // Exit multi-line mode and execute
    const buffer = multiLineBufferRef.current
    const cursorLine = multiLineCursorLineRef.current

    // Update buffer with current line
    const finalBuffer = [...buffer]
    finalBuffer[cursorLine] = line

    // Join all lines
    const fullCommand = finalBuffer.join('\n').trim()

    // Reset multi-line state
    setIsMultiLineMode(false)
    setMultiLineBuffer([])
    setMultiLineCursorLine(0)
    setCurrentLine('')
    setCursorPosition(0)

    if (fullCommand) {
      // Add to history
      setHistory((prev) => [...prev, fullCommand])
      setHistoryIndex(-1)

      // Call onCommand callback
      if (options?.onCommand) {
        options.onCommand(fullCommand)
      }
    }

    return [{ type: 'writeln', data: '' }]
  }, [options])

  const handleCtrlC = useCallback((): TerminalCommand[] => {
    const isMultiLine = isMultiLineModeRef.current

    setCurrentLine('')
    setCursorPosition(0)

    if (isMultiLine) {
      setIsMultiLineMode(false)
      setMultiLineBuffer([])
      setMultiLineCursorLine(0)
    }

    return [
      { type: 'write', data: '^C' },
      { type: 'writeln', data: '' },
    ]
  }, [])

  const handleTab = useCallback((): TabCompletionResult => {
    const line = currentLineRef.current
    const pos = cursorPositionRef.current

    // Get available completions from options
    const commandNames = options?.commandNames ?? []
    const getPathCompletions = options?.getPathCompletions

    // Convert path completions to CompletionEntry array
    const files: CompletionEntry[] = getPathCompletions ? getPathCompletions('') : []

    // Get tab completion result
    const result = getTabCompletions(line, pos, commandNames, files)

    // If text changed, update state and return terminal commands
    if (result.completedText !== line) {
      const oldPos = pos
      const newLine = result.completedText
      const newPos = newLine.length - line.slice(pos).length

      setCurrentLine(newLine)
      setCursorPosition(newPos)

      // Calculate terminal commands to update display
      const commands: TerminalCommand[] = []

      // Move cursor back to start of line, clear, and rewrite
      if (oldPos > 0) {
        commands.push({ type: 'moveCursor', direction: 'left', count: oldPos })
      }
      commands.push({ type: 'clearToEnd' })
      commands.push({ type: 'write', data: newLine })

      // Position cursor correctly if not at end
      const afterCursor = line.slice(pos)
      if (afterCursor.length > 0) {
        commands.push({ type: 'moveCursor', direction: 'left', count: afterCursor.length })
      }

      return { commands, suggestions: [] }
    }

    // No completion - return suggestions if any
    return {
      commands: [],
      suggestions: result.suggestions,
      truncatedCount: result.truncatedCount,
    }
  }, [options])

  return {
    currentLine,
    cursorPosition,
    history,
    historyIndex,
    isMultiLineMode,
    multiLineBuffer,
    multiLineCursorLine,
    handleCharacter,
    handleBackspace,
    handleEnter,
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleHome,
    handleEnd,
    handleShiftEnter,
    handleCtrlC,
    handleTab,
  }
}
