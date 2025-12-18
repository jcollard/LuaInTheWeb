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

  /**
   * Request a canvas tab to be opened.
   * Returns the canvas element when the tab is ready.
   * @param canvasId - Unique identifier for the canvas tab
   * @returns Promise resolving to the HTMLCanvasElement when ready
   */
  onRequestCanvasTab?: (canvasId: string) => Promise<HTMLCanvasElement>

  /**
   * Request a canvas tab to be closed.
   * @param canvasId - Unique identifier for the canvas tab to close
   */
  onCloseCanvasTab?: (canvasId: string) => void

  /**
   * Request a file to be opened in the editor.
   * Called by the 'open' command to integrate with an IDE or editor.
   * Optional - when undefined, the open command will report that
   * editor integration is not available.
   * @param filePath - Absolute path to the file to open
   */
  onRequestOpenFile?: (filePath: string) => void
}
