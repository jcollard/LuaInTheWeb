/**
 * pwd command - print working directory.
 */

import type { Command, CommandResult, IFileSystem } from '../types'

/**
 * pwd command implementation.
 * Prints the current working directory.
 */
export const pwd: Command = {
  name: 'pwd',
  description: 'Print the current working directory',
  usage: 'pwd',

  execute(_args: string[], fs: IFileSystem): CommandResult {
    const currentDir = fs.getCurrentDirectory()
    return {
      exitCode: 0,
      stdout: currentDir,
      stderr: '',
    }
  },
}
