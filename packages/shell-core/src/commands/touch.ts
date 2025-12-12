/**
 * touch command - create empty file or update timestamp.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath } from '../pathUtils'

/**
 * touch command implementation.
 * Creates an empty file if it doesn't exist, or does nothing if it already exists.
 * Supports multiple file arguments like bash.
 */
export const touch: Command = {
  name: 'touch',
  description: 'Create an empty file or update timestamp',
  usage: 'touch <file>...',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Check for required argument
    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'touch: missing file operand',
      }
    }

    const currentDir = fs.getCurrentDirectory()
    const errors: string[] = []

    // Process all files
    for (const targetPath of args) {
      const resolvedPath = resolvePath(currentDir, targetPath)

      // If path is a directory, skip it (success, like bash)
      if (fs.exists(resolvedPath) && fs.isDirectory(resolvedPath)) {
        continue
      }

      // If file already exists, do nothing (success)
      if (fs.exists(resolvedPath) && fs.isFile(resolvedPath)) {
        continue
      }

      // Create new empty file
      try {
        fs.writeFile(resolvedPath, '')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`touch: cannot touch '${resolvedPath}': ${message}`)
      }
    }

    if (errors.length > 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: errors.join('\n'),
      }
    }

    return {
      exitCode: 0,
      stdout: '',
      stderr: '',
    }
  },
}
