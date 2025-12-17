/**
 * Canvas controller for managing canvas lifecycle from within LuaScriptProcess.
 *
 * This controller enables canvas functionality when running Lua scripts via the shell
 * (as opposed to the web worker-based canvas runtime). It:
 * - Requests canvas tabs to be opened via callbacks
 * - Manages the game loop using requestAnimationFrame
 * - Accumulates draw commands and renders them each frame
 * - Captures input from the canvas element
 * - Supports blocking via Promise (start() blocks until stop())
 */

import {
  CanvasRenderer,
  InputCapture,
  GameLoopController,
} from '@lua-learning/canvas-runtime'
import type { DrawCommand, InputState, TimingInfo } from '@lua-learning/canvas-runtime'

/**
 * Callbacks for canvas tab management.
 */
export interface CanvasCallbacks {
  /** Request a canvas tab to be opened, returns the canvas element when ready */
  onRequestCanvasTab: (canvasId: string) => Promise<HTMLCanvasElement>
  /** Request a canvas tab to be closed */
  onCloseCanvasTab: (canvasId: string) => void
  /** Report an error that occurred during canvas execution */
  onError?: (error: string) => void
}

/**
 * Controller for managing canvas lifecycle in LuaScriptProcess.
 */
export class CanvasController {
  private readonly callbacks: CanvasCallbacks
  private readonly canvasId: string

  // Canvas state
  private canvas: HTMLCanvasElement | null = null
  private renderer: CanvasRenderer | null = null
  private inputCapture: InputCapture | null = null
  private gameLoop: GameLoopController | null = null

  // Frame state
  private frameCommands: DrawCommand[] = []
  private currentTiming: TimingInfo = { deltaTime: 0, totalTime: 0, frameNumber: 0 }

  // Blocking state for start()
  private running = false
  private stopResolver: (() => void) | null = null

  // onDraw callback from Lua
  private onDrawCallback: (() => void) | null = null

  constructor(callbacks: CanvasCallbacks, canvasId = 'canvas-main') {
    this.callbacks = callbacks
    this.canvasId = canvasId
  }

  /**
   * Check if the canvas is currently active.
   */
  isActive(): boolean {
    return this.running
  }

  /**
   * Set the onDraw callback from Lua.
   */
  setOnDrawCallback(callback: () => void): void {
    this.onDrawCallback = callback
  }

  /**
   * Start the canvas and block until stop() is called.
   * Returns a Promise that resolves when the canvas is stopped.
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Canvas is already running. Call canvas.stop() first.')
    }

    // Request canvas tab from UI
    this.canvas = await this.callbacks.onRequestCanvasTab(this.canvasId)

    // Initialize renderer, input capture, and game loop
    this.renderer = new CanvasRenderer(this.canvas)
    this.inputCapture = new InputCapture(this.canvas)
    this.gameLoop = new GameLoopController(this.onFrame.bind(this))

    // Set running state
    this.running = true

    // Start the game loop
    this.gameLoop.start()

    // Return a Promise that blocks until stop() is called
    return new Promise<void>((resolve) => {
      this.stopResolver = resolve
    })
  }

  /**
   * Stop the canvas and close the canvas tab.
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
    if (this.inputCapture) {
      this.inputCapture.dispose()
      this.inputCapture = null
    }

    // Clear renderer reference (canvas may still exist in DOM)
    this.renderer = null

    // Close the canvas tab
    this.callbacks.onCloseCanvasTab(this.canvasId)
    this.canvas = null

    // Resolve the blocking Promise
    if (this.stopResolver) {
      this.stopResolver()
      this.stopResolver = null
    }
  }

  // --- Drawing API ---

  /**
   * Add a draw command to be rendered this frame.
   */
  addDrawCommand(command: DrawCommand): void {
    this.frameCommands.push(command)
  }

  /**
   * Clear the canvas.
   */
  clear(): void {
    this.addDrawCommand({ type: 'clear' })
  }

  /**
   * Set the drawing color.
   */
  setColor(r: number, g: number, b: number, a?: number): void {
    const command: DrawCommand = { type: 'setColor', r, g, b }
    if (a !== undefined && a !== null) {
      (command as { type: 'setColor'; r: number; g: number; b: number; a?: number }).a = a
    }
    this.addDrawCommand(command)
  }

  /**
   * Set the line width.
   */
  setLineWidth(width: number): void {
    this.addDrawCommand({ type: 'setLineWidth', width })
  }

  /**
   * Set the canvas size.
   */
  setSize(width: number, height: number): void {
    this.addDrawCommand({ type: 'setSize', width, height })
  }

  /**
   * Draw a rectangle outline.
   */
  drawRect(x: number, y: number, width: number, height: number): void {
    this.addDrawCommand({ type: 'rect', x, y, width, height })
  }

  /**
   * Draw a filled rectangle.
   */
  fillRect(x: number, y: number, width: number, height: number): void {
    this.addDrawCommand({ type: 'fillRect', x, y, width, height })
  }

  /**
   * Draw a circle outline.
   */
  drawCircle(x: number, y: number, radius: number): void {
    this.addDrawCommand({ type: 'circle', x, y, radius })
  }

