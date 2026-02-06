/**
 * Shared canvas API setup for Lua processes.
 * Used by both LuaReplProcess and LuaScriptProcess to avoid code duplication.
 */

import type { LuaEngine } from 'wasmoon'
import type { CanvasController } from './CanvasController'
import { canvasLuaCode } from './canvasLuaWrapper'
import { setupPathBindings } from './setupCanvasAPIPath'
import { setupStyleBindings } from './setupCanvasAPIStyles'
import { setupPixelBindings, clearImageDataStore } from './setupCanvasAPIPixels'

// Re-export for backward compatibility
export { clearImageDataStore }

/**
 * Set up canvas API functions in the Lua engine.
 * This registers all the JS functions and Lua wrapper code needed for
 * canvas.start(), canvas.stop(), and drawing/input functions.
 *
 * @param engine - The Lua engine to set up
 * @param getController - Function to get the canvas controller (allows lazy access)
 */
export function setupCanvasAPI(
  engine: LuaEngine,
  getController: () => CanvasController | null
): void {
  // --- File reading for hot reload ---
  // Synchronously reads a file's content (used by canvas.reload() to detect changes)
  engine.global.set('__canvas_read_file', (filepath: string) => {
    const controller = getController()
    const fileSystem = controller?.getFileSystem()
    if (!fileSystem) {
      return null
    }
    try {
      if (!fileSystem.exists(filepath)) {
        return null
      }
      return fileSystem.readFile(filepath)
    } catch {
      return null
    }
  })

  // --- Canvas lifecycle functions ---
  engine.global.set('__canvas_is_active', () => {
    return getController()?.isActive() ?? false
  })

  engine.global.set('__canvas_start', () => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas not available')
    }
    return controller.start()
  })

  engine.global.set('__canvas_stop', () => {
    const controller = getController()
    if (controller?.isActive()) {
      controller.stop()
    }
  })

  // Set the raw callback (called from Lua wrapper that adds error handling)
  engine.global.set('__canvas_setOnDrawCallback', (callback: () => void) => {
    getController()?.setOnDrawCallback(callback)
  })

  // --- Start screen functions (for browser audio autoplay policy) ---
  engine.global.set('__canvas_setStartScreen', (callback: (() => void) | null) => {
    getController()?.setStartScreenCallback(callback)
  })

  engine.global.set('__canvas_isWaitingForInteraction', () => {
    return getController()?.isWaitingForInteraction() ?? false
  })

  // --- Drawing functions ---
  engine.global.set('__canvas_clear', () => {
    getController()?.clear()
  })

  engine.global.set('__canvas_clearRect', (x: number, y: number, width: number, height: number) => {
    getController()?.clearRect(x, y, width, height)
  })

  engine.global.set('__canvas_setColor', (r: number, g: number, b: number, a?: number | null) => {
    getController()?.setColor(r, g, b, a ?? undefined)
  })

  engine.global.set('__canvas_setLineWidth', (width: number) => {
    getController()?.setLineWidth(width)
  })

  engine.global.set('__canvas_setFontSize', (size: number) => {
    getController()?.setFontSize(size)
  })

  engine.global.set('__canvas_setFontFamily', (family: string) => {
    getController()?.setFontFamily(family)
  })

  engine.global.set('__canvas_getTextWidth', (text: string) => {
    return getController()?.getTextWidth(text) ?? 0
  })

  engine.global.set('__canvas_getTextMetrics', (text: string) => {
    const metrics = getController()?.getTextMetrics(text)
    if (!metrics) {
      return {
        width: 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 0,
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 0,
        fontBoundingBoxAscent: 0,
        fontBoundingBoxDescent: 0,
      }
    }
    return metrics
  })

  engine.global.set('__canvas_setSize', (width: number, height: number) => {
    getController()?.setSize(width, height)
  })

  engine.global.set('__canvas_rect', (x: number, y: number, width: number, height: number) => {
    getController()?.drawRect(x, y, width, height)
  })

  engine.global.set('__canvas_fillRect', (x: number, y: number, width: number, height: number) => {
    getController()?.fillRect(x, y, width, height)
  })

  engine.global.set('__canvas_circle', (x: number, y: number, radius: number) => {
    getController()?.drawCircle(x, y, radius)
  })

  engine.global.set('__canvas_fillCircle', (x: number, y: number, radius: number) => {
    getController()?.fillCircle(x, y, radius)
  })

  engine.global.set('__canvas_line', (x1: number, y1: number, x2: number, y2: number) => {
    getController()?.drawLine(x1, y1, x2, y2)
  })

  engine.global.set('__canvas_text', (
    x: number,
    y: number,
    text: string,
    fontSize?: number | null,
    fontFamily?: string | null,
    maxWidth?: number | null
  ) => {
    const hasOptions = (fontSize !== undefined && fontSize !== null) ||
                       (fontFamily !== undefined && fontFamily !== null) ||
                       (maxWidth !== undefined && maxWidth !== null)
    const options = hasOptions
      ? {
          fontSize: fontSize ?? undefined,
          fontFamily: fontFamily ?? undefined,
          maxWidth: maxWidth ?? undefined
        }
      : undefined
    getController()?.drawText(x, y, text, options)
  })

  engine.global.set('__canvas_strokeText', (
    x: number,
    y: number,
    text: string,
    fontSize?: number | null,
    fontFamily?: string | null,
    maxWidth?: number | null
  ) => {
    const hasOptions = (fontSize !== undefined && fontSize !== null) ||
                       (fontFamily !== undefined && fontFamily !== null) ||
                       (maxWidth !== undefined && maxWidth !== null)
    const options = hasOptions
      ? {
          fontSize: fontSize ?? undefined,
          fontFamily: fontFamily ?? undefined,
          maxWidth: maxWidth ?? undefined
        }
      : undefined
    getController()?.strokeText(x, y, text, options)
  })

  // --- Timing functions ---
  engine.global.set('__canvas_getDelta', () => {
    return getController()?.getDelta() ?? 0
  })

  engine.global.set('__canvas_getTime', () => {
    return getController()?.getTime() ?? 0
  })

  // --- Canvas dimensions ---
  engine.global.set('__canvas_getWidth', () => {
    return getController()?.getWidth() ?? 0
  })

  engine.global.set('__canvas_getHeight', () => {
    return getController()?.getHeight() ?? 0
  })

  // --- Input functions ---
  engine.global.set('__canvas_isKeyDown', (key: string) => {
    return getController()?.isKeyDown(key) ?? false
  })

  engine.global.set('__canvas_isKeyPressed', (key: string) => {
    return getController()?.isKeyPressed(key) ?? false
  })

  engine.global.set('__canvas_getKeysDown', () => {
    return getController()?.getKeysDown() ?? []
  })

  engine.global.set('__canvas_getKeysPressed', () => {
    return getController()?.getKeysPressed() ?? []
  })

  engine.global.set('__canvas_getMouseX', () => {
    return getController()?.getMouseX() ?? 0
  })

  engine.global.set('__canvas_getMouseY', () => {
    return getController()?.getMouseY() ?? 0
  })

  engine.global.set('__canvas_isMouseDown', (button: number) => {
    return getController()?.isMouseButtonDown(button) ?? false
  })

  engine.global.set('__canvas_isMousePressed', (button: number) => {
    return getController()?.isMouseButtonPressed(button) ?? false
  })

  // --- Gamepad functions ---
  // Note: Indices are 0-based here. Lua wrappers convert from 1-based.
  engine.global.set('__canvas_getGamepadCount', () => {
    return getController()?.getGamepadCount() ?? 0
  })

  engine.global.set('__canvas_isGamepadConnected', (index: number) => {
    return getController()?.isGamepadConnected(index) ?? false
  })

  engine.global.set('__canvas_getGamepadButton', (gamepadIndex: number, buttonIndex: number) => {
    return getController()?.getGamepadButton(gamepadIndex, buttonIndex) ?? 0
  })

  engine.global.set('__canvas_isGamepadButtonPressed', (gamepadIndex: number, buttonIndex: number) => {
    return getController()?.isGamepadButtonPressed(gamepadIndex, buttonIndex) ?? false
  })

  engine.global.set('__canvas_getGamepadAxis', (gamepadIndex: number, axisIndex: number) => {
    return getController()?.getGamepadAxis(gamepadIndex, axisIndex) ?? 0
  })

  // --- Asset functions ---
  engine.global.set('__canvas_assets_addPath', (path: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    controller.addAssetPath(path)
  })

  engine.global.set('__canvas_assets_loadImage', (name: string, filename: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    return controller.loadImageAsset(name, filename)
  })

  engine.global.set('__canvas_assets_loadFont', (name: string, filename: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    return controller.loadFontAsset(name, filename)
  })

  engine.global.set('__canvas_assets_loadSound', (name: string, filename: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    return controller.loadSoundAsset(name, filename)
  })

  engine.global.set('__canvas_assets_loadMusic', (name: string, filename: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    return controller.loadMusicAsset(name, filename)
  })

  // Helper to extract asset name from string or handle
  const extractAssetName = (nameOrHandle: unknown): string => {
    if (typeof nameOrHandle === 'string') {
      return nameOrHandle
    }
    // Handle AssetHandle objects from Lua (tables with _name property)
    if (typeof nameOrHandle === 'object' && nameOrHandle !== null && '_name' in nameOrHandle) {
      return (nameOrHandle as { _name: string })._name
    }
    throw new Error('Invalid asset reference: expected string name or asset handle')
  }

  engine.global.set('__canvas_drawImage', (
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
    const name = extractAssetName(nameOrHandle)
    getController()?.drawImage(
      name, x, y,
      width ?? undefined, height ?? undefined,
      sx ?? undefined, sy ?? undefined, sw ?? undefined, sh ?? undefined
    )
  })

  engine.global.set('__canvas_assets_getWidth', (nameOrHandle: unknown) => {
    const name = extractAssetName(nameOrHandle)
    return getController()?.getAssetWidth(name) ?? 0
  })

  engine.global.set('__canvas_assets_getHeight', (nameOrHandle: unknown) => {
    const name = extractAssetName(nameOrHandle)
    return getController()?.getAssetHeight(name) ?? 0
  })

  // --- Transformation functions ---
  engine.global.set('__canvas_translate', (dx: number, dy: number) => {
    getController()?.translate(dx, dy)
  })

  engine.global.set('__canvas_rotate', (angle: number) => {
    getController()?.rotate(angle)
  })

  engine.global.set('__canvas_scale', (sx: number, sy: number) => {
    getController()?.scale(sx, sy)
  })

  engine.global.set('__canvas_save', () => {
    getController()?.save()
  })

  engine.global.set('__canvas_restore', () => {
    getController()?.restore()
  })

  engine.global.set(
    '__canvas_transform',
    (a: number, b: number, c: number, d: number, e: number, f: number) => {
      getController()?.transform(a, b, c, d, e, f)
    }
  )

  engine.global.set(
    '__canvas_setTransform',
    (a: number, b: number, c: number, d: number, e: number, f: number) => {
      getController()?.setTransform(a, b, c, d, e, f)
    }
  )

  engine.global.set('__canvas_resetTransform', () => {
    getController()?.resetTransform()
  })

  // --- Set up extracted bindings ---
  setupPathBindings(engine, getController)
  setupStyleBindings(engine, getController)
  setupPixelBindings(engine, getController)

  // capture: Get canvas contents as data URL
  engine.global.set('__canvas_capture', (type?: string | null, quality?: number | null) => {
    return getController()?.capture(type ?? undefined, quality ?? undefined) ?? null
  })

  // --- Set up Lua-side canvas table ---
  // Canvas is NOT a global - it must be accessed via require('canvas')
  // Initialize __loaded_modules if not already set (for tests that don't use LuaEngineFactory)
  engine.doStringSync('if __loaded_modules == nil then __loaded_modules = {} end')
  engine.doStringSync(canvasLuaCode)

  // Set up reload callback - allows CanvasController.reload() to trigger canvas.reload() in Lua
  // Note: canvas is accessed via require('canvas'), not as a global
  const controller = getController()
  if (controller) {
    controller.setReloadCallback(() => {
      try {
        engine.doStringSync('require("canvas").reload()')
      } catch (error) {
        // Report reload errors through the controller's error callback
        if (error instanceof Error) {
          controller.reportError(`Hot reload error: ${error.message}`)
        }
      }
    })
  }
}
