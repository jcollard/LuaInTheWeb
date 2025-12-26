/**
 * Shared canvas API setup for Lua processes.
 * Used by both LuaReplProcess and LuaScriptProcess to avoid code duplication.
 */

import type { LuaEngine } from 'wasmoon'
import type {
  GlobalCompositeOperation,
  CanvasTextAlign,
  CanvasTextBaseline,
} from '@lua-learning/canvas-runtime'
import type { CanvasController } from './CanvasController'
import { canvasLuaCode } from './canvasLuaWrapper'

// ============================================================================
// ImageData Store - Keeps pixel data on JS side for O(1) put_image_data
// ============================================================================

interface StoredImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Storage for ImageData arrays, keyed by numeric ID */
const imageDataStore = new Map<number, StoredImageData>()

/** Next available ID for ImageData storage */
let nextImageDataId = 1

/**
 * Store an ImageData array and return its ID.
 * The data is stored on the JS side to avoid copying on every put_image_data call.
 */
function storeImageData(data: Uint8ClampedArray, width: number, height: number): number {
  const id = nextImageDataId++
  imageDataStore.set(id, { data, width, height })
  return id
}

/**
 * Clear all stored ImageData. Called when canvas is stopped.
 */
export function clearImageDataStore(): void {
  imageDataStore.clear()
}

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
    fontFamily?: string | null
  ) => {
    const options = (fontSize !== undefined && fontSize !== null) || (fontFamily !== undefined && fontFamily !== null)
      ? { fontSize: fontSize ?? undefined, fontFamily: fontFamily ?? undefined }
      : undefined
    getController()?.drawText(x, y, text, options)
  })

  engine.global.set('__canvas_strokeText', (
    x: number,
    y: number,
    text: string,
    fontSize?: number | null,
    fontFamily?: string | null
  ) => {
    const options = (fontSize !== undefined && fontSize !== null) || (fontFamily !== undefined && fontFamily !== null)
      ? { fontSize: fontSize ?? undefined, fontFamily: fontFamily ?? undefined }
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

  engine.global.set('__canvas_drawImage', (
    name: string,
    x: number,
    y: number,
    width?: number | null,
    height?: number | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null
  ) => {
    getController()?.drawImage(
      name,
      x,
      y,
      width ?? undefined,
      height ?? undefined,
      sx ?? undefined,
      sy ?? undefined,
      sw ?? undefined,
      sh ?? undefined
    )
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

  engine.global.set('__canvas_quadraticCurveTo', (cpx: number, cpy: number, x: number, y: number) => {
    getController()?.quadraticCurveTo(cpx, cpy, x, y)
  })

  engine.global.set('__canvas_bezierCurveTo', (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => {
    getController()?.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
  })

  engine.global.set('__canvas_ellipse', (x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => {
    getController()?.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
  })

  engine.global.set('__canvas_roundRect', (x: number, y: number, width: number, height: number, radii: number | number[]) => {
    getController()?.roundRect(x, y, width, height, radii)
  })

  engine.global.set('__canvas_rectPath', (x: number, y: number, width: number, height: number) => {
    getController()?.rectPath(x, y, width, height)
  })

  engine.global.set('__canvas_clip', (fillRule?: string) => {
    getController()?.clip(fillRule as 'nonzero' | 'evenodd' | undefined)
  })

  // --- Hit Testing API functions ---
  engine.global.set('__canvas_isPointInPath', (x: number, y: number, fillRule?: string) => {
    return getController()?.isPointInPath(x, y, (fillRule as 'nonzero' | 'evenodd') ?? 'nonzero') ?? false
  })

  engine.global.set('__canvas_isPointInStroke', (x: number, y: number) => {
    return getController()?.isPointInStroke(x, y) ?? false
  })

  // --- Line Style API functions ---
  engine.global.set('__canvas_setLineCap', (cap: string) => {
    getController()?.setLineCap(cap as 'butt' | 'round' | 'square')
  })

  engine.global.set('__canvas_setLineJoin', (join: string) => {
    getController()?.setLineJoin(join as 'miter' | 'round' | 'bevel')
  })

  engine.global.set('__canvas_setMiterLimit', (limit: number) => {
    getController()?.setMiterLimit(limit)
  })

  engine.global.set('__canvas_setLineDash', (segments: unknown) => {
    // Convert Lua table proxy to native JavaScript array
    const jsArray: number[] = []
    if (segments && typeof segments === 'object') {
      const len = (segments as { length?: number }).length ?? 0
      for (let i = 1; i <= len; i++) {
        const val = (segments as Record<number, number>)[i]
        if (typeof val === 'number') {
          jsArray.push(val)
        }
      }
    }
    getController()?.setLineDash(jsArray)
  })

  engine.global.set('__canvas_getLineDash', () => {
    return getController()?.getLineDash() ?? []
  })

  engine.global.set('__canvas_setLineDashOffset', (offset: number) => {
    getController()?.setLineDashOffset(offset)
  })

  // --- Fill/Stroke Style API functions ---
  /**
   * Convert a Lua style value (string or gradient table) to a JavaScript FillStyle.
   * Gradient tables have: type, x0, y0, x1, y1, r0?, r1?, startAngle?, x?, y?, stops[]
   */
  const convertLuaStyleToJS = (style: unknown): import('@lua-learning/canvas-runtime').FillStyle => {
    // String colors pass through directly
    if (typeof style === 'string') {
      return style
    }

    // Gradient/Pattern table: convert from Lua proxy to JS object
    if (style && typeof style === 'object') {
      const luaTable = style as Record<string, unknown>
      const type = luaTable.type as 'linear' | 'radial' | 'conic' | 'pattern'

      // Handle pattern type (no stops array)
      if (type === 'pattern') {
        return {
          type: 'pattern',
          imageName: String(luaTable.imageName),
          repetition: String(luaTable.repetition) as import('@lua-learning/canvas-runtime').PatternRepetition,
        }
      }

      // Convert stops array from Lua table proxy (for gradients)
      const luaStops = luaTable.stops as Record<number, { offset: number; color: string }> | undefined
      const stops: Array<{ offset: number; color: string }> = []
      if (luaStops) {
        // Lua arrays are 1-indexed; iterate using length
        const len = (luaStops as { length?: number }).length ?? 0
        for (let i = 1; i <= len; i++) {
          const stop = luaStops[i]
          if (stop) {
            stops.push({ offset: stop.offset, color: stop.color })
          }
        }
      }

      if (type === 'linear') {
        return {
          type: 'linear',
          x0: luaTable.x0 as number,
          y0: luaTable.y0 as number,
          x1: luaTable.x1 as number,
          y1: luaTable.y1 as number,
          stops,
        }
      } else if (type === 'radial') {
        return {
          type: 'radial',
          x0: luaTable.x0 as number,
          y0: luaTable.y0 as number,
          r0: luaTable.r0 as number,
          x1: luaTable.x1 as number,
          y1: luaTable.y1 as number,
          r1: luaTable.r1 as number,
          stops,
        }
      } else if (type === 'conic') {
        return {
          type: 'conic',
          startAngle: luaTable.startAngle as number,
          x: luaTable.x as number,
          y: luaTable.y as number,
          stops,
        }
      }
    }

    // Fallback: treat as string
    return String(style)
  }

  engine.global.set('__canvas_setFillStyle', (style: unknown) => {
    const jsStyle = convertLuaStyleToJS(style)
    getController()?.setFillStyle(jsStyle)
  })

  engine.global.set('__canvas_setStrokeStyle', (style: unknown) => {
    const jsStyle = convertLuaStyleToJS(style)
    getController()?.setStrokeStyle(jsStyle)
  })

  // --- Shadow API functions ---
  engine.global.set('__canvas_setShadowColor', (color: string) => {
    getController()?.setShadowColor(color)
  })

  engine.global.set('__canvas_setShadowBlur', (blur: number) => {
    getController()?.setShadowBlur(blur)
  })

  engine.global.set('__canvas_setShadowOffsetX', (offset: number) => {
    getController()?.setShadowOffsetX(offset)
  })

  engine.global.set('__canvas_setShadowOffsetY', (offset: number) => {
    getController()?.setShadowOffsetY(offset)
  })

  engine.global.set(
    '__canvas_setShadow',
    (color: string, blur: number, offsetX: number, offsetY: number) => {
      getController()?.setShadow(color, blur, offsetX, offsetY)
    }
  )

  engine.global.set('__canvas_clearShadow', () => {
    getController()?.clearShadow()
  })

  // Compositing
  engine.global.set('__canvas_setGlobalAlpha', (alpha: number) => {
    getController()?.setGlobalAlpha(alpha)
  })

  engine.global.set('__canvas_setCompositeOperation', (operation: string) => {
    getController()?.setCompositeOperation(operation as GlobalCompositeOperation)
  })

  // Text Alignment
  engine.global.set('__canvas_setTextAlign', (align: string) => {
    getController()?.setTextAlign(align as CanvasTextAlign)
  })

  engine.global.set('__canvas_setTextBaseline', (baseline: string) => {
    getController()?.setTextBaseline(baseline as CanvasTextBaseline)
  })

  // --- Pixel Manipulation API functions ---
  // These use the JS-side imageDataStore for O(1) put_image_data performance

  // create_image_data: Creates empty pixel buffer, returns {id, width, height}
  engine.global.set('__canvas_createImageData', (width: number, height: number) => {
    const data = new Uint8ClampedArray(width * height * 4)
    const id = storeImageData(data, width, height)
    return { id, width, height }
  })

  // get_image_data: Reads pixels from canvas, stores in JS, returns {id, width, height}
  engine.global.set(
    '__canvas_getImageData',
    (x: number, y: number, width: number, height: number) => {
      const arr = getController()?.getImageData(x, y, width, height)
      if (!arr) return null
      const data = new Uint8ClampedArray(arr)
      const id = storeImageData(data, width, height)
      return { id, width, height }
    }
  )

  // put_image_data: Uses stored array by ID - O(1) no copy needed!
  engine.global.set('__canvas_putImageData', (id: number, dx: number, dy: number) => {
    const stored = imageDataStore.get(id)
    if (!stored) return
    getController()?.putImageData(Array.from(stored.data), stored.width, stored.height, dx, dy)
  })

  // set_pixel: Modifies stored array directly by ID
  engine.global.set(
    '__canvas_imageDataSetPixel',
    (id: number, x: number, y: number, r: number, g: number, b: number, a: number) => {
      const stored = imageDataStore.get(id)
      if (!stored || x < 0 || x >= stored.width || y < 0 || y >= stored.height) return
      const idx = (y * stored.width + x) * 4
      stored.data[idx] = r
      stored.data[idx + 1] = g
      stored.data[idx + 2] = b
      stored.data[idx + 3] = a
    }
  )

  // get_pixel: Reads from stored array by ID
  engine.global.set('__canvas_imageDataGetPixel', (id: number, x: number, y: number) => {
    const stored = imageDataStore.get(id)
    if (!stored || x < 0 || x >= stored.width || y < 0 || y >= stored.height) {
      return [0, 0, 0, 0]
    }
    const idx = (y * stored.width + x) * 4
    return [stored.data[idx], stored.data[idx + 1], stored.data[idx + 2], stored.data[idx + 3]]
  })

  // dispose: Removes ImageData from store to free memory
  engine.global.set('__canvas_imageDataDispose', (id: number) => {
    imageDataStore.delete(id)
  })

  // clone: Creates a deep copy of an existing ImageData
  engine.global.set('__canvas_cloneImageData', (id: number) => {
    const stored = imageDataStore.get(id)
    if (!stored) return null
    // Create a new Uint8ClampedArray with a copy of the data
    const clonedData = new Uint8ClampedArray(stored.data)
    const newId = storeImageData(clonedData, stored.width, stored.height)
    return { id: newId, width: stored.width, height: stored.height }
  })

  // --- Set up Lua-side canvas table ---
  // Canvas is NOT a global - it must be accessed via require('canvas')
  engine.doStringSync(canvasLuaCode)
}
