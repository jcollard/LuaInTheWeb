/**
 * cd command - change directory.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath } from '../pathUtils'

/**
 * cd command implementation.
 * Changes the current working directory.
 */
export const cd: Command = {
  name: 'cd',
  description: 'Change the current working directory',
  usage: 'cd [path]',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Default to root if no path provided
    const targetPath = args[0] ?? '/'

    // Resolve the path relative to current directory
    const currentDir = fs.getCurrentDirectory()
    const resolvedPath = resolvePath(currentDir, targetPath)

    // Check if path exists
    if (!fs.exists(resolvedPath)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cd: ${resolvedPath}: no such file or directory`,
      }
    }

    // Check if path is a directory
    if (!fs.isDirectory(resolvedPath)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cd: ${resolvedPath}: not a directory`,
      }
    }

    // Change directory
    fs.setCurrentDirectory(resolvedPath)

    return {
      exitCode: 0,
      stdout: '',
      stderr: '',
    }
  },
}
