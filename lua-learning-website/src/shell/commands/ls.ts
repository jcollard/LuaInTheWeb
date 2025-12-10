import type { Command, CommandResult, ShellContext, FileEntry } from '../types';
import { resolvePath } from '../pathUtils';

/**
 * ls - List Directory Contents
 * Lists files and directories in the specified or current directory
 */
export const lsCommand: Command = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [directory]',
  execute: async (
    args: string[],
    context: ShellContext
  ): Promise<CommandResult> => {
    // Use current directory if no path specified
    const targetPath = args[0]
      ? resolvePath(context.cwd, args[0])
      : context.cwd;

    // Check if path exists
    if (!context.fs.exists(targetPath)) {
      const error = `ls: cannot access '${args[0] || '.'}': No such file or directory`;
      context.writeln(error);
      return { exitCode: 1, error };
    }

    // Check if it's a directory
    if (!context.fs.isDirectory(targetPath)) {
      const error = `ls: ${args[0] || '.'}: not a directory`;
      context.writeln(error);
      return { exitCode: 1, error };
    }

    // Get directory contents
    const entries = context.fs.listDirectory(targetPath);

    // Sort: directories first, then alphabetically within each type
    const sorted = sortEntries(entries);

    // Output each entry
    for (const entry of sorted) {
      const displayName = entry.isDirectory ? `${entry.name}/` : entry.name;
      context.writeln(displayName);
    }

    return { exitCode: 0 };
  },
};

/**
 * Sort entries: directories first, then alphabetically within each type
 */
function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    // Directories first
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}
