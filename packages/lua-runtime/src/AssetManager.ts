/**
 * AssetManager - Manages asset registration, loading, and lifecycle.
 *
 * This class extracts asset management responsibilities from CanvasController,
 * handling:
 * - Asset path registration and directory scanning
 * - Image, font, and audio asset registration
 * - Asset loading from filesystem
 * - Asset dimension queries
 * - Font data transfer for popup windows
 *
 * Following the InputAPI pattern, this class provides a clean interface
 * for asset management with proper state tracking.
 */

import {
  ImageCache,
  FontCache,
  AssetLoader,
} from '@lua-learning/canvas-runtime'
import type {
  AssetManifest,
  DiscoveredFile,
  AssetHandle,
  AudioAssetHandle,
} from '@lua-learning/canvas-runtime'
import type { IFileSystem } from '@lua-learning/shell-core'
import { createImageFromData, createFontFromData } from './canvasErrorFormatter'
import type { IAudioEngine } from './audio/IAudioEngine'
import { WebAudioEngine } from './audio/WebAudioEngine'

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
 * Interface for AssetManager to enable testing flexibility.
 * Defines the subset of methods that external code interacts with.
 */
export interface IAssetManager {
  // State tracking
  markStarted(): void
  isStarted(): boolean

  // Path registration
  addAssetPath(path: string): void

  // Image/Font asset registration
  loadImageAsset(name: string, filename: string): AssetHandle
  loadFontAsset(name: string, filename: string): AssetHandle
  isFontLoaded(name: string): boolean
  getAssetManifest(): AssetManifest

  // Audio asset registration
  loadSoundAsset(name: string, filename: string): AudioAssetHandle
  loadMusicAsset(name: string, filename: string): AudioAssetHandle
  getAudioAssetManifest(): AudioAssetManifest
  getAudioEngine(): IAudioEngine | null

  // Asset loading
  loadAssets(fileSystem: IFileSystem, scriptDirectory: string): Promise<void>

  // Query methods
  getAssetWidth(nameOrHandle: string | AssetHandle): number
  getAssetHeight(nameOrHandle: string | AssetHandle): number
  hasAsset(name: string): boolean

  // Cache access
  getImageCache(): ImageCache | null
  getFontCache(): FontCache | null

  // Font transfer
  getFontDataForTransfer(): Array<{ name: string; dataUrl: string }>
}

/**
 * AssetManager class that manages all asset-related operations.
 * Extracted from CanvasController to improve separation of concerns.
 */
export class AssetManager implements IAssetManager {
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

  // Font data for transfer to popup windows (stores base64 data URLs)
  // Popup windows have their own isolated document.fonts collection,
  // so we need to transfer font data and reload fonts there
  private fontDataForTransfer: Map<string, { name: string; dataUrl: string }> = new Map()

  // Asset dimensions: width/height for each loaded asset
  private assetDimensions: Map<string, { width: number; height: number }> = new Map()

  // Audio engine for sound effects and music
  private audioEngine: IAudioEngine | null = null

  // Audio asset manifest: registered audio asset definitions
  private audioAssetManifest: AudioAssetManifest = new Map()

  // Track whether start() has been called (prevents adding assets after start)
  private started = false

  // --- State Tracking ---

  /**
   * Mark the asset manager as started.
   * After this, no new asset paths can be added.
   */
  markStarted(): void {
    this.started = true
  }

  /**
   * Check if the asset manager has been started.
   */
  isStarted(): boolean {
    return this.started
  }

  // --- Path Registration ---

  /**
   * Register a directory path to scan for assets.
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

  // --- Image/Font Asset Registration ---

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

  // --- Audio Asset Registration ---

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
   * Get the audio asset manifest (definitions registered via loadSoundAsset/loadMusicAsset).
   */
  getAudioAssetManifest(): AudioAssetManifest {
    return this.audioAssetManifest
  }

  // --- Asset Loading ---

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

    // Skip if no assets to load (images, fonts, or audio)
    if (this.assetManifest.size === 0 && this.discoveredFiles.size === 0 && this.audioAssetManifest.size === 0) {
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

          // Store font data as base64 for transfer to popup windows
          // Popup windows have isolated document.fonts and need fonts reloaded
          const dataUrl = this.arrayBufferToDataUrl(loadedAsset.data, loadedAsset.mimeType ?? 'font/ttf')
          this.fontDataForTransfer.set(definition.name, {
            name: definition.name,
            dataUrl,
          })
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

  // --- Query Methods ---

  /**
   * Get the width of a loaded asset.
   * @param nameOrHandle - Name of the asset (string) or AssetHandle
   * @returns Width in pixels
   * @throws Error if asset is unknown
   */
  getAssetWidth(nameOrHandle: string | AssetHandle): number {
    const name = this.extractAssetName(nameOrHandle)
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
    const name = this.extractAssetName(nameOrHandle)
    const dims = this.assetDimensions.get(name)
    if (!dims) {
      throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`)
    }
    return dims.height
  }

  /**
   * Check if an asset with the given name has been loaded.
   * @param name - Name of the asset
   * @returns true if the asset exists in the dimensions map
   */
  hasAsset(name: string): boolean {
    return this.assetDimensions.has(name)
  }

  // --- Cache Access ---

  /**
   * Get the image cache for the renderer.
   * @returns ImageCache instance or null if not loaded
   */
  getImageCache(): ImageCache | null {
    return this.imageCache
  }

  /**
   * Get the font cache for the renderer.
   * @returns FontCache instance or null if not loaded
   */
  getFontCache(): FontCache | null {
    return this.fontCache
  }

  // --- Font Transfer ---

  /**
   * Get font data for transfer to a popup window.
   * Popup windows have isolated document.fonts collections, so fonts loaded
   * in the main window need to be transferred and reloaded in the popup.
   * @returns Array of font data with name and base64 data URL
   */
  getFontDataForTransfer(): Array<{ name: string; dataUrl: string }> {
    return Array.from(this.fontDataForTransfer.values())
  }

  // --- Private Helpers ---

  /**
   * Extract the asset name from a string or AssetHandle.
   * @param nameOrHandle - String name or AssetHandle
   * @returns The asset name as a string
   */
  private extractAssetName(nameOrHandle: string | AssetHandle): string {
    if (typeof nameOrHandle === 'string') {
      return nameOrHandle
    }
    return nameOrHandle._name
  }

  /**
   * Convert an ArrayBuffer to a base64 data URL.
   * Used for transferring font data to popup windows via postMessage.
   * @param buffer - The binary data to convert
   * @param mimeType - The MIME type for the data URL
   * @returns Base64-encoded data URL
   */
  private arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    return `data:${mimeType};base64,${base64}`
  }
}
