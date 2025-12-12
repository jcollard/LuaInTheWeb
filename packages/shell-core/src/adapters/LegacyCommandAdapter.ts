/**
 * Adapter for wrapping legacy Command implementations to work with ICommand interface.
 * Provides backward compatibility for existing commands.
 */

import type { Command } from '../types'
import type { ICommand } from '../interfaces/ICommand'
import type { ShellContext } from '../interfaces/ShellContext'

/**
 * Adapts legacy Command objects to the new ICommand interface.
 *
 * Legacy commands use: execute(args, fs) => CommandResult
 * New commands use: execute(args, context) => IProcess | void
 *
 * The adapter bridges these interfaces, allowing existing commands
 * to work in the new process-based shell architecture.
 */
export class LegacyCommandAdapter {
  /**
   * Adapt a legacy Command to the ICommand interface.
   * @param command - The legacy command to adapt
   * @returns An ICommand-compatible wrapper
   */
  static adapt(command: Command): ICommand {
    return {
      name: command.name,
      description: command.description,
      usage: command.usage,

      execute(args: string[], context: ShellContext): void {
        const result = command.execute(args, context.filesystem)

        if (result.stdout) {
          context.output(result.stdout)
        }

        if (result.stderr) {
          context.error(result.stderr)
        }

        // Legacy commands don't return processes - they complete immediately
        return undefined
      },
    }
  }
}
