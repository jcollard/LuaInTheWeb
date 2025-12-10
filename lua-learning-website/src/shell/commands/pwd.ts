import type { Command, CommandResult, ShellContext } from '../types';

/**
 * pwd - Print Working Directory
 * Displays the current directory path
 */
export const pwdCommand: Command = {
  name: 'pwd',
  description: 'Print the current working directory',
  usage: 'pwd',
  execute: async (
    _args: string[],
    context: ShellContext
  ): Promise<CommandResult> => {
    context.writeln(context.cwd);
    return { exitCode: 0 };
  },
};
