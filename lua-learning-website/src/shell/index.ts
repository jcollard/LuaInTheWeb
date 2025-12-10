// Types
export type {
  Command,
  CommandResult,
  ShellContext,
  IFileSystem,
  FileEntry,
} from './types';

// Core infrastructure
export { CommandRegistry } from './CommandRegistry';
export { parseCommand, type ParsedCommand } from './parseCommand';
export { resolvePath, normalizePath, getParentPath, joinPath } from './pathUtils';
export { createFileSystemAdapter } from './createFileSystemAdapter';

// Commands
export { pwdCommand } from './commands/pwd';
export { cdCommand } from './commands/cd';
export { lsCommand } from './commands/ls';
export { createHelpCommand } from './commands/help';
