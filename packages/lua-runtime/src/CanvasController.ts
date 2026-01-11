/* eslint-disable max-lines */
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
  ImageCache,
  FontCache,
  AssetLoader,
} from '@lua-learning/canvas-runtime'
import type {
  DrawCommand,
  InputState,
  TimingInfo,
  AssetManifest,
  FillStyle,
  GlobalCompositeOperation,
  CanvasTextAlign,
  CanvasTextBaseline,
  CanvasDirection,
  FillRule,
  DiscoveredFile,
  AssetHandle,
  AudioAssetHandle,
} from '@lua-learning/canvas-runtime'
import { isAssetHandle, createEmptyInputState } from '@lua-learning/canvas-runtime'
import type { IFileSystem, ScreenMode } from '@lua-learning/shell-core'
import { formatOnDrawError, createImageFromData, createFontFromData } from './canvasErrorFormatter'
import type { IAudioEngine } from './audio/IAudioEngine'
import { WebAudioEngine } from './audio/WebAudioEngine'
import type { HotReloadMode } from './LuaCommand'

/**
 * Audio asset definition for tracking registered sound/music assets.
 */
export interface AudioAssetDefinition {
  name: string
  filename: string
  type: 'sound' | 'music'
}

/**
 * Audio asset manifest: maps asset names to their definitions.
 */
export type AudioAssetManifest = Map<string, AudioAssetDefinition>

/**
 * Callbacks for canvas tab management.
 */
export interface CanvasCallbacks {
  /** Request a canvas tab to be opened, returns the canvas element when ready */
  onRequestCanvasTab: (canvasId: string) => Promise<HTMLCanvasElement>
  /** Request a canvas tab to be closed */
  onCloseCanvasTab: (canvasId: string) => void
  /** Request a canvas window (popup) to be opened, returns the canvas element when ready */
  onRequestCanvasWindow?: (
    canvasId: string,
    screenMode?: ScreenMode,
    noToolbar?: boolean
  ) => Promise<HTMLCanvasElement>
  /** Request a canvas window (popup) to be closed */
  onCloseCanvasWindow?: (canvasId: string) => void
  /** Report an error that occurred during canvas execution */
  onError?: (error: string) => void
  /** Filesystem for loading assets (optional, required for image support) */
  fileSystem?: IFileSystem
  /** Script directory for resolving relative asset paths (optional) */
  scriptDirectory?: string
  /**
   * Register a handler to be called when the canvas tab is closed from the UI.
   * This allows the UI to stop the canvas when the user closes the tab manually.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when the tab is closed (should call stop())
   */
  registerCanvasCloseHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Unregister the close handler for a canvas.
   * Called when the canvas stops normally (via canvas.stop()) to prevent double-cleanup.
   * @param canvasId - The canvas ID
   */
  unregisterCanvasCloseHandler?: (canvasId: string) => void
  /**
   * Register a handler to reload the canvas (hot reload modules).
   * Called when canvas starts, providing a function the UI can call to trigger reload.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when reload is requested
   */
  registerCanvasReloadHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Unregister the reload handler for a canvas.
   * Called when the canvas stops.
   * @param canvasId - The canvas ID
   */
  unregisterCanvasReloadHandler?: (canvasId: string) => void
  /**
   * Register a handler to reload the canvas from a popup window.
   * Called when canvas starts in window mode.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when reload is requested
   * @param hotReloadMode - Hot reload mode: 'manual' (default) or 'auto' (reload on save)
   */
  registerWindowReloadHandler?: (canvasId: string, handler: () => void, hotReloadMode?: HotReloadMode) => void
  /**
   * Unregister the window reload handler.
   * Called when the canvas stops.
   * @param canvasId - The canvas ID
   */
  unregisterWindowReloadHandler?: (canvasId: string) => void
  /**
   * Register a handler to be called when a popup window is closed by the user.
   * Called when canvas starts in window mode.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when the window is closed
   */
  registerWindowCloseHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Unregister the window close handler.
   * Called when the canvas stops.
   * @param canvasId - The canvas ID
   */
  unregisterWindowCloseHandler?: (canvasId: string) => void
  /**
   * Register a handler for the pause button in the popup window.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when pause is requested
   */
  registerWindowPauseHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Register a handler for the play button in the popup window.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when play is requested
   */
  registerWindowPlayHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Register a handler for the stop button in the popup window.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when stop is requested
   */
  registerWindowStopHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Register a handler for the step button in the popup window.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when step is requested
   */
  registerWindowStepHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Unregister all execution control handlers for a window.
   * @param canvasId - The canvas ID
   */
  unregisterWindowExecutionHandlers?: (canvasId: string) => void
  /**
   * Update the control state in a popup window.
   * @param canvasId - The canvas ID
   * @param state - Object with isRunning and isPaused booleans
   */
  updateWindowControlState?: (canvasId: string, state: { isRunning: boolean; isPaused: boolean }) => void
  /**
   * Register a handler for the pause button in a canvas tab.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when pause is requested
   */
  registerCanvasPauseHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Register a handler for the play button in a canvas tab.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when play is requested
   */
  registerCanvasPlayHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Register a handler for the stop button in a canvas tab.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when stop is requested
   */
  registerCanvasStopHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Register a handler for the step button in a canvas tab.
   * @param canvasId - The canvas ID
   * @param handler - Function to call when step is requested
   */
  registerCanvasStepHandler?: (canvasId: string, handler: () => void) => void
  /**
   * Unregister all execution control handlers for a canvas tab.
   * @param canvasId - The canvas ID
   */
  unregisterCanvasExecutionHandlers?: (canvasId: string) => void
  /**
   * Update the control state in a canvas tab.
   * @param canvasId - The canvas ID
   * @param state - Object with isRunning and isPaused booleans
   */
  updateCanvasControlState?: (canvasId: string, state: { isRunning: boolean; isPaused: boolean }) => void
  /**
   * Flush buffered output.
   * Called after each frame to ensure print() output appears immediately.
   */
  onFlushOutput?: () => void
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

  // Reload callback - calls canvas.reload() in Lua environment
  private reloadCallback: (() => void) | null = null

  // Track whether start() has been called (prevents adding assets after start)
  private started = false

  // Track whether start() is currently in progress (prevents concurrent start calls)
  private startInProgress = false

  // Asset manifest: registered asset definitions (legacy API)
  private assetManifest: AssetManifest = new Map()

  // Asset paths: directories to scan for assets (new API)
  private assetPaths: string[] = []

  // Discovered files: files found in scanned paths, keyed by filename
  private discoveredFiles: Map<string, DiscoveredFile> = new Map()

  // Track whether files have been loaded (for load_image after start validation)
  private filesLoaded = false

  // Image cache for loaded images
  private imageCache: ImageCache | null = null

  // Font cache for loaded fonts
  private fontCache: FontCache | null = null

  // Asset dimensions: width/height for each loaded asset
  private assetDimensions: Map<string, { width: number; height: number }> = new Map()

