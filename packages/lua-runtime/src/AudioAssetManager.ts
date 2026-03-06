/**
 * AudioAssetManager - Lightweight asset manager for standalone audio.
 *
 * Manages audio asset registration and loading without canvas dependencies.
 * Reuses AssetLoader from canvas-runtime for directory scanning and file loading.
 */

import { AssetLoader } from '@lua-learning/canvas-runtime'
import type { AudioAssetHandle, DiscoveredFile } from '@lua-learning/canvas-runtime'
import type { IFileSystem } from '@lua-learning/shell-core'
import type { IAudioEngine } from './audio/IAudioEngine.js'
import { WebAudioEngine } from './audio/WebAudioEngine.js'
import type { AudioAssetManifest } from './AssetManager.js'

/**
 * Manages audio asset registration and loading for standalone audio mode.
 */
export class AudioAssetManager {
  private assetPaths: string[] = []
  private discoveredFiles: Map<string, DiscoveredFile> = new Map()
  private audioAssetManifest: AudioAssetManifest = new Map()
  private audioEngine: IAudioEngine | null = null
  private started = false

  /**
   * Register a directory path to scan for audio files.
   * Must be called before start().
   */
  addAssetPath(path: string): void {
    if (this.assetPaths.includes(path)) return
    if (this.started) {
      throw new Error('Cannot add asset paths after audio.start()')
    }
    this.assetPaths.push(path)
  }

  /**
   * Register a sound effect asset.
   * Must be called before start().
   */
  loadSoundAsset(name: string, filename: string): AudioAssetHandle {
    const existing = this.audioAssetManifest.get(name)
    if (existing && existing.filename === filename) {
      return { _type: 'sound', _name: name, _file: filename }
    }
    if (this.started) {
      throw new Error('Cannot register audio assets after audio.start()')
    }
    this.audioAssetManifest.set(name, { name, filename, type: 'sound' })
    return { _type: 'sound', _name: name, _file: filename }
  }

  /**
   * Register a music asset.
   * Must be called before start().
   */
  loadMusicAsset(name: string, filename: string): AudioAssetHandle {
    const existing = this.audioAssetManifest.get(name)
    if (existing && existing.filename === filename) {
      return { _type: 'music', _name: name, _file: filename }
    }
    if (this.started) {
      throw new Error('Cannot register audio assets after audio.start()')
    }
    this.audioAssetManifest.set(name, { name, filename, type: 'music' })
    return { _type: 'music', _name: name, _file: filename }
  }

  /**
   * Initialize the audio engine and load all registered assets.
   */
  async start(fileSystem: IFileSystem, scriptDirectory: string): Promise<void> {
    if (this.started) return

    this.started = true

    if (this.audioAssetManifest.size === 0) return

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

    // Initialize audio engine
    this.audioEngine = new WebAudioEngine()
    await this.audioEngine.initialize()

    // Load each audio asset
    for (const audioDef of this.audioAssetManifest.values()) {
      const discovered = this.discoveredFiles.get(audioDef.filename)
      if (!discovered) {
        const scannedPaths = this.assetPaths.join(', ') || '(none)'
        throw new Error(
          `Audio file '${audioDef.filename}' not found in asset paths. Scanned paths: ${scannedPaths}`
        )
      }

      const loadedAsset = await loader.loadAsset({
        name: audioDef.name,
        path: discovered.fullPath,
        type: 'audio',
      })

      await this.audioEngine.decodeAudio(audioDef.name, loadedAsset.data)
    }
  }

  /**
   * Get the audio engine (null if not started or no assets).
   */
  getAudioEngine(): IAudioEngine | null {
    return this.audioEngine
  }

  /**
   * Get the audio asset manifest.
   */
  getAudioAssetManifest(): AudioAssetManifest {
    return this.audioAssetManifest
  }

  /**
   * Check if the manager has been started.
   */
  isStarted(): boolean {
    return this.started
  }
}
