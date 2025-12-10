/**
 * help command - display help information.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import type { CommandRegistry } from '../CommandRegistry'

/**
 * Create a help command that has access to the command registry.
 * @param registry - The command registry to list commands from
 * @returns A help command instance
 */
export function createHelpCommand(registry: CommandRegistry): Command {
  return {
    name: 'help',
    description: 'Display help information for commands',
    usage: 'help [command]',

    execute(args: string[], _fs: IFileSystem): CommandResult {
      const commandName = args[0]

      // If a specific command is requested
      if (commandName) {
        const command = registry.get(commandName)

        if (!command) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `help: command '${commandName}' not found`,
          }
        }

        // Show detailed help for the command
        const output = [
          `${command.name} - ${command.description}`,
          '',
          `Usage: ${command.usage}`,
        ].join('\n')

        return {
          exitCode: 0,
          stdout: output,
          stderr: '',
        }
      }

      // List all commands
      const commands = registry.list()

      if (commands.length === 0) {
        return {
          exitCode: 0,
          stdout: 'No commands available',
          stderr: '',
        }
      }

      // Sort commands alphabetically
      const sortedCommands = [...commands].sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      // Format output
      const lines = ['Available commands:', '']

      for (const cmd of sortedCommands) {
        lines.push(`  ${cmd.name.padEnd(12)} ${cmd.description}`)
      }

      lines.push('')
      lines.push('Type "help <command>" for more information.')

      return {
        exitCode: 0,
        stdout: lines.join('\n'),
        stderr: '',
      }
    },
  }
}
