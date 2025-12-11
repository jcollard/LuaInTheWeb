/**
 * Input key handlers for BashTerminal
 * Pure functions that process keyboard input and return state updates
 */

export interface InputState {
  currentLine: string
  cursorPosition: number
  history: string[]
  historyIndex: number
  isMultiLineMode: boolean
  multiLineBuffer: string[]
  multiLineCursorLine: number
  collapsedHistoryItem: string | null
}

export interface InputStateUpdate {
  currentLine?: string
  cursorPosition?: number
  history?: string[]
  historyIndex?: number
  isMultiLineMode?: boolean
  multiLineBuffer?: string[]
  multiLineCursorLine?: number
  collapsedHistoryItem?: string | null
}

export interface EnterResult {
  stateUpdate: InputStateUpdate
  commandToExecute?: string
  isMultiLineNewLine?: boolean
  lineBeforeSplit?: number
}

export interface ArrowResult {
  stateUpdate: InputStateUpdate
  displayCommand?: string
}

/**
 * Handles Enter key press in both single-line and multi-line modes
 */
export function handleEnterKey(state: InputState): EnterResult {
  const { currentLine, cursorPosition, isMultiLineMode, multiLineBuffer, multiLineCursorLine, history, historyIndex } = state

  if (isMultiLineMode) {
    // Split current line at cursor position
    const beforeCursor = currentLine.slice(0, cursorPosition)
    const afterCursor = currentLine.slice(cursorPosition)
    const lineBeforeSplit = multiLineCursorLine

    // Update current line with content before cursor
    const newBuffer = [...multiLineBuffer]
    newBuffer[lineBeforeSplit] = beforeCursor

    // Insert new line with content after cursor
    const newCursorLine = multiLineCursorLine + 1
    newBuffer.splice(newCursorLine, 0, afterCursor)

    return {
      stateUpdate: {
        multiLineBuffer: newBuffer,
        multiLineCursorLine: newCursorLine,
        currentLine: afterCursor,
        cursorPosition: 0,
      },
      isMultiLineNewLine: true,
      lineBeforeSplit,
    }
  }

  // Single-line mode - execute command
  const trimmedLine = currentLine.trim()
  const newHistory = trimmedLine ? [...history, trimmedLine] : history
  const newHistoryIndex = trimmedLine ? newHistory.length : historyIndex

  return {
    stateUpdate: {
      currentLine: '',
      cursorPosition: 0,
      history: newHistory,
      historyIndex: newHistoryIndex,
      collapsedHistoryItem: null,
    },
    commandToExecute: trimmedLine || undefined,
  }
}

/**
 * Handles Arrow Up key for history navigation or multi-line cursor movement
 */
export function handleArrowUp(state: InputState): ArrowResult {
  const { currentLine, cursorPosition, history, historyIndex, isMultiLineMode, multiLineBuffer, multiLineCursorLine } = state

  if (isMultiLineMode) {
    if (multiLineCursorLine > 0) {
      // Save current line and move to previous
      const newBuffer = [...multiLineBuffer]
      newBuffer[multiLineCursorLine] = currentLine

      const newCursorLine = multiLineCursorLine - 1
      const prevLine = newBuffer[newCursorLine]
      const targetPos = Math.min(cursorPosition, prevLine.length)

      return {
        stateUpdate: {
          multiLineBuffer: newBuffer,
          multiLineCursorLine: newCursorLine,
          currentLine: prevLine,
          cursorPosition: targetPos,
        },
      }
    }
    return { stateUpdate: {} }
  }

  // History navigation
  if (history.length > 0 && historyIndex > 0) {
    const newIndex = historyIndex - 1
    const historyCommand = history[newIndex]

    let displayCommand = historyCommand
    let collapsedHistoryItem: string | null = null
    if (historyCommand.includes('\n')) {
      displayCommand = historyCommand.replace(/\n/g, ' ')
      collapsedHistoryItem = historyCommand
    }

    return {
      stateUpdate: {
        historyIndex: newIndex,
        currentLine: displayCommand,
        cursorPosition: displayCommand.length,
        collapsedHistoryItem,
      },
      displayCommand,
    }
  }

  if (history.length > 0 && historyIndex === -1) {
    const newIndex = history.length - 1
    const historyCommand = history[newIndex]

    let displayCommand = historyCommand
    let collapsedHistoryItem: string | null = null
    if (historyCommand.includes('\n')) {
      displayCommand = historyCommand.replace(/\n/g, ' ')
      collapsedHistoryItem = historyCommand
    }

    return {
      stateUpdate: {
        historyIndex: newIndex,
        currentLine: displayCommand,
        cursorPosition: displayCommand.length,
        collapsedHistoryItem,
      },
      displayCommand,
    }
  }

  return { stateUpdate: {} }
}

