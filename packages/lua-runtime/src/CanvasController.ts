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
  VALID_IMAGE_EXTENSIONS,
  VALID_FONT_EXTENSIONS,
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
} from '@lua-learning/canvas-runtime'
import type { IFileSystem } from '@lua-learning/shell-core'
import { formatOnDrawError, createImageFromData, createFontFromData } from './canvasErrorFormatter'

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

  // Track whether start() has been called (prevents adding assets after start)
  private started = false

  // Track whether start() is currently in progress (prevents concurrent start calls)
  private startInProgress = false

  // Asset manifest: registered asset definitions
  private assetManifest: AssetManifest = new Map()

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

  // Offscreen canvas for text measurement
  private measureCanvas: HTMLCanvasElement | null = null
  private measureCtx: CanvasRenderingContext2D | null = null

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

    if (this.startInProgress) {
      throw new Error('Canvas start() is already in progress.')
    }

    // Mark as started (prevents adding new assets) and in progress
    this.started = true
    this.startInProgress = true

    // Auto-load assets if they are registered but not yet loaded
    if (this.assetManifest.size > 0 && !this.imageCache) {
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

    // Close the canvas tab
    this.callbacks.onCloseCanvasTab(this.canvasId)
    this.canvas = null

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
    options?: { fontSize?: number; fontFamily?: string }
  ): void {
    const command: DrawCommand = { type: 'text', x, y, text }
    if (options?.fontSize !== undefined) {
      (command as { fontSize?: number }).fontSize = options.fontSize
    }
    if (options?.fontFamily !== undefined) {
      (command as { fontFamily?: string }).fontFamily = options.fontFamily
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
    this.addDrawCommand({ type: 'beginPath' })
  }

  /**
   * Close the current path by drawing a line to the starting point.
   */
  closePath(): void {
    this.addDrawCommand({ type: 'closePath' })
  }

  /**
   * Move the current point to a new position without drawing.
   */
  moveTo(x: number, y: number): void {
    this.addDrawCommand({ type: 'moveTo', x, y })
  }

  /**
   * Draw a line from the current point to a new position.
   */
  lineTo(x: number, y: number): void {
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
    this.addDrawCommand({ type: 'roundRect', x, y, width, height, radii })
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

  // --- Asset API ---

  /**
   * Register an image asset to be loaded when canvas.start() is called.
   * @param name - Unique name to reference this asset
   * @param path - Path to the image file (relative or absolute)
   * @throws Error if called after canvas.start() or if file extension is invalid
   */
  registerAsset(name: string, path: string): void {
    // Check if started
    if (this.started) {
      throw new Error('Cannot define assets after canvas.start()')
    }

    // Validate image extension
    const lowerPath = path.toLowerCase()
    const hasValidExtension = VALID_IMAGE_EXTENSIONS.some((ext) =>
      lowerPath.endsWith(ext)
    )
    if (!hasValidExtension) {
      throw new Error(
        `Cannot load '${path}': unsupported format (expected PNG, JPG, GIF, or WebP)`
      )
    }

    // Register the asset definition
    this.assetManifest.set(name, { name, path, type: 'image' })
  }

  /**
   * Register a font asset to be loaded when canvas.start() is called.
   * @param name - Unique name to reference this font (use with set_font_family)
   * @param path - Path to the font file (.ttf, .otf, .woff, .woff2)
   * @throws Error if called after canvas.start() or if file extension is invalid
   */
  registerFontAsset(name: string, path: string): void {
    // Check if started
    if (this.started) {
      throw new Error('Cannot define assets after canvas.start()')
    }

    // Validate font extension
    const lowerPath = path.toLowerCase()
    const hasValidExtension = VALID_FONT_EXTENSIONS.some((ext) =>
      lowerPath.endsWith(ext)
    )
    if (!hasValidExtension) {
      throw new Error(
        `Cannot load '${path}': unsupported font format (expected TTF, OTF, WOFF, or WOFF2)`
      )
    }

    // Register the asset definition
    this.assetManifest.set(name, { name, path, type: 'font' })
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

  /**
   * Load all registered assets from the filesystem.
   * Must be called before start() for assets to be available.
   *
   * @param fileSystem - The filesystem to load assets from
   * @param scriptDirectory - The directory containing the script (for relative paths)
   * @throws Error if any asset fails to load
   */
  async loadAssets(fileSystem: IFileSystem, scriptDirectory: string): Promise<void> {
    // Skip if no assets registered
    if (this.assetManifest.size === 0) {
      return
    }

    // Create loader and caches
    const loader = new AssetLoader(fileSystem, scriptDirectory)
    this.imageCache = new ImageCache()
    this.fontCache = new FontCache()

    // Load each asset
    for (const definition of this.assetManifest.values()) {
      const loadedAsset = await loader.loadAsset(definition)

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
    }
  }

  /**
   * Draw an image asset at the specified position.
   * @param name - Name of the asset to draw
   * @param x - X position
   * @param y - Y position
   * @param width - Optional width (for scaling)
   * @param height - Optional height (for scaling)
   * @throws Error if asset is unknown
   */
  drawImage(name: string, x: number, y: number, width?: number, height?: number): void {
    // Verify asset is registered
    if (!this.assetDimensions.has(name)) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.image()?`)
    }

    const command: DrawCommand = { type: 'drawImage', name, x, y }
    if (width !== undefined && height !== undefined) {
      (command as { type: 'drawImage'; name: string; x: number; y: number; width?: number; height?: number }).width = width;
      (command as { type: 'drawImage'; name: string; x: number; y: number; width?: number; height?: number }).height = height
    }
    this.addDrawCommand(command)
  }

  /**
   * Get the width of a loaded asset.
   * @param name - Name of the asset
   * @returns Width in pixels
   * @throws Error if asset is unknown
   */
  getAssetWidth(name: string): number {
    const dims = this.assetDimensions.get(name)
    if (!dims) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.image()?`)
    }
    return dims.width
  }

  /**
   * Get the height of a loaded asset.
   * @param name - Name of the asset
   * @returns Height in pixels
   * @throws Error if asset is unknown
   */
  getAssetHeight(name: string): number {
    const dims = this.assetDimensions.get(name)
    if (!dims) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.image()?`)
    }
    return dims.height
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

    // Render accumulated draw commands
    if (this.renderer && this.frameCommands.length > 0) {
      this.renderer.render(this.frameCommands)
    }

    // Update input capture (clear "just pressed" state)
    this.inputCapture?.update()
  }
}
