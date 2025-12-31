/**
 * Asset bridge functions for canvas exports.
 *
 * Sets up Lua bindings for asset loading and drawing operations
 * using the pluggable AssetHandler interface.
 */

import type { LuaEngine } from 'wasmoon'
import type { CanvasRuntimeState, AssetHandler } from './canvas-bridge-types.js'

/**
 * Set up asset-related bridge functions.
 */
export function setupAssetBridge(
  engine: LuaEngine,
  state: CanvasRuntimeState,
  assetHandler: AssetHandler
): void {
  const { ctx } = state

  // === ASSET PATH (no-op for standalone) ===
  engine.global.set('__canvas_assets_addPath', () => {
    // No-op - assets are pre-bundled
  })

  // === IMAGE LOADING ===
  engine.global.set(
    '__canvas_assets_loadImage',
    (name: string, filename: string) => {
      // Start loading asynchronously
      assetHandler.loadImage(name, filename).catch((err) => {
        console.error('[Asset Bridge] Failed to load image:', name, err)
      })
      // Return a handle for reference
      return { _type: 'image', _name: name, _file: filename }
    }
  )

  // === FONT LOADING ===
  engine.global.set(
    '__canvas_assets_loadFont',
    (name: string, filename: string) => {
      // Start loading asynchronously
      assetHandler.loadFont(name, filename).catch((err) => {
        console.error('[Asset Bridge] Failed to load font:', name, err)
      })
      // Return a handle for reference
      return { _type: 'font', _name: name, _file: filename }
    }
  )

  // === IMAGE DIMENSIONS ===
  engine.global.set('__canvas_assets_getWidth', (nameOrHandle: unknown) => {
    const name = extractName(nameOrHandle)
    const img = assetHandler.getImage(name)
    return img?.width ?? 0
  })

  engine.global.set('__canvas_assets_getHeight', (nameOrHandle: unknown) => {
    const name = extractName(nameOrHandle)
    const img = assetHandler.getImage(name)
    return img?.height ?? 0
  })

  // === IMAGE DRAWING ===
  engine.global.set(
    '__canvas_drawImage',
    (
      nameOrHandle: unknown,
      x: number,
      y: number,
      width?: number | null,
      height?: number | null,
      sx?: number | null,
      sy?: number | null,
      sw?: number | null,
      sh?: number | null
    ) => {
      const name = extractName(nameOrHandle)
      const loaded = assetHandler.getImage(name)
      if (!loaded) {
        return // Image not loaded yet
      }

      const img = loaded.img

      // 9-argument form: source cropping
      if (
        sx !== undefined &&
        sx !== null &&
        sy !== undefined &&
        sy !== null &&
        sw !== undefined &&
        sw !== null &&
        sh !== undefined &&
        sh !== null &&
        width !== undefined &&
        width !== null &&
        height !== undefined &&
        height !== null
      ) {
        ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height)
      } else if (
        width !== undefined &&
        width !== null &&
        height !== undefined &&
        height !== null
      ) {
        // 5-argument form: destination with scaling
        ctx.drawImage(img, x, y, width, height)
      } else {
        // 3-argument form: destination only
        ctx.drawImage(img, x, y)
      }
    }
  )
}

/**
 * Extract the name from either a string or a handle object.
 */
function extractName(nameOrHandle: unknown): string {
  if (typeof nameOrHandle === 'string') {
    return nameOrHandle
  }
  if (
    typeof nameOrHandle === 'object' &&
    nameOrHandle !== null &&
    '_name' in nameOrHandle
  ) {
    return (nameOrHandle as { _name: string })._name
  }
  return ''
}
