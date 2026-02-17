/**
 * ANSI terminal controller for managing terminal lifecycle from within LuaScriptProcess.
 *
 * This controller enables ANSI terminal functionality when running Lua scripts via the shell.
 * It:
 * - Requests ANSI tabs to be opened via callbacks
 * - Manages the game loop using requestAnimationFrame
 * - Writes ANSI escape sequences directly to xterm.js
 * - Captures keyboard input from the terminal container
 * - Supports blocking via Promise (start() blocks until stop())
 */

import {
  InputCapture,
  GameLoopController,
} from '@lua-learning/canvas-runtime'
import { InputAPI } from './InputAPI'
import type { TimingInfo } from '@lua-learning/canvas-runtime'

/**
 * Handle to a running ANSI terminal instance.
 * Provided by the UI when the terminal tab is ready.
 */
export interface AnsiTerminalHandle {
  /** Write data (including ANSI escape sequences) to the terminal */
  write: (data: string) => void
  /** The container element for keyboard event capture */
  container: HTMLElement
  /** Dispose of the terminal handle */
  dispose: () => void
}

/**
 * Callbacks for ANSI terminal tab management.
 */
export interface AnsiCallbacks {
  /** Request an ANSI tab to be opened, returns the terminal handle when ready */
  onRequestAnsiTab: (ansiId: string) => Promise<AnsiTerminalHandle>
  /** Request an ANSI tab to be closed */
  onCloseAnsiTab: (ansiId: string) => void
  /** Report an error that occurred during ANSI terminal execution */
  onError?: (error: string) => void
  /**
   * Register a handler to be called when the ANSI tab is closed from the UI.
   * @param ansiId - The ANSI terminal ID
   * @param handler - Function to call when the tab is closed
   */
  registerAnsiCloseHandler?: (ansiId: string, handler: () => void) => void
  /**
   * Unregister the close handler for an ANSI terminal.
   * @param ansiId - The ANSI terminal ID
   */
  unregisterAnsiCloseHandler?: (ansiId: string) => void
  /**
   * Flush buffered output.
   * Called after each frame to ensure print() output appears immediately.
   */
  onFlushOutput?: () => void
}

/**
 * Format an onTick error for display.
 */
function formatOnTickError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * Controller for managing ANSI terminal lifecycle in LuaScriptProcess.
 */
export class AnsiController {
  private readonly callbacks: AnsiCallbacks
  private readonly ansiId: string

  // Terminal state
  private handle: AnsiTerminalHandle | null = null
  private inputCapture: InputCapture | null = null
  private inputAPI: InputAPI = new InputAPI()
  private gameLoop: GameLoopController | null = null

  // Timing state
  private currentTiming: TimingInfo = { deltaTime: 0, totalTime: 0, frameNumber: 0 }

  // Blocking state for start()
  private running = false
  private stopResolver: (() => void) | null = null

  // onTick callback from Lua
  private onTickCallback: (() => void) | null = null

  constructor(callbacks: AnsiCallbacks, ansiId = 'ansi-main') {
    this.callbacks = callbacks
    this.ansiId = ansiId
  }

  /**
   * Check if the terminal is currently active.
   */
  isActive(): boolean {
    return this.running
  }

  /**
   * Set the onTick callback from Lua.
   */
  setOnTickCallback(callback: () => void): void {
    this.onTickCallback = callback
  }

  /**
   * Start the ANSI terminal and block until stop() is called.
   * Returns a Promise that resolves when the terminal is stopped.
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('ANSI terminal is already running. Call ansi.stop() first.')
    }

    // Request ANSI tab from UI
    this.handle = await this.callbacks.onRequestAnsiTab(this.ansiId)

    // Register close handler so UI can stop us when tab is closed
    this.callbacks.registerAnsiCloseHandler?.(this.ansiId, () => this.stop())

    // Initialize input capture on the terminal container
    this.inputCapture = new InputCapture(this.handle.container)
    this.inputAPI.setInputCapture(this.inputCapture)

    // Start game loop
    this.gameLoop = new GameLoopController(this.onFrame.bind(this))

    // Set running state
    this.running = true

    // Clear terminal to start fresh
    this.clear()

    // Start the game loop
    this.gameLoop.start()

    // Return a Promise that blocks until stop() is called
    return new Promise<void>((resolve) => {
      this.stopResolver = resolve
    })
  }

  /**
   * Stop the ANSI terminal and close the tab.
   * This resolves the Promise returned by start().
   */
  stop(): void {
    if (!this.running) {
      return
    }

    this.running = false

    // Stop game loop
    if (this.gameLoop) {
      this.gameLoop.stop()
      this.gameLoop.dispose()
      this.gameLoop = null
    }

    // Clean up input capture
    this.inputAPI.setInputCapture(null)
    if (this.inputCapture) {
      this.inputCapture.dispose()
      this.inputCapture = null
    }

    // Unregister close handler to prevent double-cleanup
    this.callbacks.unregisterAnsiCloseHandler?.(this.ansiId)

    // Dispose and close the tab
    if (this.handle) {
      this.handle.dispose()
      this.handle = null
    }
    this.callbacks.onCloseAnsiTab(this.ansiId)

    // Resolve the blocking Promise
    if (this.stopResolver) {
      this.stopResolver()
      this.stopResolver = null
    }
  }

  // --- Terminal Output API ---

  /**
   * Write text to the terminal.
   */
  write(text: string): void {
    this.handle?.write(text)
  }

