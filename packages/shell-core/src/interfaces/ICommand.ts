/**
 * Interface for shell commands that can return processes.
 * Extends the command pattern to support both simple and long-running commands.
 */

import type { IProcess } from './IProcess'
import type { ShellContext } from './ShellContext'

/**
 * A shell command that can be executed with a context.
 * Commands can either complete immediately (returning void) or
 * return a process for long-running/interactive operations.
 */
export interface ICommand {
  /**
   * The command name (e.g., 'lua', 'cd', 'ls').
   */
  name: string

  /**
   * Brief description of what the command does.
   */
  description: string

  /**
   * Usage pattern (e.g., 'lua [filename]', 'cd [path]').
   */
  usage: string

  /**
   * Execute the command.
   * @param args - Command arguments (excluding the command name)
   * @param context - Shell execution context with filesystem and I/O
   * @returns IProcess for long-running commands, void for simple commands
   */
  execute(args: string[], context: ShellContext): IProcess | void
}
