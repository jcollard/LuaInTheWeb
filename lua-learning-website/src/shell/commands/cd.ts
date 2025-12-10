import type { Command, CommandResult, ShellContext } from '../types';
import { resolvePath } from '../pathUtils';

/**
 * cd - Change Directory
 * Changes the current working directory
 */
export const cdCommand: Command = {
  name: 'cd',
  description: 'Change the current working directory',
  usage: 'cd [directory]',
  execute: async (
    args: string[],
    context: ShellContext
  ): Promise<CommandResult> => {
    // No arguments or ~ means go to home (root)
    const target = args[0] ?? '~';

    // Handle cd - (previous directory)
    if (target === '-') {
      const newPath = context.previousCwd;
      context.setPreviousCwd(context.cwd);
      context.setCwd(newPath);
      context.writeln(newPath);
      return { exitCode: 0 };
    }

    // Resolve the target path
    const newPath = resolvePath(context.cwd, target);

    // Check if path exists
    if (!context.fs.exists(newPath)) {
      const error = `cd: ${target}: No such file or directory`;
      context.writeln(error);
      return { exitCode: 1, error };
    }

    // Check if it's a directory
    if (!context.fs.isDirectory(newPath)) {
      const error = `cd: ${target}: not a directory`;
      context.writeln(error);
      return { exitCode: 1, error };
    }

    // Save current directory as previous before changing
    context.setPreviousCwd(context.cwd);

    // Change directory
    context.setCwd(newPath);

    return { exitCode: 0 };
  },
};