  /**
   * Draw a filled circle.
   */
  fillCircle(x: number, y: number, radius: number): void {
    this.addDrawCommand({ type: 'fillCircle', x, y, radius })
  }

  /**
   * Draw a line.
   */
  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.addDrawCommand({ type: 'line', x1, y1, x2, y2 })
  }

  /**
   * Draw text.
   */
  drawText(x: number, y: number, text: string): void {
    this.addDrawCommand({ type: 'text', x, y, text })
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

  // --- Input API ---

  /**
   * Check if a key is currently held down.
   */
  isKeyDown(code: string): boolean {
    return this.inputCapture?.isKeyDown(code) ?? false
  }

  /**
   * Check if a key was just pressed this frame.
   */
  isKeyPressed(code: string): boolean {
    return this.inputCapture?.isKeyPressed(code) ?? false
  }

  /**
   * Get all keys currently held down.
   */
  getKeysDown(): string[] {
    if (!this.inputCapture) return []
    return Array.from(this.inputCapture.getKeysDown())
  }

  /**
   * Get all keys pressed this frame.
   */
  getKeysPressed(): string[] {
    if (!this.inputCapture) return []
    const state = this.inputCapture.getInputState()
    return state.keysPressed
  }

  /**
   * Get mouse X position.
   */
  getMouseX(): number {
    return this.inputCapture?.getMousePosition().x ?? 0
  }

  /**
   * Get mouse Y position.
   */
  getMouseY(): number {
    return this.inputCapture?.getMousePosition().y ?? 0
  }

  /**
   * Check if a mouse button is held down.
   */
  isMouseButtonDown(button: number): boolean {
    return this.inputCapture?.isMouseButtonDown(button) ?? false
  }

  /**
   * Check if a mouse button was just pressed this frame.
   */
  isMouseButtonPressed(button: number): boolean {
    return this.inputCapture?.isMouseButtonPressed(button) ?? false
  }

  /**
   * Get the full input state.
   */
  getInputState(): InputState {
    return this.inputCapture?.getInputState() ?? {
      keysDown: [],
      keysPressed: [],
      mouseX: 0,
      mouseY: 0,
      mouseButtonsDown: [],
      mouseButtonsPressed: [],
    }
  }

  // --- Canvas dimensions ---

  /**
   * Get canvas width.
   */
  getWidth(): number {
    return this.canvas?.width ?? 0
  }

  /**
   * Get canvas height.
   */
  getHeight(): number {
    return this.canvas?.height ?? 0
  }

  // --- Internal ---

  /**
   * Format an error from the onDraw callback with helpful context.
   * Detects common errors and provides user-friendly explanations.
   */
  private formatOnDrawError(error: unknown): string {
    const rawMessage = error instanceof Error ? error.message : String(error)

    // Detect "yield across C-call boundary" error from blocking operations
    if (rawMessage.includes('yield across') || rawMessage.includes('C-call boundary')) {
      // Try to extract location from stack trace
      const location = this.extractLocationFromTraceback(rawMessage)
      const locationInfo = location ? ` (${location})` : ''

      return (
        `canvas.tick${locationInfo}: Cannot use blocking operations like io.read() inside tick.\n` +
        'The tick callback runs every frame and cannot wait for user input.\n' +
        'Use canvas.is_key_pressed() or canvas.get_keys_pressed() for input instead.'
      )
    }

    // For other errors, include the full message with traceback
    return `canvas.tick: ${rawMessage}`
  }

  /**
   * Extract the first user-code location from a Lua traceback.
   * Looks for patterns like "test.lua:5:" or "[string "..."]:5:"
   * Skips internal frames (C functions, canvas API internals).
   */
  private extractLocationFromTraceback(traceback: string): string | null {
    // Look for file:line patterns in the traceback
    // Match patterns like: test.lua:5: or [string "test.lua"]:5: or @test.lua:5:
    const patterns = [
      /@?([^:\s]+\.lua):(\d+)/,           // filename.lua:line
      /\[string "([^"]+)"\]:(\d+)/,        // [string "name"]:line
    ]

    for (const pattern of patterns) {
      const match = traceback.match(pattern)
      if (match) {
        const [, file, line] = match
        // Skip internal frames
        if (!file.includes('canvas') && !file.includes('__')) {
          return `${file}:${line}`
        }
      }
    }

    // Try to find any line number reference
    const lineMatch = traceback.match(/:(\d+):/)
    if (lineMatch) {
      return `line ${lineMatch[1]}`
    }

    return null
  }

  /**
   * Frame callback from GameLoopController.
   */
  private onFrame(timing: TimingInfo): void {
    if (!this.running) return

    // Store timing for API access
    this.currentTiming = timing

    // Clear frame commands
    this.frameCommands = []

    // Call the Lua onDraw callback
    if (this.onDrawCallback) {
      try {
        this.onDrawCallback()
      } catch (error) {
        // Errors in onDraw should stop the canvas and report to shell
        const errorMessage = this.formatOnDrawError(error)
        this.callbacks.onError?.(errorMessage)
        this.stop()
        return
      }
    }

    // Render accumulated draw commands
    if (this.renderer && this.frameCommands.length > 0) {
      this.renderer.render(this.frameCommands)
    }

    // Update input capture (clear "just pressed" state)
    this.inputCapture?.update()
  }
}
