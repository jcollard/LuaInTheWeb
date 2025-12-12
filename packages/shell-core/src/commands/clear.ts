/**
 * clear command - clear terminal screen.
 */

import type { Command, CommandResult, IFileSystem } from '../types'

/**
 * clear command implementation.
 * Outputs ANSI escape sequence to clear the terminal screen.
 */
export const clear: Command = {
  name: 'clear',
  description: 'Clear the terminal screen',
  usage: 'clear',

  execute(_args: string[], _fs: IFileSystem): CommandResult {
    // ANSI escape sequences:
    // \x1b[2J - Clear entire screen
    // \x1b[H  - Move cursor to home position (1,1)
    return {
      exitCode: 0,
      stdout: '\x1b[2J\x1b[H',
      stderr: '',
    }
  },
}