  /**
   * Set cursor position using ANSI escape sequence.
   * @param row - Row (1-based)
   * @param col - Column (1-based)
   */
  setCursor(row: number, col: number): void {
    this.handle?.write(`\x1b[${row};${col}H`)
  }

  /**
   * Clear the terminal and reset cursor to top-left.
   */
  clear(): void {
    this.handle?.write('\x1b[2J\x1b[H')
  }

  /**
   * Set foreground (text) color using 24-bit true color escape sequence.
   */
  setForeground(r: number, g: number, b: number): void {
    this.handle?.write(`\x1b[38;2;${r};${g};${b}m`)
  }

  /**
   * Set background color using 24-bit true color escape sequence.
   */
  setBackground(r: number, g: number, b: number): void {
    this.handle?.write(`\x1b[48;2;${r};${g};${b}m`)
  }

  /**
   * Reset all terminal attributes to defaults.
   */
  reset(): void {
    this.handle?.write('\x1b[0m')
  }

  // --- Timing API ---

  /**
   * Get delta time since last frame in seconds.
   */
  getDelta(): number {
    return this.currentTiming.deltaTime
  }

  /**
   * Get total elapsed time in seconds.
   */
  getTime(): number {
    return this.currentTiming.totalTime
  }

  // --- Input API (delegated to InputAPI) ---

  /**
   * Check if a key is currently held down.
   */
  isKeyDown(code: string): boolean {
    return this.inputAPI.isKeyDown(code)
  }

  /**
   * Check if a key was just pressed this frame.
   */
  isKeyPressed(code: string): boolean {
    return this.inputAPI.isKeyPressed(code)
  }

  /**
   * Get all keys currently held down.
   */
  getKeysDown(): string[] {
    return this.inputAPI.getKeysDown()
  }

  /**
   * Get all keys pressed this frame.
   */
  getKeysPressed(): string[] {
    return this.inputAPI.getKeysPressed()
  }

  // --- Mouse Input API ---

  private static readonly COLS = 80
  private static readonly ROWS = 25

  /**
   * Get the mouse column in 1-based cell coordinates, clamped to 1–COLS.
   */
  getMouseCol(): number {
    if (!this.handle) return 0
    const rect = this.handle.container.getBoundingClientRect()
    if (rect.width === 0) return 0
    const mouseX = this.inputAPI.getMouseX()
    const col = Math.floor(mouseX / rect.width * AnsiController.COLS) + 1
    return Math.max(1, Math.min(AnsiController.COLS, col))
  }

  /**
   * Get the mouse row in 1-based cell coordinates, clamped to 1–ROWS.
   */
  getMouseRow(): number {
    if (!this.handle) return 0
    const rect = this.handle.container.getBoundingClientRect()
    if (rect.height === 0) return 0
    const mouseY = this.inputAPI.getMouseY()
    const row = Math.floor(mouseY / rect.height * AnsiController.ROWS) + 1
    return Math.max(1, Math.min(AnsiController.ROWS, row))
  }

  /**
   * Check if the mouse cursor is in the top half of the current cell.
   * Useful for half-block rendering at effective 80x50 resolution.
   */
  isMouseTopHalf(): boolean {
    if (!this.handle) return false
    const rect = this.handle.container.getBoundingClientRect()
    if (rect.height === 0) return false
    const mouseY = this.inputAPI.getMouseY()
    const cellFraction = (mouseY / rect.height * AnsiController.ROWS) % 1
    return cellFraction < 0.5
  }

  /**
   * Get the raw unscaled pixel X coordinate.
   */
  getMouseX(): number {
    if (!this.handle) return 0
    const rect = this.handle.container.getBoundingClientRect()
    if (rect.width === 0) return 0
    const scale = rect.width / this.handle.container.scrollWidth
    return this.inputAPI.getMouseX() / scale
  }

  /**
   * Get the raw unscaled pixel Y coordinate.
   */
  getMouseY(): number {
    if (!this.handle) return 0
    const rect = this.handle.container.getBoundingClientRect()
    if (rect.height === 0) return 0
    const scale = rect.height / this.handle.container.scrollHeight
    return this.inputAPI.getMouseY() / scale
  }

  /**
   * Check if a mouse button is currently held down.
   * @param button - 0 = left, 1 = middle, 2 = right
   */
  isMouseButtonDown(button: number): boolean {
    return this.inputAPI.isMouseButtonDown(button)
  }

  /**
   * Check if a mouse button was just pressed this frame.
   * @param button - 0 = left, 1 = middle, 2 = right
   */
  isMouseButtonPressed(button: number): boolean {
    return this.inputAPI.isMouseButtonPressed(button)
  }

  // --- Internal ---

  /**
   * Frame callback from GameLoopController.
   */
  private onFrame(timing: TimingInfo): void {
    if (!this.running) return

    // Store timing for API access
    this.currentTiming = timing

    // Call the Lua onTick callback
    if (this.onTickCallback) {
      try {
        this.onTickCallback()
      } catch (error) {
        const errorMessage = formatOnTickError(error)
        this.callbacks.onError?.(errorMessage)
        // Stop on error (ANSI terminal doesn't have pause/resume like canvas)
        this.stop()
        return
      }
    }

    // Flush output buffer so print() output appears immediately
    this.callbacks.onFlushOutput?.()

    // Update input capture (clear "just pressed" state)
    this.inputCapture?.update()
  }
}
