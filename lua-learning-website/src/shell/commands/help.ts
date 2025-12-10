import type { Command, CommandResult, ShellContext } from '../types';
import type { CommandRegistry } from '../CommandRegistry';

/**
 * Create a help command that uses the provided registry
 * This is a factory function because help needs access to the registry
 */
export function createHelpCommand(registry: CommandRegistry): Command {
  return {
    name: 'help',
    description: 'Show help information for commands',
    usage: 'help [command]',
    execute: async (
      args: string[],
      context: ShellContext
    ): Promise<CommandResult> => {
      // If a specific command is requested
      if (args.length > 0) {
        const commandName = args[0];
        const command = registry.get(commandName);

        if (!command) {
          const error = `help: command '${commandName}' not found`;
          context.writeln(error);
          return { exitCode: 1, error };
        }

        // Show detailed help for specific command
        context.writeln(`${command.name} - ${command.description}`);
        context.writeln('');
        context.writeln(`Usage: ${command.usage}`);
        return { exitCode: 0 };
      }

      // Show all commands
      context.writeln('Available commands:');
      context.writeln('');

      const commands = registry.list();
      for (const cmd of commands) {
        context.writeln(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
      }

      context.writeln('');
      context.writeln("Type 'help <command>' for more information.");

      return { exitCode: 0 };
    },
  };
}
