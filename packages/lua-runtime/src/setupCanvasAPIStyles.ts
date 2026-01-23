/**
 * Style API bindings for canvas (line styles, fill/stroke, shadows, compositing).
 * Extracted from setupCanvasAPI.ts to manage file size.
 */

import type { LuaEngine } from 'wasmoon'
import type {
  GlobalCompositeOperation,
  CanvasTextAlign,
  CanvasTextBaseline,
  FillStyle,
  PatternRepetition,
} from '@lua-learning/canvas-runtime'
import type { CanvasController } from './CanvasController'

/**
 * Convert a Lua style value (string or gradient table) to a JavaScript FillStyle.
 * Gradient tables have: type, x0, y0, x1, y1, r0?, r1?, startAngle?, x?, y?, stops[]
 */
function convertLuaStyleToJS(style: unknown): FillStyle {
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
        repetition: String(luaTable.repetition) as PatternRepetition,
      }
    }

    // Convert stops array from Lua table proxy (for gradients)
    const luaStops = luaTable.stops as Record<number, { offset: number; color: string }> | undefined
    const stops: Array<{ offset: number; color: string }> = []
    if (luaStops) {
      // Lua table proxies from wasmoon don't have .length property.
      // Detect indexing style: JS arrays have element at [0], Lua tables at [1]
      const startIndex = luaStops[0] !== undefined ? 0 : 1
      let i = startIndex
      while (luaStops[i] !== undefined) {
        const stop = luaStops[i]
        stops.push({ offset: stop.offset, color: stop.color })
        i++
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

/**
 * Set up style-related API bindings in the Lua engine.
 */
export function setupStyleBindings(
  engine: LuaEngine,
  getController: () => CanvasController | null
): void {
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
      const luaSegments = segments as Record<number, number>
      // Lua table proxies from wasmoon don't have .length property.
      // Detect indexing style: JS arrays have element at [0], Lua tables at [1]
      const startIndex = luaSegments[0] !== undefined ? 0 : 1
      let i = startIndex
      while (luaSegments[i] !== undefined) {
        if (typeof luaSegments[i] === 'number') {
          jsArray.push(luaSegments[i])
        }
        i++
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

  // --- Compositing ---
  engine.global.set('__canvas_setGlobalAlpha', (alpha: number) => {
    getController()?.setGlobalAlpha(alpha)
  })

  engine.global.set('__canvas_setCompositeOperation', (operation: string) => {
    getController()?.setCompositeOperation(operation as GlobalCompositeOperation)
  })

  engine.global.set('__canvas_setImageSmoothing', (enabled: boolean) => {
    getController()?.setImageSmoothing(enabled)
  })

  // --- Text Alignment ---
  engine.global.set('__canvas_setTextAlign', (align: string) => {
    getController()?.setTextAlign(align as CanvasTextAlign)
  })

  engine.global.set('__canvas_setTextBaseline', (baseline: string) => {
    getController()?.setTextBaseline(baseline as CanvasTextBaseline)
  })

  // --- Text Direction (RTL/LTR support) ---
  engine.global.set('__canvas_setDirection', (direction: string) => {
    getController()?.setDirection(direction as 'ltr' | 'rtl' | 'inherit')
  })

  // --- CSS Filter ---
  engine.global.set('__canvas_setFilter', (filter: string) => {
    getController()?.setFilter(filter)
  })
}