/**
 * Handles Arrow Down key for history navigation or multi-line cursor movement
 */
export function handleArrowDown(state: InputState): ArrowResult {
  const { currentLine, cursorPosition, history, historyIndex, isMultiLineMode, multiLineBuffer, multiLineCursorLine } = state

  if (isMultiLineMode) {
    if (multiLineCursorLine < multiLineBuffer.length - 1) {
      // Save current line and move to next
      const newBuffer = [...multiLineBuffer]
      newBuffer[multiLineCursorLine] = currentLine

      const newCursorLine = multiLineCursorLine + 1
      const nextLine = newBuffer[newCursorLine]
      const targetPos = Math.min(cursorPosition, nextLine.length)

      return {
        stateUpdate: {
          multiLineBuffer: newBuffer,
          multiLineCursorLine: newCursorLine,
          currentLine: nextLine,
          cursorPosition: targetPos,
        },
      }
    }
    return { stateUpdate: {} }
  }

  // History navigation
  if (historyIndex < history.length && historyIndex !== -1) {
    const newIndex = historyIndex + 1

    if (newIndex >= history.length) {
      return {
        stateUpdate: {
          historyIndex: -1,
          currentLine: '',
          cursorPosition: 0,
          collapsedHistoryItem: null,
        },
        displayCommand: '',
      }
    }

    const historyCommand = history[newIndex]
    let displayCommand = historyCommand
    let collapsedHistoryItem: string | null = null
    if (historyCommand.includes('\n')) {
      displayCommand = historyCommand.replace(/\n/g, ' ')
      collapsedHistoryItem = historyCommand
    }

    return {
      stateUpdate: {
        historyIndex: newIndex,
        currentLine: displayCommand,
        cursorPosition: displayCommand.length,
        collapsedHistoryItem,
      },
      displayCommand,
    }
  }

  return { stateUpdate: {} }
}

/**
 * Handles backspace key, including multi-line line merging
 */
export function handleBackspace(state: InputState): InputStateUpdate & { shouldMergeLines?: boolean; previousLineIndex?: number } {
  const { currentLine, cursorPosition, isMultiLineMode, multiLineBuffer, multiLineCursorLine } = state

  // Multi-line mode at beginning of line (not first line) - merge with previous
  if (isMultiLineMode && cursorPosition === 0 && multiLineCursorLine > 0) {
    const previousLineIndex = multiLineCursorLine - 1
    const previousContent = multiLineBuffer[previousLineIndex]
    const mergedContent = previousContent + currentLine

    const newBuffer = [...multiLineBuffer]
    newBuffer[previousLineIndex] = mergedContent
    newBuffer.splice(multiLineCursorLine, 1)

    return {
      multiLineBuffer: newBuffer,
      multiLineCursorLine: previousLineIndex,
      currentLine: mergedContent,
      cursorPosition: previousContent.length,
      shouldMergeLines: true,
      previousLineIndex,
    }
  }

  // Normal backspace
  if (cursorPosition > 0) {
    const beforeCursor = currentLine.slice(0, cursorPosition - 1)
    const afterCursor = currentLine.slice(cursorPosition)
    const newLine = beforeCursor + afterCursor

    return {
      currentLine: newLine,
      cursorPosition: cursorPosition - 1,
      multiLineBuffer: isMultiLineMode
        ? multiLineBuffer.map((line, i) => i === multiLineCursorLine ? newLine : line)
        : multiLineBuffer,
    }
  }

  return {}
}

/**
 * Handles printable character input
 */
export function handleCharacter(state: InputState, char: string): InputStateUpdate {
  const { currentLine, cursorPosition } = state

  const beforeCursor = currentLine.slice(0, cursorPosition)
  const afterCursor = currentLine.slice(cursorPosition)
  const newLine = beforeCursor + char + afterCursor

  return {
    currentLine: newLine,
    cursorPosition: cursorPosition + 1,
  }
}
