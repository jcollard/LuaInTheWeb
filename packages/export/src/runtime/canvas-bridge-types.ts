/**
 * Types and interfaces for the canvas bridge abstraction.
 *
 * This provides a common interface that can be implemented differently
 * for various contexts (standalone export, HTML with data URLs, etc.)
 */

import type { LuaEngine } from 'wasmoon'

/**
 * Asset entry from the asset manifest.
 */
export interface AssetEntry {
  path: string
  /** Data URL for single-file exports (base64-encoded asset) */
  dataUrl?: string
}

/**
 * Loaded image information.
 */
export interface LoadedImage {
  img: HTMLImageElement
  width: number
  height: number
}

/**
 * Loaded font information.
 */
export interface LoadedFont {
  family: string
}

/** Stored ImageData for efficient pixel manipulation (Issue #603 pattern) */
export interface StoredImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Canvas runtime state shared between implementations.
 */
export interface CanvasRuntimeState {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  isRunning: boolean
  tickCallback: (() => void) | null
  lastFrameTime: number
  deltaTime: number
  totalTime: number
  keysDown: Set<string>
  keysPressed: Set<string>
  mouseX: number
  mouseY: number
  mouseButtonsDown: Set<number>
  mouseButtonsPressed: Set<number>
  currentFontSize: number
  currentFontFamily: string
  stopResolve: (() => void) | null
  /** Previous gamepad button states for "just pressed" detection */
  previousGamepadButtons: number[][]

  // Cached arrays to avoid allocation on every getKeysDown/getKeysPressed call.
  // These arrays are reused and should not be mutated by callers.
  /** Cached array of keys currently held down */
  keysDownArray: string[]
  /** Cached array of keys pressed this frame */
  keysPressedArray: string[]
  /** Dirty flag for keysDownArray */
  keysDownDirty: boolean
  /** Dirty flag for keysPressedArray */
  keysPressedDirty: boolean
  /** ImageData registry for pixel manipulation - stores Uint8ClampedArray directly */
  imageDataStore: Map<number, StoredImageData>
  /** Next ID for imageData registry */
  nextImageDataId: number
  /** Cached line dash array returned to callers (Issue #607) */
  lineDashCache: number[] | null
  /** Stored line dash segments - source of truth (Issue #607) */
  lineDashSegments: number[]
}

/**
 * Interface for asset handling strategies.
 * Different implementations can handle assets differently
 * (data URLs, file fetching, etc.)
 */
export interface AssetHandler {
  /** Load an image asset */
  loadImage(name: string, filename: string): Promise<LoadedImage | null>

  /** Load a font asset */
  loadFont(name: string, filename: string): Promise<LoadedFont | null>

  /** Get a loaded image by name */
  getImage(name: string): LoadedImage | null

  /** Get a loaded font by name */
  getFont(name: string): LoadedFont | null

  /** Translate font family name (for custom fonts) */
  translateFontFamily(family: string): string
}

/**
 * Interface for the canvas bridge.
 * Implementations set up the Lua bindings for canvas operations.
 */
export interface CanvasBridge {
  /**
   * Set up all canvas bridge functions on a wasmoon engine.
   * @param engine - The Lua engine instance
   * @param state - The canvas runtime state
   * @param assetHandler - Handler for asset loading
   */
  setupBridge(
    engine: LuaEngine,
    state: CanvasRuntimeState,
    assetHandler: AssetHandler
  ): void
}
