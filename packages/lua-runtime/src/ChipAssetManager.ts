/**
 * ChipAssetManager - Lightweight asset manager for chip music files.
 *
 * Manages chip music file registration and loading (.wcol, .wsng).
 * Reuses AssetLoader from canvas-runtime for directory scanning.
 */

import { AssetLoader } from '@lua-learning/canvas-runtime'
import type { DiscoveredFile } from '@lua-learning/canvas-runtime'
import type { IFileSystem } from '@lua-learning/shell-core'

/**
 * Definition of a chip music file asset.
 */
export interface ChipAssetDefinition {
  name: string
  filename: string
}

/**
 * Manages chip music file registration and loading for standalone chip mode.
 */
export class ChipAssetManager {
  private assetPaths: string[] = []
  private discoveredFiles: Map<string, DiscoveredFile> = new Map()
  private chipAssetManifest: Map<string, ChipAssetDefinition> = new Map()
  private fileContents: Map<string, string> = new Map()
  private started = false

  /**
   * Register a directory path to scan for chip music files.
   * Must be called before start().
   */
  addAssetPath(path: string): void {
    if (this.assetPaths.includes(path)) return
    if (this.started) {
      throw new Error('Cannot add asset paths after chip.start()')
    }
    this.assetPaths.push(path)
  }

  /**
   * Register a chip music file asset (.wcol or .wsng).
   * Must be called before start().
   */
  loadFileAsset(name: string, filename: string): void {
    const existing = this.chipAssetManifest.get(name)
    if (existing && existing.filename === filename) {
      return
    }
    if (this.started) {
      throw new Error('Cannot register chip assets after chip.start()')
    }
    this.chipAssetManifest.set(name, { name, filename })
  }

  /**
   * Initialize and load all registered chip music files.
   */
  async start(fileSystem: IFileSystem, scriptDirectory: string): Promise<void> {
    if (this.started) return

    this.started = true

    if (this.chipAssetManifest.size === 0) return

    // Scan directories
    const loader = new AssetLoader(fileSystem, scriptDirectory)
    for (const path of this.assetPaths) {
      const files = loader.scanDirectory(path)
      for (const file of files) {
        if (!this.discoveredFiles.has(file.relativePath)) {
          this.discoveredFiles.set(file.relativePath, file)
        }
      }
    }

    // Load each chip music file as text
    for (const chipDef of this.chipAssetManifest.values()) {
      const discovered = this.discoveredFiles.get(chipDef.filename)
      if (!discovered) {
        const scannedPaths = this.assetPaths.join(', ') || '(none)'
        throw new Error(
          `Chip music file '${chipDef.filename}' not found in asset paths. Scanned paths: ${scannedPaths}`
        )
      }

      // Read file content as text
      const content = fileSystem.readFile(discovered.fullPath)
      this.fileContents.set(chipDef.name, content)
    }
  }

  /**
   * Get the content of a loaded chip music file by name.
   * Returns null if not found.
   */
  getFileContent(name: string): string | null {
    return this.fileContents.get(name) ?? null
  }

  /**
   * Get the chip asset manifest.
   */
  getChipAssetManifest(): Map<string, ChipAssetDefinition> {
    return this.chipAssetManifest
  }

  /**
   * Check if the manager has been started.
   */
  isStarted(): boolean {
    return this.started
  }
}
