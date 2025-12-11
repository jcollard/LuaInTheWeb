/**
 * mkdir command - create directory.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath } from '../pathUtils'

/**
 * mkdir command implementation.
 * Creates a directory at the specified path.
 */
export const mkdir: Command = {
  name: 'mkdir',
  description: 'Create a directory',
  usage: 'mkdir <directory>',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Check for required argument
    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'mkdir: missing operand',
      }
    }

    const targetPath = args[0]
    const currentDir = fs.getCurrentDirectory()
    const resolvedPath = resolvePath(currentDir, targetPath)

    try {
      fs.createDirectory(resolvedPath)
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
        stderr: `mkdir: cannot create directory '${resolvedPath}': ${message}`,
      }
    }
  },
}
