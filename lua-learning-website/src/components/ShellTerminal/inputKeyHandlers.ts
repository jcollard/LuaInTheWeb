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

/**
 * File entry for tab completion
 */
export interface CompletionEntry {
  name: string
  type: 'file' | 'directory'
}

/**
 * Result of tab completion operation
 */
export interface TabCompletionResultData {
  /** The completed text (full line with completion applied) */
  completedText: string
  /** Suggestions to display (only when common prefix doesn't extend input) */
  suggestions: string[]
  /** Total count when more than 10 matches */
  truncatedCount?: number
}

/**
 * Finds the longest common prefix among an array of strings.
 * Used for tab completion to complete partial matches to their common prefix.
 *
 * @param strings - Array of strings to find common prefix from
 * @returns The longest common prefix, or empty string if none exists
 */
export function findLongestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) {
    return ''
  }

  if (strings.length === 1) {
    return strings[0]
  }

  // Start with the first string as the potential prefix
  let prefix = strings[0]

  // Compare with each subsequent string
  for (let i = 1; i < strings.length; i++) {
    const current = strings[i]

    // Reduce prefix until it matches the start of current string
    while (prefix.length > 0 && !current.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }

    // Early exit if no common prefix
    if (prefix.length === 0) {
      return ''
    }
  }

  return prefix
}

/**
 * Gets the word being completed at the cursor position.
 * Returns the word, its start position, and whether it's a command (first word) or path.
 */
function getWordAtCursor(
  line: string,
  cursorPosition: number
): { word: string; startPos: number; isCommand: boolean } {
  // Find the start of the current word (go back until space or start)
  let startPos = cursorPosition
  while (startPos > 0 && line[startPos - 1] !== ' ') {
    startPos--
  }

  // Get the word from start to cursor
  const word = line.slice(startPos, cursorPosition)

  // Determine if this is the first word (command) or a subsequent word (path)
  const isCommand = startPos === 0

  return { word, startPos, isCommand }
}

/**
 * Processes tab completion for a given input line.
 * Implements partial completion: completes to the longest common prefix when multiple matches exist.
 *
 * @param line - Current input line
 * @param cursorPosition - Current cursor position in the line
 * @param commands - Available command names for completion
 * @param files - Available file/directory entries for path completion
 * @returns Tab completion result with completed text and suggestions
 */
export function getTabCompletions(
  line: string,
  cursorPosition: number,
  commands: string[],
  files: CompletionEntry[]
): TabCompletionResultData {
  const { word, startPos, isCommand } = getWordAtCursor(line, cursorPosition)

  // Get the rest of the line after the cursor
  const afterCursor = line.slice(cursorPosition)

  let matches: string[] = []
  const matchTypes: Map<string, 'file' | 'directory' | 'command'> = new Map()

  if (isCommand) {
    // At command position - try command completion first
    const commandMatches = commands.filter((cmd) => cmd.startsWith(word)).sort()

    if (commandMatches.length > 0) {
      // Use command completions
      matches = commandMatches
      matches.forEach((m) => matchTypes.set(m, 'command'))
    } else {
      // No command matches - try file completion
      const fileMatches = files.filter((f) => f.name.startsWith(word))
      matches = fileMatches.map((f) => f.name).sort()
      fileMatches.forEach((f) => matchTypes.set(f.name, f.type))
    }
  } else {
    // Path completion - filter files by prefix
    const fileMatches = files.filter((f) => f.name.startsWith(word))
    matches = fileMatches.map((f) => f.name).sort()
    fileMatches.forEach((f) => matchTypes.set(f.name, f.type))
  }

  // No matches - return unchanged
  if (matches.length === 0) {
    return {
      completedText: line,
      suggestions: [],
    }
  }

  // Single match - complete fully with appropriate suffix
  if (matches.length === 1) {
    const match = matches[0]
    const type = matchTypes.get(match)
    const suffix = type === 'directory' ? '/' : ' '
    const completedWord = match + suffix

    const completedText = line.slice(0, startPos) + completedWord + afterCursor

    return {
      completedText,
      suggestions: [],
    }
  }

  // Multiple matches - find common prefix
  const commonPrefix = findLongestCommonPrefix(matches)

  // If common prefix extends beyond what user typed, complete to it
  if (commonPrefix.length > word.length) {
    const completedText = line.slice(0, startPos) + commonPrefix + afterCursor

    return {
      completedText,
      suggestions: [],
    }
  }

  // No additional common prefix - show suggestions
  const truncatedCount = matches.length > 10 ? matches.length : undefined
  const displaySuggestions = matches.slice(0, 10)

  return {
    completedText: line,
    suggestions: displaySuggestions,
    truncatedCount,
  }
}
