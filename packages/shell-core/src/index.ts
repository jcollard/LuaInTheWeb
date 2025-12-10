/**
 * @lua-learning/shell-core
 *
 * Core shell infrastructure for the Lua learning platform.
 * Provides filesystem abstractions, command registry, and built-in commands.
 */

export const VERSION = '0.0.1'

// Types
export type {
  FileEntry,
  IFileSystem,
  CommandResult,
  ParsedCommand,
  Command,
  ShellOptions,
} from './types'

// Path utilities
export {
  normalizePath,
  joinPath,
  resolvePath,
  isAbsolutePath,
  getParentPath,
  getBasename,
} from './pathUtils'

// Command parsing
export { parseCommand } from './parseCommand'
