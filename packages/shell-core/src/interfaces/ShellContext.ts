/**
 * Shell execution context provided to commands.
 * Contains the environment and I/O handlers for command execution.
 */

import type { IFileSystem } from '../types'

/**
 * Context provided to shell commands during execution.
 * Encapsulates the execution environment including filesystem access
 * and output handling.
 */
export interface ShellContext {
  /**
   * Current working directory path.
   */
  cwd: string

  /**
   * Filesystem for file operations.
   */
  filesystem: IFileSystem

  /**
   * Write standard output.
   * @param text - Text to output
   */
  output: (text: string) => void

  /**
   * Write standard error.
   * @param text - Error text to output
   */
  error: (text: string) => void
}
