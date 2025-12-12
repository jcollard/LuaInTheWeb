/**
 * Interface for long-running shell processes.
 * Processes have a lifecycle (start/stop) and handle input/output streaming.
 */

/**
 * Key modifier state for raw key input handling.
 */
export interface KeyModifiers {
  /** Ctrl key is pressed */
  ctrl: boolean
  /** Alt key is pressed */
  alt: boolean
  /** Shift key is pressed */
  shift: boolean
}

/**
 * A long-running process that can be started, stopped, and receive input.
 * Used for interactive commands like REPLs or scripts that take time to execute.
 */
export interface IProcess {
  /**
   * Start the process.
   * Called when the process should begin execution.
   */
  start(): void

  /**
   * Stop the process.
   * Called to interrupt or terminate the running process (e.g., Ctrl+C).
   */
  stop(): void

  /**
   * Check if the process is currently running.
   * @returns True if the process is actively running, false otherwise.
   */
  isRunning(): boolean

  /**
   * Handle input from the user.
   * Called when the user types input while this process is the foreground process.
   * @param input - The input string from the user
   */
  handleInput(input: string): void

  /**
   * Callback invoked when the process produces standard output.
   * @param text - Output text from the process
   */
  onOutput: (text: string) => void

  /**
   * Callback invoked when the process produces error output.
   * @param text - Error text from the process
   */
  onError: (text: string) => void

  /**
   * Callback invoked when the process exits.
   * @param code - Exit code (0 for success, non-zero for errors)
   */
  onExit: (code: number) => void

  /**
   * Whether this process supports raw key input handling.
   * When true, the shell should forward raw key events to handleKey().
   * When false/undefined, only line-based input via handleInput() is used.
   * @optional
   */
  supportsRawInput?: boolean

  /**
   * Handle a raw key input event.
   * Called when the user presses a key while this process is running
   * and supportsRawInput is true.
   * @param key - The key identifier (e.g., 'ArrowUp', 'ArrowDown', 'Tab')
   * @param modifiers - Optional modifier key state
   * @optional
   */
  handleKey?(key: string, modifiers?: KeyModifiers): void
}
