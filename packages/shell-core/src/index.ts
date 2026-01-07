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

// New interfaces for process-based command execution
export type { ShellContext, ScreenMode } from './interfaces/ShellContext'
export type { IProcess, KeyModifiers } from './interfaces/IProcess'
export type { ICommand } from './interfaces/ICommand'

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

// Command registry
export { CommandRegistry } from './CommandRegistry'

// Process management
export { ProcessManager } from './ProcessManager'

// Adapters for backward compatibility
export { LegacyCommandAdapter } from './adapters/LegacyCommandAdapter'

// Filesystem adapter
export { createFileSystemAdapter } from './createFileSystemAdapter'
export type { ExternalFileSystem } from './createFileSystemAdapter'

// File System Access API implementation
export {
  FileSystemAccessAPIFileSystem,
  isFileSystemAccessSupported,
} from './FileSystemAccessAPIFileSystem'

// Composite filesystem for multi-mount support
export { CompositeFileSystem } from './CompositeFileSystem'
export type { MountPoint, CompositeFileSystemConfig } from './CompositeFileSystem'

// Built-in commands
export {
  pwd,
  cd,
  ls,
  createHelpCommand,
  registerBuiltinCommands,
  builtinCommands,
} from './commands'

// Tab completion
export {
  getCommandCompletions,
  getPathCompletions,
  getCompletionContext,
} from './tabCompletion'
export type { CompletionContext } from './tabCompletion'

// Binary file utilities
export { BINARY_EXTENSIONS, isBinaryExtension } from './binaryExtensions'
