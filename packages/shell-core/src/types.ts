/**
 * Core type definitions for shell-core package.
 */

/**
 * Represents a file or directory entry in the filesystem.
 */
export interface FileEntry {
  name: string
  type: 'file' | 'directory'
  path: string
}

/**
 * Abstraction for filesystem operations.
 * Allows shell commands to work with different filesystem implementations
 * (e.g., in-memory, browser-based, real filesystem).
 */
export interface IFileSystem {
  /**
   * Get the current working directory.
   */
  getCurrentDirectory(): string

  /**
   * Set the current working directory.
   * @param path - The new working directory path
   * @throws Error if the path doesn't exist or isn't a directory
   */
  setCurrentDirectory(path: string): void

  /**
   * Check if a path exists.
   * @param path - The path to check
   */
  exists(path: string): boolean

  /**
   * Check if a path is a directory.
   * @param path - The path to check
   */
  isDirectory(path: string): boolean

  /**
   * Check if a path is a file.
   * @param path - The path to check
   */
  isFile(path: string): boolean

  /**
   * List entries in a directory.
   * @param path - The directory path to list
   * @returns Array of file entries
   * @throws Error if the path doesn't exist or isn't a directory
   */
  listDirectory(path: string): FileEntry[]

  /**
   * Read the contents of a file.
   * @param path - The file path to read
   * @returns The file contents as a string
   * @throws Error if the path doesn't exist or isn't a file
   */
  readFile(path: string): string

  /**
   * Write contents to a file.
   * @param path - The file path to write
   * @param content - The content to write
   */
  writeFile(path: string, content: string): void

  /**
   * Create a directory.
   * Creates only the final directory in the path (not parent directories).
   * Use recursive calls to implement mkdir -p behavior if needed.
   * @param path - The directory path to create
   * @throws Error if parent directory doesn't exist or path already exists
   */
  createDirectory(path: string): void

  /**
   * Delete a file or directory.
   * For directories, only deletes if empty (non-recursive).
   * Implementations may provide a separate recursive delete method.
   * @param path - The path to delete
   * @throws Error if path doesn't exist or directory is not empty
   */
  delete(path: string): void

  // Binary file support (optional)

  /**
   * Check if a file is a binary file (as opposed to a text file).
   * Implementations may use file extension or content inspection.
   * @param path - The file path to check
   * @returns true if the file is binary, false if text
   */
  isBinaryFile?(path: string): boolean

  /**
   * Read the contents of a binary file.
   * @param path - The file path to read
   * @returns The file contents as a Uint8Array
   * @throws Error if the path doesn't exist, isn't a file, or isn't a binary file
   */
  readBinaryFile?(path: string): Uint8Array

  /**
   * Write binary contents to a file.
   * @param path - The file path to write
   * @param content - The binary content to write
   */
  writeBinaryFile?(path: string, content: Uint8Array): void
}

/**
 * Result of executing a shell command.
 */
export interface CommandResult {
  /** Exit code (0 for success, non-zero for errors) */
  exitCode: number
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
}

/**
 * Parsed representation of a command string.
 */
export interface ParsedCommand {
  /** The command name (first token) */
  command: string
  /** The arguments (remaining tokens) */
  args: string[]
  /** The original raw command string */
  raw: string
}

/**
 * A shell command that can be executed.
 */
export interface Command {
  /** The command name (e.g., 'cd', 'ls') */
  name: string
  /** Brief description of the command */
  description: string
  /** Usage pattern (e.g., 'cd [path]') */
  usage: string
  /**
   * Execute the command.
   * @param args - Command arguments
   * @param fs - Filesystem to operate on
   * @returns Command result
   */
  execute(args: string[], fs: IFileSystem): CommandResult
}

/**
 * Options for shell initialization.
 */
export interface ShellOptions {
  /** Initial working directory */
  cwd?: string
  /** Custom filesystem implementation */
  filesystem?: IFileSystem
}