  // Font state
  private currentFontSize: number = 16
  private currentFontFamily: string = 'monospace'

  // Line dash state
  private lineDashSegments: number[] = []

  // Path2D for hit testing - tracks current path operations
  private currentPath: Path2D = new Path2D()

  // Path2D registry for reusable path objects (exposed to Lua)
  private pathRegistry: Map<number, Path2D> = new Map()
  private nextPathId = 1

  // Offscreen canvas for text measurement
  private measureCanvas: HTMLCanvasElement | null = null
  private measureCtx: CanvasRenderingContext2D | null = null

  // Audio engine for sound effects and music
  private audioEngine: IAudioEngine | null = null

  // Audio asset manifest: registered audio asset definitions
  private audioAssetManifest: AudioAssetManifest = new Map()

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
   * Check if the canvas is currently paused.
   */
  isPaused(): boolean {
    return this.gameLoop?.isPaused() ?? false
  }

  /**
   * Pause the canvas game loop.
   */
  pause(): void {
    if (this.gameLoop) {
      this.gameLoop.pause()
      this.updateControlState()
    }
  }

  /**
   * Resume the canvas game loop.
   */
  resume(): void {
    if (this.gameLoop) {
      this.gameLoop.resume()
      this.updateControlState()
    }
  }

  /**
   * Step one frame forward (when paused).
   */
  step(): void {
    if (this.gameLoop) {
      this.gameLoop.step()
    }
  }

  /**
   * Update the control state in the popup window and canvas tab (if applicable).
   */
  private updateControlState(): void {
    const state = {
      isRunning: this.running,
      isPaused: this.isPaused(),
    }
    this.callbacks.updateWindowControlState?.(this.canvasId, state)
    this.callbacks.updateCanvasControlState?.(this.canvasId, state)
  }

  /**
   * Set the onDraw callback from Lua.
   */
  setOnDrawCallback(callback: () => void): void {
    this.onDrawCallback = callback
  }

  /**
   * Set the reload callback.
   * This callback should execute canvas.reload() in the Lua environment.
   */
  setReloadCallback(callback: () => void): void {
    this.reloadCallback = callback
  }

  /**
   * Trigger a hot reload of user modules.
   * Calls canvas.reload() in the Lua environment via the reload callback.
   */
  reload(): void {
    if (this.reloadCallback) {
      this.reloadCallback()
    }
  }

  /**
   * Report an error through the callbacks.
   * Used for reporting errors from external sources (e.g., reload callback).
   */
  reportError(message: string): void {
    this.callbacks.onError?.(message)
  }

  /**
   * Start the canvas and block until stop() is called.
   * Returns a Promise that resolves when the canvas is stopped.
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Canvas is already running. Call canvas.stop() first.')
    }

    if (this.startInProgress) {
      throw new Error('Canvas start() is already in progress.')
    }

    // Mark as started (prevents adding new assets) and in progress
    this.started = true
    this.startInProgress = true

    // Auto-load assets if they are registered but not yet loaded
    const hasAssets = this.assetManifest.size > 0 || this.audioAssetManifest.size > 0
    if (hasAssets && !this.imageCache) {
      if (!this.callbacks.fileSystem) {
        throw new Error('Assets were registered but no filesystem is available to load them')
      }
      await this.loadAssets(
        this.callbacks.fileSystem,
        this.callbacks.scriptDirectory ?? '/'
      )
    }

    // Request canvas tab from UI
    this.canvas = await this.callbacks.onRequestCanvasTab(this.canvasId)

    // Register close handler so UI can stop us when tab is closed
    if (this.callbacks.registerCanvasCloseHandler) {
      this.callbacks.registerCanvasCloseHandler(this.canvasId, () => this.stop())
    }

    // Register reload handler so UI can trigger hot reload
    if (this.callbacks.registerCanvasReloadHandler) {
      this.callbacks.registerCanvasReloadHandler(this.canvasId, () => this.reload())
    }

    // Register execution control handlers for popup window controls
    this.callbacks.registerWindowPauseHandler?.(this.canvasId, () => this.pause())
    this.callbacks.registerWindowPlayHandler?.(this.canvasId, () => this.resume())
    this.callbacks.registerWindowStopHandler?.(this.canvasId, () => this.stop())
    this.callbacks.registerWindowStepHandler?.(this.canvasId, () => this.step())

    // Register execution control handlers for canvas tab controls
    this.callbacks.registerCanvasPauseHandler?.(this.canvasId, () => this.pause())
    this.callbacks.registerCanvasPlayHandler?.(this.canvasId, () => this.resume())
    this.callbacks.registerCanvasStopHandler?.(this.canvasId, () => this.stop())
    this.callbacks.registerCanvasStepHandler?.(this.canvasId, () => this.step())

    // Initialize renderer with image cache (if assets were loaded), input capture, and game loop
    this.renderer = new CanvasRenderer(this.canvas, this.imageCache ?? undefined)
    this.inputCapture = new InputCapture(this.canvas)
    this.gameLoop = new GameLoopController(this.onFrame.bind(this))

    // Process any commands added before start() (e.g., setSize)
    // This ensures pre-start configuration is applied before the game loop begins
    if (this.frameCommands.length > 0) {
      this.renderer.render(this.frameCommands)
      this.frameCommands = []
    }

    // Set running state
    this.running = true

    // Start the game loop
    this.gameLoop.start()

    // Send initial control state to popup window (if applicable)
    this.updateControlState()

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

    // Unregister close handler to prevent double-cleanup
    if (this.callbacks.unregisterCanvasCloseHandler) {
      this.callbacks.unregisterCanvasCloseHandler(this.canvasId)
    }

    // Unregister reload handler
    if (this.callbacks.unregisterCanvasReloadHandler) {
      this.callbacks.unregisterCanvasReloadHandler(this.canvasId)
    }

    // Unregister execution control handlers
    this.callbacks.unregisterWindowExecutionHandlers?.(this.canvasId)
    this.callbacks.unregisterCanvasExecutionHandlers?.(this.canvasId)

    // Close the canvas tab
    this.callbacks.onCloseCanvasTab(this.canvasId)
    this.canvas = null

    // Clean up audio engine
    if (this.audioEngine) {
      this.audioEngine.dispose()
      this.audioEngine = null
    }

    // Reset startInProgress flag
    this.startInProgress = false

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
   * Get the accumulated frame commands (for testing).
   */
  getFrameCommands(): DrawCommand[] {
    return this.frameCommands
  }

  /**
   * Clear the canvas.
   */
  clear(): void {
    this.addDrawCommand({ type: 'clear' })
  }

  /**
   * Clear a rectangular area of the canvas to transparent.
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.addDrawCommand({ type: 'clearRect', x, y, width, height })
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
   * Set the font size in pixels.
   */
  setFontSize(size: number): void {
    this.currentFontSize = size
    this.addDrawCommand({ type: 'setFontSize', size })
    // Update measure context if it exists
    if (this.measureCtx) {
      this.measureCtx.font = `${size}px ${this.currentFontFamily}`
    }
  }

