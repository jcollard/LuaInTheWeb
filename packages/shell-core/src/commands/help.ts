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
        // Try legacy Command first
        const legacyCommand = registry.get(commandName)
        // Try ICommand if not found
        const iCommand = !legacyCommand ? registry.getICommand(commandName) : null
        const command = legacyCommand || iCommand

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

      // List all commands (both legacy Command and ICommand)
      const allCommandNames = registry.names()

      if (allCommandNames.length === 0) {
        return {
          exitCode: 0,
          stdout: 'No commands available',
          stderr: '',
        }
      }

      // Sort command names alphabetically
      const sortedNames = [...allCommandNames].sort((a, b) => a.localeCompare(b))

      // Format output
      const lines = ['Available commands:', '']

      for (const name of sortedNames) {
        // Try legacy Command first
        const legacyCmd = registry.get(name)
        if (legacyCmd) {
          lines.push(`  ${legacyCmd.name.padEnd(12)} ${legacyCmd.description}`)
          continue
        }
        // Try ICommand
        const iCmd = registry.getICommand(name)
        if (iCmd) {
          lines.push(`  ${iCmd.name.padEnd(12)} ${iCmd.description}`)
        }
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
