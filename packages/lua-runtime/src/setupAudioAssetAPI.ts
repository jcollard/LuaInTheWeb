/**
 * Audio asset API setup for standalone audio mode.
 * Registers JavaScript functions that bridge audio asset management to Lua.
 */

import type { LuaEngine } from 'wasmoon'
import type { IFileSystem } from '@lua-learning/shell-core'
import type { AudioAssetManager } from './AudioAssetManager.js'

/**
 * Options for configuring the audio asset API.
 */
export interface AudioAssetAPIOptions {
  /** Filesystem for loading audio files */
  fileSystem: IFileSystem
  /** Script directory for resolving relative paths */
  scriptDirectory: string
}

/**
 * Set up audio asset API functions in the Lua engine.
 * Registers bridge functions for add_path, load_sound, load_music, and start.
 *
 * @param engine - The Lua engine to set up
 * @param getAudioAssetManager - Function to get the AudioAssetManager
 * @param options - Filesystem and path configuration
 */
export function setupAudioAssetAPI(
  engine: LuaEngine,
  getAudioAssetManager: () => AudioAssetManager | null,
  options: AudioAssetAPIOptions
): void {
  engine.global.set('__audio_assets_addPath', (path: string) => {
    const manager = getAudioAssetManager()
    if (!manager) {
      throw new Error('Audio asset manager not available')
    }
    manager.addAssetPath(path)
  })

  engine.global.set('__audio_assets_loadSound', (name: string, filename: string) => {
    const manager = getAudioAssetManager()
    if (!manager) {
      throw new Error('Audio asset manager not available')
    }
    return manager.loadSoundAsset(name, filename)
  })

  engine.global.set('__audio_assets_loadMusic', (name: string, filename: string) => {
    const manager = getAudioAssetManager()
    if (!manager) {
      throw new Error('Audio asset manager not available')
    }
    return manager.loadMusicAsset(name, filename)
  })

  engine.global.set('__audio_assets_start', async () => {
    const manager = getAudioAssetManager()
    if (!manager) {
      throw new Error('Audio asset manager not available')
    }
    await manager.start(options.fileSystem, options.scriptDirectory)
  })
}
