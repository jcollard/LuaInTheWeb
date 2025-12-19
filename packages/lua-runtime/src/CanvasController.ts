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
  AssetLoader,
  VALID_IMAGE_EXTENSIONS,
} from '@lua-learning/canvas-runtime'
import type {
  DrawCommand,
  InputState,
  TimingInfo,
  AssetManifest,
} from '@lua-learning/canvas-runtime'
import type { IFileSystem } from '@lua-learning/shell-core'

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

  // Asset dimensions: width/height for each loaded asset
  private assetDimensions: Map<string, { width: number; height: number }> = new Map()

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

    // Create loader and cache
    const loader = new AssetLoader(fileSystem, scriptDirectory)
    this.imageCache = new ImageCache()

    // Load each asset
    for (const definition of this.assetManifest.values()) {
      const loadedAsset = await loader.loadAsset(definition)

      // Convert ArrayBuffer to HTMLImageElement and store in cache
      // Note: We get dimensions from the loaded image element rather than
      // the AssetLoader because image-size doesn't work in the browser
      const image = await this.createImageFromData(loadedAsset.data, loadedAsset.mimeType)
      this.imageCache.set(definition.name, image)

      // Store dimensions from the loaded image (browser-native)
      this.assetDimensions.set(definition.name, {
        width: image.width,
        height: image.height,
      })
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

  /**
   * Create an HTMLImageElement from binary data.
   * @param data - The image binary data
   * @param mimeType - The MIME type of the image
   * @returns Promise resolving to the loaded HTMLImageElement
   */
  private createImageFromData(data: ArrayBuffer, mimeType?: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([data], { type: mimeType ?? 'image/png' })
      const url = URL.createObjectURL(blob)

      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      image.src = url
    })
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
