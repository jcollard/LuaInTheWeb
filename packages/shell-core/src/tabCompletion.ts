/**
 * Tab completion logic for shell commands and file paths.
 */

import type { FileEntry, IFileSystem } from './types'
import { getParentPath, getBasename, resolvePath, isAbsolutePath } from './pathUtils'

/**
 * Context describing what is being completed and where to replace.
 */
export interface CompletionContext {
  /** Type of completion: command (first word) or path (subsequent arguments) */
  type: 'command' | 'path'
  /** The partial text being completed */
  prefix: string
  /** Start index of text to replace in the input */
  replaceStart: number
  /** End index of text to replace in the input */
  replaceEnd: number
}

/**
 * Get command names that match a given prefix.
 * @param prefix - The partial command to match
 * @param commands - Array of available command names
 * @returns Array of matching command names
 */
export function getCommandCompletions(prefix: string, commands: string[]): string[] {
  if (prefix === '') {
    return commands
  }
  return commands.filter((cmd) => cmd.startsWith(prefix))
}

/**
 * Get file/directory entries that match a partial path.
 * @param partialPath - The partial path to complete
 * @param fs - Filesystem to search in
 * @returns Array of matching file entries
 */
export function getPathCompletions(partialPath: string, fs: IFileSystem): FileEntry[] {
  const cwd = fs.getCurrentDirectory()

  // Handle empty path - list current directory
  if (partialPath === '') {
    try {
      return fs.listDirectory(cwd)
    } catch {
      return []
    }
  }

  // Determine if this is an absolute or relative path
  const isAbsolute = isAbsolutePath(partialPath)

  // If path ends with /, list that directory
  if (partialPath.endsWith('/')) {
    const dirPath = isAbsolute ? partialPath.slice(0, -1) || '/' : resolvePath(cwd, partialPath.slice(0, -1) || '.')
    try {
      return fs.listDirectory(dirPath)
    } catch {
      return []
    }
  }

  // Split into directory and basename prefix
  const basename = getBasename(partialPath)
  const parentPath = getParentPath(partialPath)

  // Resolve the parent directory
  let dirToList: string
  if (isAbsolute) {
    dirToList = parentPath
  } else if (partialPath.includes('/')) {
    // Relative path with directory component
    dirToList = resolvePath(cwd, parentPath)
  } else {
    // Just a basename, list current directory
    dirToList = cwd
  }

  // List the directory and filter by prefix
  try {
    const entries = fs.listDirectory(dirToList)
    return entries.filter((entry) => entry.name.startsWith(basename))
  } catch {
    return []
  }
}

/**
 * Determine what type of completion is needed based on input and cursor position.
 * @param input - The current input line
 * @param cursorPosition - Position of cursor in the input
 * @returns Completion context with type, prefix, and replacement range
 */
export function getCompletionContext(input: string, cursorPosition: number): CompletionContext {
  // Get the portion of input up to cursor
  const textBeforeCursor = input.slice(0, cursorPosition)

  // Split into words (tokens separated by spaces)
  // We need to find which word the cursor is in
  let wordStart = 0
  let wordEnd = cursorPosition
  let wordIndex = 0

  // Find the start of the current word (going backwards from cursor)
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (textBeforeCursor[i] === ' ') {
      wordStart = i + 1
      break
    }
  }

  // Find word index (how many complete words before current position)
  const wordsBeforeCursor = textBeforeCursor.slice(0, wordStart).split(' ').filter((w) => w !== '')
  wordIndex = wordsBeforeCursor.length

  // Find the end of the current word (going forward from cursor)
  for (let i = cursorPosition; i < input.length; i++) {
    if (input[i] === ' ') {
      wordEnd = i
      break
    }
  }
  if (wordEnd < cursorPosition) {
    wordEnd = input.length
  }

  const prefix = input.slice(wordStart, cursorPosition)

  return {
    type: wordIndex === 0 ? 'command' : 'path',
    prefix,
    replaceStart: wordStart,
    replaceEnd: wordEnd,
  }
}
