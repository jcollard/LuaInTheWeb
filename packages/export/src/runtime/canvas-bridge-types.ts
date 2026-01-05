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
