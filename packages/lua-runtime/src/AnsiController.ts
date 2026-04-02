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

import { InputCapture, GameLoopController } from '@lua-learning/canvas-runtime'
import { InputAPI } from './InputAPI'
import type { TimingInfo } from '@lua-learning/canvas-runtime'
import { initSchedule, computePlaybackTick, type LayerSchedule } from '@lua-learning/ansi-shared'
import { parseScreenLayers } from './screenParser'
import { compositeGridInto } from './screenCompositor'
import { renderGridToAnsiString, renderDiffAnsiString } from './ansiStringRenderer'
import { renderTextLayerGrid } from './textLayerGrid'
import { createEmptyGrid, type AnsiGrid, type LayerData, type DrawnLayerData, type TextLayerData, type RGBColor } from './screenTypes'
import { startSwipeOut, startSwipeIn, startDitherOut, startDitherIn, advanceTransition, type TransitionState, type SwipeDirection } from './screenSwipe'

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
  /** Enable/disable CRT monitor effect with optional intensity or per-effect config */
  setCrt?: (enabled: boolean, intensity?: number, config?: Record<string, number>) => void
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
 * Layer information returned by getScreenLayers().
 */
export interface LayerInfo {
  id: string
  name: string
  type: string
  visible: boolean
  tags: string[]
}

/**
 * Per-screen state consolidating all screen-related data.
 */
interface ScreenState {
  ansiString: string
  layers: LayerData[]
  schedule: LayerSchedule | null
  playing: boolean
  /** True once screenPlay() or screenPause() has been explicitly called. */
  playbackTouched: boolean
  lastGrid: AnsiGrid | null
  /** True when the full ANSI string needs to be written to the terminal. */
  dirty: boolean
  needsRecomposite: boolean
  swipe: TransitionState | null
}

/** Format an onTick error for display. */
function formatOnTickError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Controller for managing ANSI terminal lifecycle in LuaScriptProcess.
 */
export class AnsiController {
  private readonly callbacks: AnsiCallbacks
  private readonly ansiId: string
  private handle: AnsiTerminalHandle | null = null
  private inputCapture: InputCapture | null = null
  private inputAPI: InputAPI = new InputAPI()
  private gameLoop: GameLoopController | null = null
  private currentTiming: TimingInfo = { deltaTime: 0, totalTime: 0, frameNumber: 0 }
  private running = false
  private stopResolver: (() => void) | null = null
  private pendingCrt: { enabled: boolean; intensity?: number; config?: Record<string, number> } | null = null
  private onTickCallback: (() => void) | null = null
  private nextScreenId = 1
  private screenStates: Map<number, ScreenState> = new Map()
  private activeScreenId: number | null = null
  private compositeBufferA: AnsiGrid = createEmptyGrid()
  private compositeBufferB: AnsiGrid = createEmptyGrid()
  private useBufferA = true
  private groupGridCache: Map<string, AnsiGrid> = new Map()

  constructor(callbacks: AnsiCallbacks, ansiId = 'ansi-main') {
    this.callbacks = callbacks
    this.ansiId = ansiId
  }

  /**
   * Get or create the screen state for a given screen ID.
   */
  private getScreenState(id: number): ScreenState {
    let state = this.screenStates.get(id)
    if (!state) {
      state = { ansiString: '', layers: [], schedule: null, playing: false, playbackTouched: false, lastGrid: null, dirty: false, needsRecomposite: false, swipe: null }
      this.screenStates.set(id, state)
    }
    return state
  }

  /** Check if the terminal is currently active. */
  isActive(): boolean { return this.running }

  /** Set the onTick callback from Lua. */
  setOnTickCallback(callback: () => void): void { this.onTickCallback = callback }

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

