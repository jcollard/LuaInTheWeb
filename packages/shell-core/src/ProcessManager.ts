/**
 * Manages the foreground process in the shell.
 * Handles process lifecycle, input routing, and exit notifications.
 */

import type { IProcess, KeyModifiers } from './interfaces/IProcess'

/**
 * Manages the current foreground process.
 * Only one process can be in the foreground at a time.
 * When a process is in the foreground, all input is routed to it.
 */
export class ProcessManager {
  private currentProcess: IProcess | null = null

  /**
   * Callback invoked when the foreground process exits.
   * @param code - The exit code of the process
   */
  onProcessExit: ((code: number) => void) | null = null

  /**
   * Check if there is a foreground process running.
   */
  hasForegroundProcess(): boolean {
    return this.currentProcess !== null
  }

  /**
   * Get the current foreground process.
   * @returns The current process, or null if none is running
   */
  getCurrentProcess(): IProcess | null {
    return this.currentProcess
  }

  /**
   * Start a process and set it as the foreground process.
   * If another process is already running, it will be stopped first.
   * @param process - The process to start
   */
  startProcess(process: IProcess): void {
    // Stop existing process if any
    if (this.currentProcess) {
      this.currentProcess.stop()
    }

    this.currentProcess = process

    // Wire up exit callback to clear foreground
    process.onExit = (code: number) => {
      this.currentProcess = null
      if (this.onProcessExit) {
        this.onProcessExit(code)
      }
    }

    process.start()
  }

  /**
   * Stop the current foreground process.
   * Does nothing if no process is running.
   */
  stopProcess(): void {
    if (this.currentProcess) {
      this.currentProcess.stop()
      // Clear immediately for instant UI feedback on explicit stop (e.g., Ctrl+C).
      // This differs from startProcess where onExit clears the process asynchronously
      // because stop is a synchronous user action requiring immediate state update.
      this.currentProcess = null
    }
  }

  /**
   * Route input to the foreground process.
   * @param input - The input string to send
   * @returns True if input was handled by a process, false if no process is running
   */
  handleInput(input: string): boolean {
    if (this.currentProcess) {
      this.currentProcess.handleInput(input)
      return true
    }
    return false
  }

  /**
   * Check if the current process supports raw key input.
   * @returns True if a process is running and supports raw input
   */
  supportsRawInput(): boolean {
    return this.currentProcess?.supportsRawInput === true
  }

  /**
   * Check if the current process is in full raw input mode.
   * When true, ALL keyboard input should go through handleKey().
   * @returns True if process wants full raw input mode
   */
  inFullRawMode(): boolean {
    return this.currentProcess?.inFullRawMode === true
  }

  /**
   * Route a key event to the foreground process.
   * Only works if the process supports raw input (supportsRawInput === true).
   * @param key - The key identifier (e.g., 'ArrowUp', 'ArrowDown')
   * @param modifiers - Optional modifier key state
   * @returns True if key was handled by a process, false otherwise
   */
  handleKey(key: string, modifiers?: KeyModifiers): boolean {
    if (this.currentProcess?.supportsRawInput && this.currentProcess.handleKey) {
      this.currentProcess.handleKey(key, modifiers)
      return true
    }
    return false
  }
}
