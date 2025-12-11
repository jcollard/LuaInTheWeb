/**
 * ls command - list directory contents.
 */

import type { Command, CommandResult, IFileSystem, FileEntry } from '../types'
import { resolvePath, getBasename } from '../pathUtils'

/**
 * Sort entries: directories first (alphabetically), then files (alphabetically).
 */
function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    // Directories come before files
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    // Within same type, sort alphabetically
    return a.name.localeCompare(b.name)
  })
}

/**
 * Format an entry for display.
 * Appends / to directory names.
 */
function formatEntry(entry: FileEntry): string {
  return entry.type === 'directory' ? `${entry.name}/` : entry.name
}

/**
 * ls command implementation.
 * Lists directory contents.
 */
export const ls: Command = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [path]',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Default to current directory if no path provided
    const targetPath = args[0] ?? fs.getCurrentDirectory()

    // Resolve the path relative to current directory
    const currentDir = fs.getCurrentDirectory()
    const resolvedPath = resolvePath(currentDir, targetPath)

    // Check if path exists
    if (!fs.exists(resolvedPath)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `ls: ${resolvedPath}: no such file or directory`,
      }
    }

    // If path is a file, just show the filename
    if (fs.isFile(resolvedPath)) {
      return {
        exitCode: 0,
        stdout: getBasename(resolvedPath),
        stderr: '',
      }
    }

    // List directory contents
    const entries = fs.listDirectory(resolvedPath)

    // Sort and format entries
    const sortedEntries = sortEntries(entries)
    const output = sortedEntries.map(formatEntry).join('\n')

    return {
      exitCode: 0,
      stdout: output,
      stderr: '',
    }
  },
}
