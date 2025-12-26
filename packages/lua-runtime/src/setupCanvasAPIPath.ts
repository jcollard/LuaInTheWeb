/**
 * Path API bindings for canvas.
 * Extracted from setupCanvasAPI.ts to manage file size.
 */

import type { LuaEngine } from 'wasmoon'
import type { CanvasController } from './CanvasController'

/**
 * Set up path API bindings in the Lua engine.
 */
export function setupPathBindings(
  engine: LuaEngine,
  getController: () => CanvasController | null
): void {
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

  engine.global.set(
    '__canvas_arc',
    (
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean
    ) => {
      getController()?.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    }
  )

  engine.global.set(
    '__canvas_arcTo',
    (x1: number, y1: number, x2: number, y2: number, radius: number) => {
      getController()?.arcTo(x1, y1, x2, y2, radius)
    }
  )

  engine.global.set(
    '__canvas_quadraticCurveTo',
    (cpx: number, cpy: number, x: number, y: number) => {
      getController()?.quadraticCurveTo(cpx, cpy, x, y)
    }
  )

  engine.global.set(
    '__canvas_bezierCurveTo',
    (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => {
      getController()?.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
    }
  )

  engine.global.set(
    '__canvas_ellipse',
    (
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      rotation: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean
    ) => {
      getController()?.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
    }
  )

  engine.global.set(
    '__canvas_roundRect',
    (x: number, y: number, width: number, height: number, radii: number | number[]) => {
      getController()?.roundRect(x, y, width, height, radii)
    }
  )

  engine.global.set('__canvas_rectPath', (x: number, y: number, width: number, height: number) => {
    getController()?.rectPath(x, y, width, height)
  })

  engine.global.set('__canvas_clip', (fillRule?: string) => {
    getController()?.clip(fillRule as 'nonzero' | 'evenodd' | undefined)
  })

  // --- Hit Testing API functions ---
  engine.global.set('__canvas_isPointInPath', (x: number, y: number, fillRule?: string) => {
    return (
      getController()?.isPointInPath(x, y, (fillRule as 'nonzero' | 'evenodd') ?? 'nonzero') ?? false
    )
  })

  engine.global.set('__canvas_isPointInStroke', (x: number, y: number) => {
    return getController()?.isPointInStroke(x, y) ?? false
  })
}
