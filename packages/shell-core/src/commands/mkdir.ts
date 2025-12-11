/**
 * mkdir command - create directory.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath } from '../pathUtils'

/**
 * mkdir command implementation.
 * Creates directories at the specified paths.
 */
export const mkdir: Command = {
  name: 'mkdir',
  description: 'Create directories',
  usage: 'mkdir <directory>...',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Check for required argument
    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'mkdir: missing operand',
      }
    }

    const currentDir = fs.getCurrentDirectory()
    const errors: string[] = []

    // Create all directories, collecting errors
    for (const targetPath of args) {
      const resolvedPath = resolvePath(currentDir, targetPath)

      try {
        fs.createDirectory(resolvedPath)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`mkdir: cannot create directory '${resolvedPath}': ${message}`)
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
