/**
 * Result of executing a shell command
 */
export interface CommandResult {
  /** Exit code: 0 for success, non-zero for error */
  exitCode: number;
  /** Optional output to display */
  output?: string;
  /** Optional error message */
  error?: string;
}

/**
 * File entry in a directory listing
 */
export interface FileEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Abstract filesystem interface for shell commands
 * This allows commands to work with the in-memory filesystem
 */
export interface IFileSystem {
  /** Check if a path exists */
  exists(path: string): boolean;
  /** Check if a path is a directory */
  isDirectory(path: string): boolean;
  /** List entries in a directory */
  listDirectory(path: string): FileEntry[];
  /** Read file contents */
  readFile(path: string): string;
}

/**
 * Context provided to shell commands during execution
 */
export interface ShellContext {
  /** Current working directory (absolute path) */
  cwd: string;
  /** Filesystem interface */
  fs: IFileSystem;
  /** Write output to terminal (no newline) */
  write: (text: string) => void;
  /** Write output to terminal (with newline) */
  writeln: (text: string) => void;
  /** Change the current working directory */
  setCwd: (path: string) => void;
  /** Previous directory for cd - */
  previousCwd: string;
  /** Set previous directory */
  setPreviousCwd: (path: string) => void;
}

/**
 * Definition of a shell command
 */
export interface Command {
  /** Command name (e.g., 'cd', 'ls', 'pwd') */
  name: string;
  /** Short description of what the command does */
  description: string;
  /** Usage syntax (e.g., 'cd [directory]') */
  usage: string;
  /** Execute the command with given arguments and context */
  execute: (args: string[], context: ShellContext) => Promise<CommandResult>;
}