  /**
   * Set the font family.
   */
  setFontFamily(family: string): void {
    this.currentFontFamily = family
    this.addDrawCommand({ type: 'setFontFamily', family })
    // Update measure context if it exists
    if (this.measureCtx) {
      this.measureCtx.font = `${this.currentFontSize}px ${family}`
    }
  }

  /**
   * Get the width of text in pixels using the current font settings.
   */
  getTextWidth(text: string): number {
    const ctx = this.getMeasureContext()
    return ctx.measureText(text).width
  }

  /**
   * Get comprehensive text metrics using the current font settings.
   * Returns an object with width and various bounding box measurements.
   */
  getTextMetrics(text: string): {
    width: number
    actualBoundingBoxLeft: number
    actualBoundingBoxRight: number
    actualBoundingBoxAscent: number
    actualBoundingBoxDescent: number
    fontBoundingBoxAscent: number
    fontBoundingBoxDescent: number
  } {
    const ctx = this.getMeasureContext()
    const metrics = ctx.measureText(text)
    return {
      width: metrics.width,
      actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
      actualBoundingBoxRight: metrics.actualBoundingBoxRight,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
      fontBoundingBoxAscent: metrics.fontBoundingBoxAscent,
      fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
    }
  }

  /**
   * Get the measure context for text width calculations.
   * Creates an offscreen canvas if needed.
   */
  private getMeasureContext(): CanvasRenderingContext2D {
    if (!this.measureCtx) {
      this.measureCanvas = document.createElement('canvas')
      this.measureCtx = this.measureCanvas.getContext('2d')!
      this.measureCtx.font = `${this.currentFontSize}px ${this.currentFontFamily}`
    }
    return this.measureCtx
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
   * Draw text with optional font overrides.
   * @param x - X coordinate (top-left)
   * @param y - Y coordinate (top-left)
   * @param text - Text to draw
   * @param options - Optional font overrides for this text only
   */
  drawText(
    x: number,
    y: number,
    text: string,
    options?: { fontSize?: number; fontFamily?: string; maxWidth?: number }
  ): void {
    const command: DrawCommand = { type: 'text', x, y, text }
    if (options?.fontSize !== undefined) {
      (command as { fontSize?: number }).fontSize = options.fontSize
    }
    if (options?.fontFamily !== undefined) {
      (command as { fontFamily?: string }).fontFamily = options.fontFamily
    }
    if (options?.maxWidth !== undefined) {
      (command as { maxWidth?: number }).maxWidth = options.maxWidth
    }
    this.addDrawCommand(command)
  }

  /**
   * Draw text outline (stroke) at the given position.
   * @param x - X coordinate (top-left)
   * @param y - Y coordinate (top-left)
   * @param text - Text to draw
   * @param options - Optional font overrides for this text only
   */
  strokeText(
    x: number,
    y: number,
    text: string,
    options?: { fontSize?: number; fontFamily?: string; maxWidth?: number }
  ): void {
    const command: DrawCommand = { type: 'strokeText', x, y, text }
    if (options?.fontSize !== undefined) {
      (command as { fontSize?: number }).fontSize = options.fontSize
    }
    if (options?.fontFamily !== undefined) {
      (command as { fontFamily?: string }).fontFamily = options.fontFamily
    }
    if (options?.maxWidth !== undefined) {
      (command as { maxWidth?: number }).maxWidth = options.maxWidth
    }
    this.addDrawCommand(command)
  }

  // --- Transformation API ---

  /**
   * Translate (move) the canvas origin.
   */
  translate(dx: number, dy: number): void {
    this.addDrawCommand({ type: 'translate', dx, dy })
  }

  /**
   * Rotate the canvas around the current origin.
   * @param angle - Rotation angle in radians
   */
  rotate(angle: number): void {
    this.addDrawCommand({ type: 'rotate', angle })
  }

  /**
   * Scale the canvas from the current origin.
   */
  scale(sx: number, sy: number): void {
    this.addDrawCommand({ type: 'scale', sx, sy })
  }

  /**
   * Save the current transformation state to the stack.
   */
  save(): void {
    this.addDrawCommand({ type: 'save' })
  }

  /**
   * Restore the most recently saved transformation state.
   */
  restore(): void {
    this.addDrawCommand({ type: 'restore' })
  }

  /**
   * Multiply the current transformation matrix by the specified matrix.
   */
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.addDrawCommand({ type: 'transform', a, b, c, d, e, f })
  }

