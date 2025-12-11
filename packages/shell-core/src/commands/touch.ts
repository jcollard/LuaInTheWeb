/**
 * touch command - create empty file or update timestamp.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath } from '../pathUtils'

/**
 * touch command implementation.
 * Creates an empty file if it doesn't exist, or does nothing if it already exists.
 */
export const touch: Command = {
  name: 'touch',
  description: 'Create an empty file or update timestamp',
  usage: 'touch <file>',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Check for required argument
    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'touch: missing file operand',
      }
    }

    const targetPath = args[0]
    const currentDir = fs.getCurrentDirectory()
    const resolvedPath = resolvePath(currentDir, targetPath)

    // Check if path is a directory
    if (fs.exists(resolvedPath) && fs.isDirectory(resolvedPath)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `touch: '${resolvedPath}' is a directory`,
      }
    }

    // If file already exists, do nothing (success)
    if (fs.exists(resolvedPath) && fs.isFile(resolvedPath)) {
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      }
    }

    // Create new empty file
    try {
      fs.writeFile(resolvedPath, '')
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        exitCode: 1,
        stdout: '',
        stderr: `touch: cannot touch '${resolvedPath}': ${message}`,
      }
    }
  },
}