    // Clear all screen state
    this.screenStates.clear()
    this.groupGridCache.clear()
    this.activeScreenId = null
    this.nextScreenId = 1

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
    const r = Math.max(1, Math.min(AnsiController.ROWS, Math.floor(row)))
    const c = Math.max(1, Math.min(AnsiController.COLS, Math.floor(col)))
    this.handle?.write(`\x1b[${r};${c}H`)
  }

  /**
   * Clear the terminal and reset cursor to top-left.
   */
  clear(): void {
    this.handle?.write('\x1b[2J\x1b[H')
  }

  private static clampRgb(val: number): number {
    return Math.max(0, Math.min(255, Math.floor(val)))
  }

  /**
   * Set foreground (text) color using 24-bit true color escape sequence.
   */
  setForeground(r: number, g: number, b: number): void {
    const cr = AnsiController.clampRgb(r)
    const cg = AnsiController.clampRgb(g)
    const cb = AnsiController.clampRgb(b)
    this.handle?.write(`\x1b[38;2;${cr};${cg};${cb}m`)
  }

  /**
   * Set background color using 24-bit true color escape sequence.
   */
  setBackground(r: number, g: number, b: number): void {
    const cr = AnsiController.clampRgb(r)
    const cg = AnsiController.clampRgb(g)
    const cb = AnsiController.clampRgb(b)
    this.handle?.write(`\x1b[48;2;${cr};${cg};${cb}m`)
  }

  /**
   * Reset all terminal attributes to defaults.
   */
  reset(): void {
    this.handle?.write('\x1b[0m')
  }

  /** Enable/disable CRT monitor effect. Stores config if called before start(). */
  setCrt(enabled: boolean, intensity?: number, config?: Record<string, number>): void {
    if (!this.handle) { this.pendingCrt = { enabled, intensity, config }; return }
    this.handle.setCrt?.(enabled, intensity, config)
  }

  /** Get and clear any CRT config set before start(). */
  consumePendingCrt(): { enabled: boolean; intensity?: number; config?: Record<string, number> } | null {
    const pending = this.pendingCrt; this.pendingCrt = null; return pending
  }

  // --- Timing API ---

  /** Get delta time since last frame in seconds. */
  getDelta(): number { return this.currentTiming.deltaTime }
  /** Get total elapsed time in seconds. */
  getTime(): number { return this.currentTiming.totalTime }

  // --- Input API (delegated to InputAPI) ---

  /** Check if a key is currently held down. */
  isKeyDown(code: string): boolean { return this.inputAPI.isKeyDown(code) }
  /** Check if a key was just pressed this frame. */
  isKeyPressed(code: string): boolean { return this.inputAPI.isKeyPressed(code) }
  /** Get all keys currently held down. */
  getKeysDown(): string[] { return this.inputAPI.getKeysDown() }
  /** Get all keys pressed this frame. */
  getKeysPressed(): string[] { return this.inputAPI.getKeysPressed() }

  // --- Mouse Input API ---

  private static readonly COLS = 80
  private static readonly ROWS = 25

  /**
   * Get the container's bounding rect, or null if unavailable or zero-sized.
   */
  private getContainerRect(): DOMRect | null {
    if (!this.handle) return null
    const rect = this.handle.container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return rect
  }

  /**
   * Get the mouse column in 1-based cell coordinates, clamped to 1-COLS.
   */
  getMouseCol(): number {
    const rect = this.getContainerRect()
    if (!rect) return 1
    const col = Math.floor(this.inputAPI.getMouseX() / rect.width * AnsiController.COLS) + 1
    return Math.max(1, Math.min(AnsiController.COLS, col))
  }

  /**
   * Get the mouse row in 1-based cell coordinates, clamped to 1-ROWS.
   */
  getMouseRow(): number {
    const rect = this.getContainerRect()
    if (!rect) return 1
    const row = Math.floor(this.inputAPI.getMouseY() / rect.height * AnsiController.ROWS) + 1
    return Math.max(1, Math.min(AnsiController.ROWS, row))
  }

  /**
   * Check if the mouse cursor is in the top half of the current cell.
   * Useful for half-block rendering at effective 80x50 resolution.
   */
  isMouseTopHalf(): boolean {
    const rect = this.getContainerRect()
    if (!rect) return false
    const cellFraction = (this.inputAPI.getMouseY() / rect.height * AnsiController.ROWS) % 1
    return cellFraction < 0.5
  }

  /**
   * Get the raw unscaled pixel X coordinate.
   */
  getMouseX(): number {
    const rect = this.getContainerRect()
    if (!rect) return 0
    const scale = rect.width / this.handle!.container.scrollWidth
    return this.inputAPI.getMouseX() / scale
  }

  /**
   * Get the raw unscaled pixel Y coordinate.
   */
  getMouseY(): number {
    const rect = this.getContainerRect()
    if (!rect) return 0
    const scale = rect.height / this.handle!.container.scrollHeight
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

  // --- Screen API ---

  /**
   * Create a screen from ANSI file data.
   * Parses the data, stores layers for later manipulation,
   * composites and renders to an ANSI escape string, and returns the ID.
   */
  createScreen(data: Record<string, unknown>): number {
    const layers = parseScreenLayers(data)
    const id = this.nextScreenId++
    const state = this.getScreenState(id)
    state.layers = layers
    this.recompositeScreen(id)
    return id
  }

  /**
   * Set the active background screen.
   * Pass null to clear the active screen.
   */
  setScreen(id: number | null): void {
    if (id === null) {
      this.activeScreenId = null
      return
    }
    if (!this.screenStates.has(id)) {
      throw new Error(`Screen ID ${id} not found. Create a screen first with ansi.create_screen().`)
    }
    this.activeScreenId = id

    // Mark as dirty so onFrame writes the full screen
    const state = this.getScreenState(id)
    state.dirty = true

    // Auto-start playback if screen has animated layers and isn't already paused
    if (!state.playbackTouched) {
      if (this.hasAnimatedLayers(state.layers)) {
        this.screenPlay(id)
      }
    }
  }

  /**
   * Get the active screen ID, or null if no screen is active.
   */
  getActiveScreenId(): number | null {
    return this.activeScreenId
  }

  // --- Layer Visibility API ---

  /**
   * Validate that a screen exists and return its layers.
   * @throws Error if the screen ID is not found.
   */
  private validateScreenExists(id: number): LayerData[] {
    const state = this.screenStates.get(id)
    if (!state) {
      throw new Error(`Screen ID ${id} not found. Create a screen first with ansi.create_screen().`)
    }
    return state.layers
  }

  /**
   * Get layer information for a screen.
   */
  getScreenLayers(id: number): LayerInfo[] {
    const layers = this.validateScreenExists(id)
    return layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      tags: layer.tags,
    }))
  }

  /**
   * Set layer visibility by identifier (ID, name, or tag) and re-composite.
   */
  setScreenLayerVisible(id: number, identifier: string, visible: boolean): void {
    const layers = this.validateScreenExists(id)
    const matched = this.resolveLayersByIdentifier(layers, identifier)
    if (matched.length === 0) {
      throw new Error(`No layers match identifier "${identifier}" in screen ${id}.`)
    }
    for (const layer of matched) {
      layer.visible = visible
    }
    this.recompositeScreen(id)
  }

  /**
   * Toggle layer visibility by identifier (ID, name, or tag) and re-composite.
   */
  toggleScreenLayer(id: number, identifier: string): void {
    const layers = this.validateScreenExists(id)
    const matched = this.resolveLayersByIdentifier(layers, identifier)
    if (matched.length === 0) {
      throw new Error(`No layers match identifier "${identifier}" in screen ${id}.`)
    }
    for (const layer of matched) {
      layer.visible = !layer.visible
    }
    this.recompositeScreen(id)
  }

  /**
   * Set the text of text layer(s) matching an identifier.
   * Non-text layers are silently skipped. Errors if zero text layers match.
   */
  setScreenLabel(id: number, identifier: string, text: string, textFg?: RGBColor, textFgColors?: RGBColor[], textBg?: RGBColor, textBgColors?: RGBColor[]): void {
    const layers = this.validateScreenExists(id)
    const matched = this.resolveLayersByIdentifier(layers, identifier)
    if (matched.length === 0) {
      throw new Error(`No layers match identifier "${identifier}" in screen ${id}.`)
    }
    const textLayers = matched.filter((l): l is TextLayerData => l.type === 'text')
    if (textLayers.length === 0) {
      throw new Error(`No text layers match identifier "${identifier}" in screen ${id}.`)
    }
    for (const layer of textLayers) {
      layer.text = text
      if (textFg !== undefined) layer.textFg = textFg
      layer.textFgColors = textFgColors
      layer.textBg = textBg
      layer.textBgColors = textBgColors
      layer.grid = renderTextLayerGrid(layer.text, layer.bounds, layer.textFg, layer.textFgColors, layer.textAlign, layer.textBg, layer.textBgColors)
    }
    this.recompositeScreen(id)
  }

  /**
   * Resolve layers by identifier: first try exact ID match, then name match, then tag match.
   */
  private resolveLayersByIdentifier(layers: LayerData[], identifier: string): LayerData[] {
    if (identifier === '') {
      throw new Error('Layer identifier must not be empty.')
    }

    // Try exact ID match
    const byId = layers.filter(l => l.id === identifier)
    if (byId.length > 0) return byId

    // Try name match
    const byName = layers.filter(l => l.name === identifier)
    if (byName.length > 0) return byName

    // Try tag match
    const byTag = layers.filter(l => l.tags.includes(identifier))
    return byTag
  }

  // --- Animation Playback API ---

  /**
   * Start or resume animation playback for a screen.
   */
  screenPlay(id: number): void {
    this.validateScreenExists(id)
    const state = this.getScreenState(id)
    state.playing = true
    state.playbackTouched = true
  }

  /**
   * Pause animation playback for a screen.
   */
  screenPause(id: number): void {
    this.validateScreenExists(id)
    const state = this.getScreenState(id)
    state.playing = false
    state.playbackTouched = true
    // Clear schedule so it re-initializes on next play
    state.schedule = null
  }

  /**
   * Check if animation is currently playing for a screen.
   */
  screenIsPlaying(id: number): boolean { return this.screenStates.get(id)?.playing ?? false }

  screenSwipeOut(id: number, duration: number, color: RGBColor, char: string, dir: SwipeDirection): void { this.validateScreenExists(id); startSwipeOut(this.getScreenState(id), duration, color, char, dir, this.groupGridCache) }
  screenSwipeIn(id: number, identifier: string, duration: number, dir: SwipeDirection): void { const layers = this.validateScreenExists(id); const m = this.resolveLayersByIdentifier(layers, identifier); if (m.length === 0) throw new Error(`No layers match "${identifier}" in screen ${id}.`); startSwipeIn(this.getScreenState(id), layers, m, duration, dir, this.groupGridCache) }
  screenDitherOut(id: number, duration: number, color: RGBColor, char: string, seed: number): void { this.validateScreenExists(id); startDitherOut(this.getScreenState(id), duration, color, char, seed, this.groupGridCache) }
  screenDitherIn(id: number, identifier: string, duration: number, seed: number): void { const layers = this.validateScreenExists(id); const m = this.resolveLayersByIdentifier(layers, identifier); if (m.length === 0) throw new Error(`No layers match "${identifier}" in screen ${id}.`); startDitherIn(this.getScreenState(id), layers, m, duration, seed, this.groupGridCache) }
  screenIsSwiping(id: number): boolean { return (this.screenStates.get(id)?.swipe ?? null) !== null }

  /**
   * Check if any layers in the list are animated (drawn with multiple frames).
   */
  private hasAnimatedLayers(layers: LayerData[]): boolean {
    return layers.some(l => l.type === 'drawn' && (l as DrawnLayerData).frames.length > 1)
  }

  /**
   * Mark a screen as needing re-compositing. The actual work is deferred
   * to flushRecomposite() which batches all changes per frame.
   */
  private recompositeScreen(id: number): void {
    const state = this.screenStates.get(id)
    if (!state) return
    state.needsRecomposite = true
  }

  /** Flush deferred re-compositing for a screen via compositeAndDiff. */
  private flushRecomposite(id: number): void {
    const state = this.screenStates.get(id)
    if (!state?.needsRecomposite) return
    state.needsRecomposite = false
    this.compositeAndDiff(state, id === this.activeScreenId)
  }

  /** Composite layers into double buffer, diff-render changed cells, and update cached ANSI string. */
  private compositeAndDiff(state: ScreenState, canDiffRender: boolean): void {
    this.groupGridCache.clear()
    const oldGrid = state.lastGrid
    const buffer = this.useBufferA ? this.compositeBufferA : this.compositeBufferB
    this.useBufferA = !this.useBufferA
    compositeGridInto(buffer, state.layers, this.groupGridCache)
    state.lastGrid = buffer
    if (canDiffRender && oldGrid) {
      const diff = renderDiffAnsiString(oldGrid, buffer)
      if (diff) {
        this.handle?.write(diff)
        state.dirty = false
      }
    } else if (!oldGrid) {
      state.dirty = true
    }
    state.ansiString = renderGridToAnsiString(buffer)
  }

  // --- Internal ---

  /** Advance animation, flush deferred composites, handle swipe, and write dirty screen. */
  private updateActiveScreen(): void {
    if (this.activeScreenId === null) return
    const state = this.screenStates.get(this.activeScreenId)
    if (state?.playing) {
      this.advanceScreenAnimation(this.activeScreenId, this.currentTiming.totalTime * 1000)
    }
    if (state?.swipe) { const b = advanceTransition(state, this.currentTiming.deltaTime); if (b) this.handle?.write(b); return }
    this.flushRecomposite(this.activeScreenId)
    if (state?.dirty && state.ansiString) {
      this.handle?.write(state.ansiString)
      state.dirty = false
    }
  }

  /**
   * Frame callback from GameLoopController.
   */
  private onFrame(timing: TimingInfo): void {
    if (!this.running) return
    this.currentTiming = timing

    // Pre-tick: advance animation + flush deferred composites + write dirty screen
    this.updateActiveScreen()

    // Call the Lua onTick callback
    if (this.onTickCallback) {
      try {
        this.onTickCallback()
      } catch (error) {
        this.callbacks.onError?.(formatOnTickError(error))
        this.stop()
        return
      }
    }

    if (this.activeScreenId !== null && !this.screenStates.get(this.activeScreenId)?.swipe) {
      this.flushRecomposite(this.activeScreenId)
    }

    this.callbacks.onFlushOutput?.()
    this.inputCapture?.update()
  }

  /** Advance animation frames for a screen and composite+diff if frames changed. */
  private advanceScreenAnimation(id: number, nowMs: number): void {
    const state = this.screenStates.get(id)
    if (!state) return
    if (!state.schedule) state.schedule = initSchedule(state.layers, nowMs)
    const { changed } = computePlaybackTick(state.layers, state.schedule, nowMs)
    if (!changed) return
    this.compositeAndDiff(state, true)
  }
}