  /**
   * Reset to identity matrix, then apply the specified transformation matrix.
   */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.addDrawCommand({ type: 'setTransform', a, b, c, d, e, f })
  }

  /**
   * Reset the transformation matrix to identity.
   */
  resetTransform(): void {
    this.addDrawCommand({ type: 'resetTransform' })
  }

  // --- Path API ---

  /**
   * Begin a new path, clearing any existing path data.
   */
  beginPath(): void {
    this.currentPath = new Path2D()
    this.addDrawCommand({ type: 'beginPath' })
  }

  /**
   * Close the current path by drawing a line to the starting point.
   */
  closePath(): void {
    this.currentPath.closePath()
    this.addDrawCommand({ type: 'closePath' })
  }

  /**
   * Move the current point to a new position without drawing.
   */
  moveTo(x: number, y: number): void {
    this.currentPath.moveTo(x, y)
    this.addDrawCommand({ type: 'moveTo', x, y })
  }

  /**
   * Draw a line from the current point to a new position.
   */
  lineTo(x: number, y: number): void {
    this.currentPath.lineTo(x, y)
    this.addDrawCommand({ type: 'lineTo', x, y })
  }

  /**
   * Fill the current path with the current fill style.
   */
  fill(): void {
    this.addDrawCommand({ type: 'fill' })
  }

  /**
   * Stroke the current path with the current stroke style.
   */
  stroke(): void {
    this.addDrawCommand({ type: 'stroke' })
  }

  /**
   * Draw an arc (portion of a circle) on the current path.
   * @param x - X coordinate of the arc's center
   * @param y - Y coordinate of the arc's center
   * @param radius - Arc radius
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param counterclockwise - Draw counterclockwise (default: false)
   */
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.currentPath.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    this.addDrawCommand({ type: 'arc', x, y, radius, startAngle, endAngle, counterclockwise })
  }

  /**
   * Draw an arc using tangent control points (for rounded corners).
   * @param x1 - X coordinate of first control point
   * @param y1 - Y coordinate of first control point
   * @param x2 - X coordinate of second control point
   * @param y2 - Y coordinate of second control point
   * @param radius - Arc radius
   */
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.currentPath.arcTo(x1, y1, x2, y2, radius)
    this.addDrawCommand({ type: 'arcTo', x1, y1, x2, y2, radius })
  }

  /**
   * Draw a quadratic Bézier curve from the current point.
   * @param cpx - X coordinate of the control point
   * @param cpy - Y coordinate of the control point
   * @param x - X coordinate of the end point
   * @param y - Y coordinate of the end point
   */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.currentPath.quadraticCurveTo(cpx, cpy, x, y)
    this.addDrawCommand({ type: 'quadraticCurveTo', cpx, cpy, x, y })
  }

  /**
   * Draw a cubic Bézier curve from the current point.
   * @param cp1x - X coordinate of the first control point
   * @param cp1y - Y coordinate of the first control point
   * @param cp2x - X coordinate of the second control point
   * @param cp2y - Y coordinate of the second control point
   * @param x - X coordinate of the end point
   * @param y - Y coordinate of the end point
   */
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.currentPath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
    this.addDrawCommand({ type: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y })
  }

  /**
   * Draw an ellipse on the current path.
   * @param x - X coordinate of the ellipse's center
   * @param y - Y coordinate of the ellipse's center
   * @param radiusX - Horizontal radius of the ellipse
   * @param radiusY - Vertical radius of the ellipse
   * @param rotation - Rotation of the ellipse in radians
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param counterclockwise - Draw counterclockwise (default: false)
   */
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.currentPath.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
    this.addDrawCommand({
      type: 'ellipse',
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise,
    })
  }

  /**
   * Draw a rounded rectangle on the current path.
   * @param x - X coordinate of the rectangle's starting point
   * @param y - Y coordinate of the rectangle's starting point
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   * @param radii - Corner radii (single value or array of 1-4 values)
   */
  roundRect(x: number, y: number, width: number, height: number, radii: number | number[]): void {
    this.currentPath.roundRect(x, y, width, height, radii)
    this.addDrawCommand({ type: 'roundRect', x, y, width, height, radii })
  }

  /**
   * Add a rectangle to the current path.
   * Unlike rect() which draws immediately, this adds to the path for later fill()/stroke().
   * @param x - X coordinate of the rectangle's starting point
   * @param y - Y coordinate of the rectangle's starting point
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   */
  rectPath(x: number, y: number, width: number, height: number): void {
    this.currentPath.rect(x, y, width, height)
    this.addDrawCommand({ type: 'rectPath', x, y, width, height })
  }

  /**
   * Clip all future drawing to the current path.
   * Use with save()/restore() to manage clipping regions.
   * @param fillRule - Fill rule: "nonzero" (default) or "evenodd"
   */
  clip(fillRule?: 'nonzero' | 'evenodd'): void {
    this.addDrawCommand({ type: 'clip', fillRule })
  }

  // --- Line Style API ---

  /**
   * Set the line cap style for stroke endpoints.
   * @param cap - Line cap style: "butt" (default), "round", or "square"
   */
  setLineCap(cap: 'butt' | 'round' | 'square'): void {
    this.addDrawCommand({ type: 'setLineCap', cap })
  }

  /**
   * Set the line join style for stroke corners.
   * @param join - Line join style: "miter" (default), "round", or "bevel"
   */
  setLineJoin(join: 'miter' | 'round' | 'bevel'): void {
    this.addDrawCommand({ type: 'setLineJoin', join })
  }

  /**
   * Set the miter limit for sharp corners.
   * Only applies when lineJoin is "miter".
   * @param limit - Miter limit value (default: 10)
   */
  setMiterLimit(limit: number): void {
    this.addDrawCommand({ type: 'setMiterLimit', limit })
  }

  /**
   * Set the line dash pattern for strokes.
   * @param segments - Array of dash and gap lengths (e.g., [10, 5] for 10px dash, 5px gap)
   *                   Empty array resets to solid line.
   */
  setLineDash(segments: number[]): void {
    this.lineDashSegments = [...segments]
    this.addDrawCommand({ type: 'setLineDash', segments })
  }

  /**
   * Get the current line dash pattern.
   * @returns Copy of the current dash pattern array
   */
  getLineDash(): number[] {
    return [...this.lineDashSegments]
  }

  /**
   * Set the line dash offset for animating dashed lines.
   * @param offset - Offset to shift the dash pattern (useful for marching ants animation)
   */
  setLineDashOffset(offset: number): void {
    this.addDrawCommand({ type: 'setLineDashOffset', offset })
  }

  // --- Fill/Stroke Style API ---

  /**
   * Set the fill style (color or gradient).
   * @param style - CSS color string or gradient definition
   */
  setFillStyle(style: FillStyle): void {
    this.addDrawCommand({ type: 'setFillStyle', style })
  }

  /**
   * Set the stroke style (color or gradient).
   * @param style - CSS color string or gradient definition
   */
  setStrokeStyle(style: FillStyle): void {
    this.addDrawCommand({ type: 'setStrokeStyle', style })
  }

  // --- Shadow API ---

  /**
   * Set the shadow color.
   * @param color - CSS color string
   */
  setShadowColor(color: string): void {
    this.addDrawCommand({ type: 'setShadowColor', color })
  }

  /**
   * Set the shadow blur radius.
   * @param blur - Blur radius in pixels
   */
  setShadowBlur(blur: number): void {
    this.addDrawCommand({ type: 'setShadowBlur', blur })
  }

  /**
   * Set the shadow horizontal offset.
   * @param offset - Offset in pixels
   */
  setShadowOffsetX(offset: number): void {
    this.addDrawCommand({ type: 'setShadowOffsetX', offset })
  }

  /**
   * Set the shadow vertical offset.
   * @param offset - Offset in pixels
   */
  setShadowOffsetY(offset: number): void {
    this.addDrawCommand({ type: 'setShadowOffsetY', offset })
  }

  /**
   * Set all shadow properties at once.
   * @param color - CSS color string
   * @param blur - Blur radius in pixels
   * @param offsetX - Horizontal offset in pixels
   * @param offsetY - Vertical offset in pixels
   */
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void {
    this.addDrawCommand({ type: 'setShadow', color, blur, offsetX, offsetY })
  }

  /**
   * Clear all shadow properties.
   */
  clearShadow(): void {
    this.addDrawCommand({ type: 'clearShadow' })
  }

  // --- Compositing API ---

  /**
   * Set the global alpha (transparency) for all subsequent drawing.
   * @param alpha - Value from 0.0 (fully transparent) to 1.0 (fully opaque)
   */
  setGlobalAlpha(alpha: number): void {
    this.addDrawCommand({ type: 'setGlobalAlpha', alpha })
  }

  /**
   * Set the composite operation (blend mode) for all subsequent drawing.
   * @param operation - The blend mode to use
   */
  setCompositeOperation(operation: GlobalCompositeOperation): void {
    this.addDrawCommand({ type: 'setCompositeOperation', operation })
  }

  /**
   * Set image smoothing (anti-aliasing) for image rendering.
   * Disable for crisp pixel art, enable for smooth scaled images.
   * @param enabled - Whether to enable image smoothing (default: true)
   */
  setImageSmoothing(enabled: boolean): void {
    this.addDrawCommand({ type: 'setImageSmoothing', enabled })
  }

  // --- Text Alignment API ---

  /**
   * Set the text alignment for all subsequent text drawing.
   * @param align - Horizontal alignment: 'left', 'right', 'center', 'start', or 'end'
   */
  setTextAlign(align: CanvasTextAlign): void {
    this.addDrawCommand({ type: 'setTextAlign', align })
  }

  /**
   * Set the text baseline for all subsequent text drawing.
   * @param baseline - Vertical alignment: 'top', 'hanging', 'middle', 'alphabetic', 'ideographic', or 'bottom'
   */
  setTextBaseline(baseline: CanvasTextBaseline): void {
    this.addDrawCommand({ type: 'setTextBaseline', baseline })
  }

  /**
   * Set the text direction for all subsequent text drawing.
   * @param direction - Text direction: 'ltr' (left-to-right), 'rtl' (right-to-left), or 'inherit'
   */
  setDirection(direction: CanvasDirection): void {
    this.addDrawCommand({ type: 'setDirection', direction })
  }

  /**
   * Set the CSS filter for all subsequent drawing operations.
   * @param filter - CSS filter string (e.g., "blur(5px)", "contrast(150%)", "none")
   */
  setFilter(filter: string): void {
    this.addDrawCommand({ type: 'setFilter', filter })
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
    return this.inputCapture?.getInputState() ?? createEmptyInputState()
  }

  // --- Gamepad API ---

  /**
   * Get the number of connected gamepads.
   */
  getGamepadCount(): number {
    return this.inputCapture?.getConnectedGamepadCount() ?? 0
  }

  /**
   * Check if a gamepad is connected at the given index.
   * @param index - Gamepad index (0-3)
   */
  isGamepadConnected(index: number): boolean {
    const state = this.inputCapture?.getInputState()
    if (!state || index < 0 || index >= state.gamepads.length) {
      return false
    }
    return state.gamepads[index].connected
  }

  /**
   * Get the value of a gamepad button.
   * @param gamepadIndex - Gamepad index (0-3)
   * @param buttonIndex - Button index (0-16)
   * @returns Button value (0.0-1.0) or 0 if not available
   */
  getGamepadButton(gamepadIndex: number, buttonIndex: number): number {
    const state = this.inputCapture?.getInputState()
    if (!state || gamepadIndex < 0 || gamepadIndex >= state.gamepads.length) {
      return 0
    }
    const gamepad = state.gamepads[gamepadIndex]
    if (!gamepad.connected || buttonIndex < 0 || buttonIndex >= gamepad.buttons.length) {
      return 0
    }
    return gamepad.buttons[buttonIndex]
  }

  /**
   * Check if a gamepad button was just pressed this frame.
   * @param gamepadIndex - Gamepad index (0-3)
   * @param buttonIndex - Button index (0-16)
   * @returns true if button was just pressed
   */
  isGamepadButtonPressed(gamepadIndex: number, buttonIndex: number): boolean {
    const state = this.inputCapture?.getInputState()
    if (!state || gamepadIndex < 0 || gamepadIndex >= state.gamepads.length) {
      return false
    }
    const gamepad = state.gamepads[gamepadIndex]
    if (!gamepad.connected) {
      return false
    }
    return gamepad.buttonsPressed.includes(buttonIndex)
  }

  /**
   * Get the value of a gamepad axis.
   * @param gamepadIndex - Gamepad index (0-3)
   * @param axisIndex - Axis index (0-3)
   * @returns Axis value (-1.0 to 1.0) or 0 if not available
   */
  getGamepadAxis(gamepadIndex: number, axisIndex: number): number {
    const state = this.inputCapture?.getInputState()
    if (!state || gamepadIndex < 0 || gamepadIndex >= state.gamepads.length) {
      return 0
    }
    const gamepad = state.gamepads[gamepadIndex]
    if (!gamepad.connected || axisIndex < 0 || axisIndex >= gamepad.axes.length) {
      return 0
    }
    return gamepad.axes[axisIndex]
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

  // --- Asset API ---

  // --- Asset Path API ---

  /**
   * Add a directory path to scan for assets.
   * All image and font files in the directory (and subdirectories) will be discovered
   * and made available for loading via loadImageAsset() or loadFontAsset().
   *
   * Must be called BEFORE canvas.start().
   *
   * @param path - Directory path to scan (relative to script or absolute)
   * @throws Error if called after canvas.start()
   */
  addAssetPath(path: string): void {
    // During hot reload, paths may be re-added - just skip if already present
    // This check MUST come before the started check to allow reload to work
    if (this.assetPaths.includes(path)) {
      return
    }

    if (this.started) {
      throw new Error('Cannot add asset paths after canvas.start()')
    }

    this.assetPaths.push(path)
  }

  /**
   * Create a named reference to an image file discovered via add_path().
   * Can be called before or after canvas.start().
   *
   * @param name - Unique name to reference this image
   * @param filename - Filename of the image (must exist in a scanned path)
   * @returns AssetHandle that can be used in draw_image() or other functions
   * @throws Error if file not found after start() or if name already exists
   */
  loadImageAsset(name: string, filename: string): AssetHandle {
    // If we've already loaded files, validate that the file exists
    if (this.filesLoaded) {
      if (!this.discoveredFiles.has(filename)) {
        const scannedPaths = this.assetPaths.join(', ') || '(none)'
        throw new Error(
          `Image file '${filename}' not found in asset paths. Scanned paths: ${scannedPaths}`
        )
      }
    }

    // Check for duplicate name (but allow re-mapping same name)
    if (this.assetManifest.has(name)) {
      const existing = this.assetManifest.get(name)!
      // If mapping to a different file, warn but allow it
      if (existing.path !== filename) {
        console.warn(`Asset name '${name}' is being remapped from '${existing.path}' to '${filename}'`)
      }
    }

    // Create the asset mapping
    // For now, we use the filename as the path - loadAssets will resolve it from discoveredFiles
    this.assetManifest.set(name, { name, path: filename, type: 'image' })

    // Return a handle
    return {
      _type: 'image',
      _name: name,
      _file: filename,
    }
  }

  /**
   * Create a named reference to a font file discovered via add_path().
   * Can be called before or after canvas.start().
   *
   * @param name - Unique name to reference this font (use with set_font_family)
   * @param filename - Filename of the font (must exist in a scanned path)
   * @returns AssetHandle that can be used to reference the font
   * @throws Error if file not found after start() or if name already exists
   */
  loadFontAsset(name: string, filename: string): AssetHandle {
    // If we've already loaded files, validate that the file exists
    if (this.filesLoaded) {
      if (!this.discoveredFiles.has(filename)) {
        const scannedPaths = this.assetPaths.join(', ') || '(none)'
        throw new Error(
          `Font file '${filename}' not found in asset paths. Scanned paths: ${scannedPaths}`
        )
      }
    }

    // Check for duplicate name
    if (this.assetManifest.has(name)) {
      const existing = this.assetManifest.get(name)!
      if (existing.path !== filename) {
        console.warn(`Asset name '${name}' is being remapped from '${existing.path}' to '${filename}'`)
      }
    }

    // Create the asset mapping
    this.assetManifest.set(name, { name, path: filename, type: 'font' })

    // Return a handle
    return {
      _type: 'font',
      _name: name,
      _file: filename,
    }
  }

  /**
   * Check if a font asset has been loaded.
   * @param name - Name of the font asset
   * @returns true if the font is loaded and available
   */
  isFontLoaded(name: string): boolean {
    return this.fontCache?.has(name) ?? false
  }

  /**
   * Get the asset manifest (definitions registered via registerAsset).
   */
  getAssetManifest(): AssetManifest {
    return this.assetManifest
  }

  // --- Audio Asset API ---

  /**
   * Create a named reference to a sound effect file discovered via add_path().
   * Must be called before canvas.start().
   *
   * @param name - Unique name to reference this sound
   * @param filename - Filename of the audio file (must exist in a scanned path)
   * @returns AudioAssetHandle that can be used with play_sound()
   * @throws Error if called after canvas.start()
   */
  loadSoundAsset(name: string, filename: string): AudioAssetHandle {
    // During hot reload, assets may be re-registered - return existing handle
    const existing = this.audioAssetManifest.get(name)
    if (existing && existing.filename === filename) {
      return {
        _type: 'sound',
        _name: name,
        _file: filename,
      }
    }

    if (this.started) {
      throw new Error('Cannot load audio assets after canvas.start()')
    }

    // Register in the audio manifest
    this.audioAssetManifest.set(name, {
      name,
      filename,
      type: 'sound',
    })

    // Return a handle
    return {
      _type: 'sound',
      _name: name,
      _file: filename,
    }
  }

  /**
   * Create a named reference to a music file discovered via add_path().
   * Must be called before canvas.start().
   *
   * @param name - Unique name to reference this music track
   * @param filename - Filename of the audio file (must exist in a scanned path)
   * @returns AudioAssetHandle that can be used with play_music()
   * @throws Error if called after canvas.start()
   */
  loadMusicAsset(name: string, filename: string): AudioAssetHandle {
    // During hot reload, assets may be re-registered - return existing handle
    const existing = this.audioAssetManifest.get(name)
    if (existing && existing.filename === filename) {
      return {
        _type: 'music',
        _name: name,
        _file: filename,
      }
    }

    if (this.started) {
      throw new Error('Cannot load audio assets after canvas.start()')
    }

    // Register in the audio manifest
    this.audioAssetManifest.set(name, {
      name,
      filename,
      type: 'music',
    })

    // Return a handle
    return {
      _type: 'music',
      _name: name,
      _file: filename,
    }
  }

  /**
   * Get the audio engine for sound/music playback.
   * Returns null if the canvas has not been started or has no audio assets.
   */
  getAudioEngine(): IAudioEngine | null {
    return this.audioEngine
  }

  /**
   * Get the filesystem for file operations (used by hot reload).
   * Returns null if no filesystem is available.
   */
  getFileSystem(): IFileSystem | null {
    return this.callbacks.fileSystem ?? null
  }

  /**
   * Get the audio asset manifest (definitions registered via loadSoundAsset/loadMusicAsset).
   */
  getAudioAssetManifest(): AudioAssetManifest {
    return this.audioAssetManifest
  }

  /**
   * Load all registered assets from the filesystem.
   *
   * Scans directories registered via addAssetPath() and loads assets
   * that were mapped via loadImageAsset()/loadFontAsset().
   *
   * Must be called before start() for assets to be available.
   *
   * @param fileSystem - The filesystem to load assets from
   * @param scriptDirectory - The directory containing the script (for relative paths)
   * @throws Error if any asset fails to load
   */
  async loadAssets(fileSystem: IFileSystem, scriptDirectory: string): Promise<void> {
    // Create loader and caches
    const loader = new AssetLoader(fileSystem, scriptDirectory)
    this.imageCache = new ImageCache()
    this.fontCache = new FontCache()

    // Step 1: Scan all registered asset paths and discover files
    for (const path of this.assetPaths) {
      try {
        const files = loader.scanDirectory(path)
        for (const file of files) {
          // Store by relativePath - supports both bare filenames and subdirectory paths
          // e.g., "blue_ship.png" or "images/blue_ship.png"
          // First path wins on collision
          if (!this.discoveredFiles.has(file.relativePath)) {
            this.discoveredFiles.set(file.relativePath, file)
          } else {
            console.warn(
              `Asset file '${file.relativePath}' found in multiple paths. ` +
              `Using ${this.discoveredFiles.get(file.relativePath)!.fullPath}, ` +
              `ignoring ${file.fullPath}`
            )
          }
        }
      } catch (error) {
        // Re-throw with more context
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to scan asset path '${path}': ${message}`)
      }
    }

    // Mark files as loaded so subsequent load_image/load_font calls can validate
    this.filesLoaded = true

    // Skip if no assets to load
    if (this.assetManifest.size === 0 && this.discoveredFiles.size === 0) {
      return
    }

    // Step 2: Load each asset from the manifest
    for (const definition of this.assetManifest.values()) {
      // Resolve the actual path:
      // - If the path is in discoveredFiles (new API), use the full path
      // - Otherwise, use the path directly (legacy API)
      let resolvedPath = definition.path
      const discovered = this.discoveredFiles.get(definition.path)
      if (discovered) {
        resolvedPath = discovered.fullPath
      }

      // Create a modified definition with the resolved path
      const resolvedDefinition = { ...definition, path: resolvedPath }

      try {
        const loadedAsset = await loader.loadAsset(resolvedDefinition)

        if (definition.type === 'image') {
          // Convert ArrayBuffer to HTMLImageElement and store in cache
          // Note: We get dimensions from the loaded image element rather than
          // the AssetLoader because image-size doesn't work in the browser
          const image = await createImageFromData(loadedAsset.data, loadedAsset.mimeType)
          this.imageCache.set(definition.name, image)

          // Store dimensions from the loaded image (browser-native)
          this.assetDimensions.set(definition.name, {
            width: image.width,
            height: image.height,
          })
        } else if (definition.type === 'font') {
          // Load font using FontFace API and add to document
          const font = await createFontFromData(definition.name, loadedAsset.data)
          this.fontCache.set(definition.name, font)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to load asset '${definition.name}': ${message}`)
      }
    }

    // Step 3: Load audio assets if any are registered
    if (this.audioAssetManifest.size > 0) {
      // Initialize the audio engine
      this.audioEngine = new WebAudioEngine()
      await this.audioEngine.initialize()

      // Load each audio asset
      for (const audioDef of this.audioAssetManifest.values()) {
        // Resolve the audio file path from discovered files
        const discovered = this.discoveredFiles.get(audioDef.filename)
        if (!discovered) {
          const scannedPaths = this.assetPaths.join(', ') || '(none)'
          throw new Error(
            `Audio file '${audioDef.filename}' not found in asset paths. Scanned paths: ${scannedPaths}`
          )
        }

        try {
          const loadedAsset = await loader.loadAsset({
            name: audioDef.name,
            path: discovered.fullPath,
            type: 'audio',
          })

          // Decode the audio data
          await this.audioEngine.decodeAudio(audioDef.name, loadedAsset.data)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          throw new Error(`Failed to load audio asset '${audioDef.name}': ${message}`)
        }
      }
    }
  }

  /**
   * Draw an image asset at the specified position.
   * Supports two forms:
   * - Simple: drawImage(name, x, y, width?, height?) - draws at destination with optional scaling
   * - Source cropping: drawImage(name, dx, dy, dw, dh, sx, sy, sw, sh) - crops source and draws to destination
   *
   * @param nameOrHandle - Name of the asset (string) or AssetHandle from load_image()
   * @param x - X position (destination)
   * @param y - Y position (destination)
   * @param width - Optional width (destination, for scaling)
   * @param height - Optional height (destination, for scaling)
   * @param sx - Optional source X (top-left of source rect)
   * @param sy - Optional source Y (top-left of source rect)
   * @param sw - Optional source width
   * @param sh - Optional source height
   * @throws Error if asset is unknown
   */
  drawImage(
    nameOrHandle: string | AssetHandle,
    x: number,
    y: number,
    width?: number,
    height?: number,
    sx?: number,
    sy?: number,
    sw?: number,
    sh?: number
  ): void {
    // Extract name from handle if needed
    const name = isAssetHandle(nameOrHandle) ? nameOrHandle._name : nameOrHandle

    // Verify asset is registered
    if (!this.assetDimensions.has(name)) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`)
    }

    const command: DrawCommand = { type: 'drawImage', name, x, y }
    if (width !== undefined && height !== undefined) {
      (command as { width?: number; height?: number }).width = width;
      (command as { width?: number; height?: number }).height = height
    }
    // Add source rect params if provided (9-arg form)
    if (sx !== undefined && sy !== undefined && sw !== undefined && sh !== undefined) {
      (command as { sx?: number; sy?: number; sw?: number; sh?: number }).sx = sx;
      (command as { sx?: number; sy?: number; sw?: number; sh?: number }).sy = sy;
      (command as { sx?: number; sy?: number; sw?: number; sh?: number }).sw = sw;
      (command as { sx?: number; sy?: number; sw?: number; sh?: number }).sh = sh
    }
    this.addDrawCommand(command)
  }

  /**
   * Get the width of a loaded asset.
   * @param nameOrHandle - Name of the asset (string) or AssetHandle
   * @returns Width in pixels
   * @throws Error if asset is unknown
   */
  getAssetWidth(nameOrHandle: string | AssetHandle): number {
    const name = isAssetHandle(nameOrHandle) ? nameOrHandle._name : nameOrHandle
    const dims = this.assetDimensions.get(name)
    if (!dims) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`)
    }
    return dims.width
  }

  /**
   * Get the height of a loaded asset.
   * @param nameOrHandle - Name of the asset (string) or AssetHandle
   * @returns Height in pixels
   * @throws Error if asset is unknown
   */
  getAssetHeight(nameOrHandle: string | AssetHandle): number {
    const name = isAssetHandle(nameOrHandle) ? nameOrHandle._name : nameOrHandle
    const dims = this.assetDimensions.get(name)
    if (!dims) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`)
    }
    return dims.height
  }

  // --- Hit Testing API ---

  /**
   * Get the current path for testing purposes.
   * @returns The current Path2D object
   */
  getCurrentPath(): Path2D {
    return this.currentPath
  }

  /**
   * Check if a point is inside the current path.
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @param fillRule - Fill rule: 'nonzero' (default) or 'evenodd'
   * @returns true if the point is inside the path
   */
  isPointInPath(x: number, y: number, fillRule: FillRule = 'nonzero'): boolean {
    if (!this.renderer) return false
    return this.renderer.isPointInPath(this.currentPath, x, y, fillRule)
  }

  /**
   * Check if a point is on the stroke of the current path.
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @returns true if the point is on the path's stroke
   */
  isPointInStroke(x: number, y: number): boolean {
    if (!this.renderer) return false
    return this.renderer.isPointInStroke(this.currentPath, x, y)
  }

  // ============================================================================
  // Pixel Manipulation Methods
  // ============================================================================

  /**
   * Flush any pending draw commands to the canvas.
   * This ensures all drawing operations are applied before reading pixel data.
   */
  private flushCommands(): void {
    if (this.renderer && this.frameCommands.length > 0) {
      this.renderer.render(this.frameCommands)
      this.frameCommands = []
    }
  }

  /**
   * Get pixel data from a region of the canvas.
   * @param x - X coordinate of the top-left corner
   * @param y - Y coordinate of the top-left corner
   * @param width - Width of the region to read
   * @param height - Height of the region to read
   * @returns Array of RGBA values, or null if renderer not available
   */
  getImageData(x: number, y: number, width: number, height: number): number[] | null {
    if (!this.renderer) return null
    // Flush pending commands to ensure all drawing is applied before reading
    this.flushCommands()
    const imageData = this.renderer.getImageData(x, y, width, height)
    return Array.from(imageData.data)
  }

  /**
   * Write pixel data to the canvas.
   * @param data - Array of RGBA values
   * @param width - Width of the image data
   * @param height - Height of the image data
   * @param dx - Destination X coordinate
   * @param dy - Destination Y coordinate
   * @param dirtyX - Optional dirty rect X coordinate (sub-region to draw)
   * @param dirtyY - Optional dirty rect Y coordinate (sub-region to draw)
   * @param dirtyWidth - Optional dirty rect width (sub-region to draw)
   * @param dirtyHeight - Optional dirty rect height (sub-region to draw)
   */
  putImageData(
    data: number[],
    width: number,
    height: number,
    dx: number,
    dy: number,
    dirtyX?: number,
    dirtyY?: number,
    dirtyWidth?: number,
    dirtyHeight?: number
  ): void {
    this.addDrawCommand({
      type: 'putImageData',
      data,
      width,
      height,
      dx,
      dy,
      dirtyX,
      dirtyY,
      dirtyWidth,
      dirtyHeight,
    })
  }

  /**
   * Create a new empty image data array.
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @returns Array of zeros with length width * height * 4
   */
  createImageData(width: number, height: number): number[] {
    return new Array(width * height * 4).fill(0)
  }

  /**
   * Capture the canvas contents as a data URL.
   * @param type - MIME type (e.g., 'image/png', 'image/jpeg', 'image/webp')
   * @param quality - Quality for lossy formats (0-1), only used for jpeg/webp
   * @returns Data URL string (base64 encoded) or empty string if not active
   */
  capture(type?: string, quality?: number): string {
    if (!this.renderer) {
      return ''
    }
    return this.renderer.capture(type, quality)
  }

  // --- Reusable Path2D API ---

  /**
   * Create a new Path2D object, optionally from an SVG path string.
   * @param svgPath - Optional SVG path data string (e.g., "M10 10 L50 50 Z")
   * @returns Object with `id` for referencing the path
   */
  createPath(svgPath?: string): { id: number } {
    const path = svgPath ? new Path2D(svgPath) : new Path2D()
    const id = this.nextPathId++
    this.pathRegistry.set(id, path)
    return { id }
  }

  /**
   * Clone an existing Path2D object.
   * @param pathId - ID of the path to clone
   * @returns Object with `id` for the new path, or null if source not found
   */
  clonePath(pathId: number): { id: number } | null {
    const source = this.pathRegistry.get(pathId)
    if (!source) return null
    const cloned = new Path2D(source)
    const id = this.nextPathId++
    this.pathRegistry.set(id, cloned)
    return { id }
  }

  /**
   * Dispose a Path2D object to free memory.
   * @param pathId - ID of the path to dispose
   */
  disposePath(pathId: number): void {
    this.pathRegistry.delete(pathId)
  }

  // --- Path2D building methods ---

  /** Move to a point on a stored path */
  pathMoveTo(pathId: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.moveTo(x, y)
  }

  /** Draw line to a point on a stored path */
  pathLineTo(pathId: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.lineTo(x, y)
  }

  /** Close a stored path */
  pathClosePath(pathId: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.closePath()
  }

  /** Add a rectangle to a stored path */
  pathRect(pathId: number, x: number, y: number, width: number, height: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.rect(x, y, width, height)
  }

  /** Add a rounded rectangle to a stored path */
  pathRoundRect(pathId: number, x: number, y: number, width: number, height: number, radii: number | number[]): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.roundRect(x, y, width, height, radii)
  }

  /** Add an arc to a stored path */
  pathArc(pathId: number, x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.arc(x, y, radius, startAngle, endAngle, counterclockwise)
  }

  /** Add an arc to a stored path using control points */
  pathArcTo(pathId: number, x1: number, y1: number, x2: number, y2: number, radius: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.arcTo(x1, y1, x2, y2, radius)
  }

  /** Add an ellipse to a stored path */
  pathEllipse(pathId: number, x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
  }

  /** Add a quadratic curve to a stored path */
  pathQuadraticCurveTo(pathId: number, cpx: number, cpy: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.quadraticCurveTo(cpx, cpy, x, y)
  }

  /** Add a bezier curve to a stored path */
  pathBezierCurveTo(pathId: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
  }

  /** Add another path to a stored path */
  pathAddPath(pathId: number, sourcePathId: number): void {
    const path = this.pathRegistry.get(pathId)
    const source = this.pathRegistry.get(sourcePathId)
    if (path && source) path.addPath(source)
  }

  // --- Path2D rendering methods ---

  /** Fill a stored path - adds command to queue for proper rendering order */
  fillPath(pathId: number, fillRule?: FillRule): void {
    if (!this.pathRegistry.has(pathId)) return
    this.addDrawCommand({ type: 'fillPath', pathId, fillRule })
  }

  /** Stroke a stored path - adds command to queue for proper rendering order */
  strokePath(pathId: number): void {
    if (!this.pathRegistry.has(pathId)) return
    this.addDrawCommand({ type: 'strokePath', pathId })
  }

  /** Clip to a stored path - adds command to queue for proper rendering order */
  clipPath(pathId: number, fillRule?: FillRule): void {
    if (!this.pathRegistry.has(pathId)) return
    this.addDrawCommand({ type: 'clipPath', pathId, fillRule })
  }

  /** Check if a point is in a stored path */
  isPointInStoredPath(pathId: number, x: number, y: number, fillRule?: FillRule): boolean {
    const path = this.pathRegistry.get(pathId)
    if (!path) return false
    return this.renderer?.isPointInPath(path, x, y, fillRule) ?? false
  }

  /** Check if a point is in a stored path's stroke */
  isPointInStoredStroke(pathId: number, x: number, y: number): boolean {
    const path = this.pathRegistry.get(pathId)
    if (!path) return false
    return this.renderer?.isPointInStroke(path, x, y) ?? false
  }

  // --- Internal ---

  /**
   * Frame callback from GameLoopController.
   */
  private onFrame(timing: TimingInfo): void {
    if (!this.running) return

    // Store timing for API access
    this.currentTiming = timing

    // Clear frame commands
    this.frameCommands = []

    // Poll gamepads before calling onDraw so input is up-to-date
    this.inputCapture?.pollGamepads()

    // Call the Lua onDraw callback
    if (this.onDrawCallback) {
      try {
        this.onDrawCallback()
      } catch (error) {
        // Errors in onDraw should stop the canvas and report to shell
        const errorMessage = formatOnDrawError(error)
        this.callbacks.onError?.(errorMessage)
        this.stop()
        return
      }
    }

    // Flush output buffer so print() output appears immediately
    this.callbacks.onFlushOutput?.()

    // Render accumulated draw commands
    if (this.renderer && this.frameCommands.length > 0) {
      this.renderFrameCommands()
    }

    // Update input capture (clear "just pressed" state)
    this.inputCapture?.update()
  }

  /**
   * Render frame commands, handling Path2D commands specially.
   * Path2D commands reference paths by ID and need to be looked up in the registry.
   */
  private renderFrameCommands(): void {
    if (!this.renderer) return

    // Separate Path2D commands from regular commands
    const regularCommands: DrawCommand[] = []
    const path2dCommands: { index: number; command: DrawCommand }[] = []

    for (let i = 0; i < this.frameCommands.length; i++) {
      const command = this.frameCommands[i]
      if (command.type === 'fillPath' || command.type === 'strokePath' || command.type === 'clipPath') {
        path2dCommands.push({ index: i, command })
      } else {
        regularCommands.push(command)
      }
    }

    // If no Path2D commands, render all at once (fast path)
    if (path2dCommands.length === 0) {
      this.renderer.render(this.frameCommands)
      return
    }

    // Process commands in order, handling Path2D commands specially
    let regularBatch: DrawCommand[] = []

    for (let i = 0; i < this.frameCommands.length; i++) {
      const command = this.frameCommands[i]

      if (command.type === 'fillPath') {
        // Flush regular commands first
        if (regularBatch.length > 0) {
          this.renderer.render(regularBatch)
          regularBatch = []
        }
        // Process Path2D fill
        const path = this.pathRegistry.get(command.pathId)
        if (path) {
          this.renderer.fillPath(path, command.fillRule)
        }
      } else if (command.type === 'strokePath') {
        // Flush regular commands first
        if (regularBatch.length > 0) {
          this.renderer.render(regularBatch)
          regularBatch = []
        }
        // Process Path2D stroke
        const path = this.pathRegistry.get(command.pathId)
        if (path) {
          this.renderer.strokePath(path)
        }
      } else if (command.type === 'clipPath') {
        // Flush regular commands first
        if (regularBatch.length > 0) {
          this.renderer.render(regularBatch)
          regularBatch = []
        }
        // Process Path2D clip
        const path = this.pathRegistry.get(command.pathId)
        if (path) {
          this.renderer.clipPath(path, command.fillRule)
        }
      } else {
        // Regular command - batch it
        regularBatch.push(command)
      }
    }

    // Flush any remaining regular commands
    if (regularBatch.length > 0) {
      this.renderer.render(regularBatch)
    }
  }
}
