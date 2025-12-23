/**
 * Shared canvas API setup for Lua processes.
 * Used by both LuaReplProcess and LuaScriptProcess to avoid code duplication.
 */

import type { LuaEngine } from 'wasmoon'
import type { CanvasController } from './CanvasController'
import { canvasLuaCode } from './canvasLuaWrapper'

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

  // --- Drawing functions ---
  engine.global.set('__canvas_clear', () => {
    getController()?.clear()
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
    fontFamily?: string | null
  ) => {
    const options = (fontSize !== undefined && fontSize !== null) || (fontFamily !== undefined && fontFamily !== null)
      ? { fontSize: fontSize ?? undefined, fontFamily: fontFamily ?? undefined }
      : undefined
    getController()?.drawText(x, y, text, options)
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

  // --- Asset functions ---
  engine.global.set('__canvas_assets_image', (name: string, path: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    controller.registerAsset(name, path)
  })

  engine.global.set('__canvas_assets_font', (name: string, path: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('Canvas controller not available - is canvas support enabled?')
    }
    controller.registerFontAsset(name, path)
  })

  engine.global.set('__canvas_drawImage', (name: string, x: number, y: number, width?: number | null, height?: number | null) => {
    getController()?.drawImage(name, x, y, width ?? undefined, height ?? undefined)
  })

  engine.global.set('__canvas_assets_getWidth', (name: string) => {
    return getController()?.getAssetWidth(name) ?? 0
  })

  engine.global.set('__canvas_assets_getHeight', (name: string) => {
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

  engine.global.set('__canvas_transform', (a: number, b: number, c: number, d: number, e: number, f: number) => {
    getController()?.transform(a, b, c, d, e, f)
  })

  engine.global.set('__canvas_setTransform', (a: number, b: number, c: number, d: number, e: number, f: number) => {
    getController()?.setTransform(a, b, c, d, e, f)
  })

  engine.global.set('__canvas_resetTransform', () => {
    getController()?.resetTransform()
  })

  // --- Path API functions ---
  engine.global.set('__canvas_beginPath', () => {
    getController()?.beginPath()
  })

  engine.global.set('__canvas_closePath', () => {
    getController()?.closePath()
  })

  engine.global.set('__canvas_moveTo', (x: number, y: number) => {
    getController()?.moveTo(x, y)
  })

  engine.global.set('__canvas_lineTo', (x: number, y: number) => {
    getController()?.lineTo(x, y)
  })

  engine.global.set('__canvas_fill', () => {
    getController()?.fill()
  })

  engine.global.set('__canvas_stroke', () => {
    getController()?.stroke()
  })

  engine.global.set('__canvas_arc', (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => {
    getController()?.arc(x, y, radius, startAngle, endAngle, counterclockwise)
  })

  engine.global.set('__canvas_arcTo', (x1: number, y1: number, x2: number, y2: number, radius: number) => {
    getController()?.arcTo(x1, y1, x2, y2, radius)
  })

  // --- Set up Lua-side canvas table ---
  // Canvas is NOT a global - it must be accessed via require('canvas')
  engine.doStringSync(canvasLuaCode)
}
