/**
 * Chip asset API setup for standalone chip music mode.
 * Registers JavaScript functions that bridge chip asset management to Lua.
 */

import type { LuaEngine } from 'wasmoon'
import type { IFileSystem } from '@lua-learning/shell-core'
import type { ChipAssetManager } from './ChipAssetManager.js'

/**
 * Options for configuring the chip asset API.
 */
export interface ChipAssetAPIOptions {
  /** Filesystem for loading chip music files */
  fileSystem: IFileSystem
  /** Script directory for resolving relative paths */
  scriptDirectory: string
}

/**
 * Set up chip asset API functions in the Lua engine.
 * Registers bridge functions for add_path, load_file, start, and getFileContent.
 *
 * @param engine - The Lua engine to set up
 * @param getChipAssetManager - Function to get the ChipAssetManager
 * @param options - Filesystem and path configuration
 */
export function setupChipAssetAPI(
  engine: LuaEngine,
  getChipAssetManager: () => ChipAssetManager | null,
  options: ChipAssetAPIOptions
): void {
  engine.global.set('__chip_assets_addPath', (path: string) => {
    const manager = getChipAssetManager()
    if (!manager) {
      throw new Error('Chip asset manager not available')
    }
    manager.addAssetPath(path)
  })

  engine.global.set('__chip_assets_loadFile', (name: string, filename: string) => {
    const manager = getChipAssetManager()
    if (!manager) {
      throw new Error('Chip asset manager not available')
    }
    manager.loadFileAsset(name, filename)
  })

  engine.global.set('__chip_assets_start', async () => {
    const manager = getChipAssetManager()
    if (!manager) {
      throw new Error('Chip asset manager not available')
    }
    await manager.start(options.fileSystem, options.scriptDirectory)
  })

  engine.global.set('__chip_assets_getFileContent', (name: string) => {
    const manager = getChipAssetManager()
    if (!manager) {
      throw new Error('Chip asset manager not available')
    }
    // Return undefined (not null) when asset not found — wasmoon treats null
    // as a value and checks null.then for thenability, which throws TypeError.
    const content = manager.getFileContent(name)
    if (content === null) return
    return content
  })
}
