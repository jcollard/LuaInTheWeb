/**
 * Standalone canvas runtime for exported HTML.
 *
 * This module provides:
 * 1. Combined Lua code from canvasLuaCode modules
 * 2. Setup function to register JS bridge functions on a wasmoon engine
 * 3. Main-thread execution (no Web Workers)
 */

import {
  canvasLuaCoreCode,
  canvasLuaPathCode,
  canvasLuaStylingCode,
  canvasLuaTextCode,
  canvasLuaInputCode,
  canvasLuaAudioCode,
  WebAudioEngine,
} from '@lua-learning/lua-runtime'

import type { LuaEngine } from 'wasmoon'

/**
 * Combined Lua code for the canvas API.
 * This is the same code used in the website, just bundled together.
 */
export const canvasLuaCode =
  canvasLuaCoreCode +
  canvasLuaPathCode +
  canvasLuaStylingCode +
  canvasLuaTextCode +
  canvasLuaInputCode +
  canvasLuaAudioCode

/**
 * Canvas runtime state for standalone execution.
 */
export interface CanvasRuntimeState {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  isRunning: boolean
  tickCallback: (() => void) | null
  lastFrameTime: number
  deltaTime: number
  totalTime: number
  keysDown: Set<string>
  keysPressed: Set<string>
  mouseX: number
  mouseY: number
  mouseButtonsDown: Set<number>
  mouseButtonsPressed: Set<number>
  currentFontSize: number
  currentFontFamily: string
  stopResolve: (() => void) | null
  // Audio state
  audioEngine: WebAudioEngine
  audioAssets: Map<string, { name: string; filename: string; type: 'sound' | 'music' }>
}

/**
 * Create a new canvas runtime state.
 */
export function createCanvasRuntimeState(
  canvas: HTMLCanvasElement
): CanvasRuntimeState {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Could not get 2D rendering context')
  }

  return {
    canvas,
    ctx,
    isRunning: false,
    tickCallback: null,
    lastFrameTime: 0,
    deltaTime: 0,
    totalTime: 0,
    keysDown: new Set(),
    keysPressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseButtonsDown: new Set(),
    mouseButtonsPressed: new Set(),
    currentFontSize: 16,
    currentFontFamily: 'monospace',
    stopResolve: null,
    audioEngine: new WebAudioEngine(),
    audioAssets: new Map(),
  }
}

/**
 * Set up input event listeners for the canvas.
 */
export function setupInputListeners(state: CanvasRuntimeState): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!state.keysDown.has(e.code)) {
      state.keysPressed.add(e.code)
    }
    state.keysDown.add(e.code)
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    state.keysDown.delete(e.code)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const rect = state.canvas.getBoundingClientRect()
    state.mouseX = e.clientX - rect.left
    state.mouseY = e.clientY - rect.top
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!state.mouseButtonsDown.has(e.button)) {
      state.mouseButtonsPressed.add(e.button)
    }
    state.mouseButtonsDown.add(e.button)
  }

  const handleMouseUp = (e: MouseEvent) => {
    state.mouseButtonsDown.delete(e.button)
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  state.canvas.addEventListener('mousemove', handleMouseMove)
  state.canvas.addEventListener('mousedown', handleMouseDown)
  state.canvas.addEventListener('mouseup', handleMouseUp)

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    state.canvas.removeEventListener('mousemove', handleMouseMove)
    state.canvas.removeEventListener('mousedown', handleMouseDown)
    state.canvas.removeEventListener('mouseup', handleMouseUp)
  }
}

/**
 * Start the game loop.
 */
function startGameLoop(state: CanvasRuntimeState): void {
  state.lastFrameTime = performance.now()

  function gameLoop(timestamp: number): void {
    if (!state.isRunning) return

    // Calculate timing
    state.deltaTime = (timestamp - state.lastFrameTime) / 1000
    state.lastFrameTime = timestamp
    state.totalTime += state.deltaTime

    // Call tick callback
    if (state.tickCallback) {
      try {
        state.tickCallback()
      } catch (err) {
        console.error('Lua error in tick callback:', err)
        state.isRunning = false
        if (state.stopResolve) {
          state.stopResolve()
          state.stopResolve = null
        }
        return
      }
    }

    // Clear pressed states after processing
    state.keysPressed.clear()
    state.mouseButtonsPressed.clear()

    // Continue loop
    if (state.isRunning) {
      requestAnimationFrame(gameLoop)
    }
  }

  requestAnimationFrame(gameLoop)
}

/**
 * Helper to convert color components to CSS.
 */
function toHex(value: number): string {
  const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16)
  return hex.length === 1 ? '0' + hex : hex
}

function colorToCss(
  r: number,
  g: number,
  b: number,
  a?: number | null
): string {
  if (a !== undefined && a !== null && a !== 255) {
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Set up all canvas bridge functions on a wasmoon engine.
 */
export function setupCanvasBridge(
  engine: LuaEngine,
  state: CanvasRuntimeState
): void {
  const { ctx, canvas } = state

  // Lifecycle functions
  engine.global.set('__canvas_is_active', () => state.isRunning)

  engine.global.set('__canvas_start', async () => {
    // Initialize audio engine
    await state.audioEngine.initialize()

    // Return a Promise that resolves when canvas.stop() is called
    return new Promise<void>((resolve) => {
      state.isRunning = true
      state.stopResolve = resolve
      startGameLoop(state)
    })
  })

  engine.global.set('__canvas_stop', () => {
    state.isRunning = false
    if (state.stopResolve) {
      state.stopResolve()
      state.stopResolve = null
    }
  })

  // Tick callback
  engine.global.set(
    '__canvas_setOnDrawCallback',
    (callback: () => void) => {
      state.tickCallback = callback
    }
  )

  // Canvas configuration
  engine.global.set('__canvas_setSize', (width: number, height: number) => {
    canvas.width = width
    canvas.height = height
  })

  engine.global.set('__canvas_getWidth', () => canvas.width)
  engine.global.set('__canvas_getHeight', () => canvas.height)

  // Drawing state
  engine.global.set('__canvas_clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  })

  engine.global.set(
    '__canvas_clearRect',
    (x: number, y: number, width: number, height: number) => {
      ctx.clearRect(x, y, width, height)
    }
  )

  engine.global.set(
    '__canvas_setColor',
    (r: number, g: number, b: number, a?: number | null) => {
      const color = colorToCss(r, g, b, a)
      ctx.fillStyle = color
      ctx.strokeStyle = color
    }
  )

  engine.global.set('__canvas_setLineWidth', (width: number) => {
    ctx.lineWidth = width
  })

  // Font styling
  engine.global.set('__canvas_setFontSize', (size: number) => {
    state.currentFontSize = size
    ctx.font = `${state.currentFontSize}px ${state.currentFontFamily}`
  })

  engine.global.set('__canvas_setFontFamily', (family: string) => {
    state.currentFontFamily = family
    ctx.font = `${state.currentFontSize}px ${state.currentFontFamily}`
  })

  engine.global.set('__canvas_getTextWidth', (text: string) => {
    return ctx.measureText(text).width
  })

  // Shape drawing
  engine.global.set(
    '__canvas_rect',
    (x: number, y: number, width: number, height: number) => {
      ctx.strokeRect(x, y, width, height)
    }
  )

  engine.global.set(
    '__canvas_fillRect',
    (x: number, y: number, width: number, height: number) => {
      ctx.fillRect(x, y, width, height)
    }
  )

  engine.global.set(
    '__canvas_circle',
    (x: number, y: number, radius: number) => {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  )

  engine.global.set(
    '__canvas_fillCircle',
    (x: number, y: number, radius: number) => {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  )

  engine.global.set(
    '__canvas_line',
    (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  )

  engine.global.set(
    '__canvas_text',
    (
      x: number,
      y: number,
      text: string,
      fontSize?: number | null,
      fontFamily?: string | null,
      maxWidth?: number | null
    ) => {
      const savedFont = ctx.font
      if (fontSize || fontFamily) {
        const size = fontSize ?? state.currentFontSize
        const family = fontFamily ?? state.currentFontFamily
        ctx.font = `${size}px ${family}`
      }
      ctx.textBaseline = 'top'
      if (maxWidth) {
        ctx.fillText(text, x, y, maxWidth)
      } else {
        ctx.fillText(text, x, y)
      }
      ctx.font = savedFont
    }
  )

  engine.global.set(
    '__canvas_strokeText',
    (
      x: number,
      y: number,
      text: string,
      fontSize?: number | null,
      fontFamily?: string | null,
      maxWidth?: number | null
    ) => {
      const savedFont = ctx.font
      if (fontSize || fontFamily) {
        const size = fontSize ?? state.currentFontSize
        const family = fontFamily ?? state.currentFontFamily
        ctx.font = `${size}px ${family}`
      }
      if (maxWidth) {
        ctx.strokeText(text, x, y, maxWidth)
      } else {
        ctx.strokeText(text, x, y)
      }
      ctx.font = savedFont
    }
  )

  // Timing
  engine.global.set('__canvas_getDelta', () => state.deltaTime)
  engine.global.set('__canvas_getTime', () => state.totalTime)

  // Input
  engine.global.set('__canvas_isKeyDown', (key: string) =>
    state.keysDown.has(key)
  )
  engine.global.set('__canvas_isKeyPressed', (key: string) =>
    state.keysPressed.has(key)
  )
  engine.global.set('__canvas_getKeysDown', () => Array.from(state.keysDown))
  engine.global.set('__canvas_getKeysPressed', () =>
    Array.from(state.keysPressed)
  )
  engine.global.set('__canvas_getMouseX', () => state.mouseX)
  engine.global.set('__canvas_getMouseY', () => state.mouseY)
  engine.global.set('__canvas_isMouseDown', (button: number) =>
    state.mouseButtonsDown.has(button)
  )
  engine.global.set('__canvas_isMousePressed', (button: number) =>
    state.mouseButtonsPressed.has(button)
  )

  // Transformations
  engine.global.set('__canvas_translate', (dx: number, dy: number) => {
    ctx.translate(dx, dy)
  })

  engine.global.set('__canvas_rotate', (angle: number) => {
    ctx.rotate(angle)
  })

  engine.global.set('__canvas_scale', (sx: number, sy: number) => {
    ctx.scale(sx, sy)
  })

  engine.global.set('__canvas_save', () => {
    ctx.save()
  })

  engine.global.set('__canvas_restore', () => {
    ctx.restore()
  })

  engine.global.set(
    '__canvas_transform',
    (a: number, b: number, c: number, d: number, e: number, f: number) => {
      ctx.transform(a, b, c, d, e, f)
    }
  )

  engine.global.set(
    '__canvas_setTransform',
    (a: number, b: number, c: number, d: number, e: number, f: number) => {
      ctx.setTransform(a, b, c, d, e, f)
    }
  )

  engine.global.set('__canvas_resetTransform', () => {
    ctx.resetTransform()
  })

  // Path API
  engine.global.set('__canvas_beginPath', () => {
    ctx.beginPath()
  })

  engine.global.set('__canvas_closePath', () => {
    ctx.closePath()
  })

  engine.global.set('__canvas_moveTo', (x: number, y: number) => {
    ctx.moveTo(x, y)
  })

  engine.global.set('__canvas_lineTo', (x: number, y: number) => {
    ctx.lineTo(x, y)
  })

  engine.global.set('__canvas_fill', () => {
    ctx.fill()
  })

  engine.global.set('__canvas_stroke', () => {
    ctx.stroke()
  })

  engine.global.set(
    '__canvas_arc',
    (
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise: boolean
    ) => {
      ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    }
  )

  engine.global.set(
    '__canvas_arcTo',
    (x1: number, y1: number, x2: number, y2: number, radius: number) => {
      ctx.arcTo(x1, y1, x2, y2, radius)
    }
  )

  engine.global.set(
    '__canvas_quadraticCurveTo',
    (cpx: number, cpy: number, x: number, y: number) => {
      ctx.quadraticCurveTo(cpx, cpy, x, y)
    }
  )

  engine.global.set(
    '__canvas_bezierCurveTo',
    (
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number
    ) => {
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
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
      counterclockwise: boolean
    ) => {
      ctx.ellipse(
        x,
        y,
        radiusX,
        radiusY,
        rotation,
        startAngle,
        endAngle,
        counterclockwise
      )
    }
  )

  engine.global.set(
    '__canvas_roundRect',
    (
      x: number,
      y: number,
      width: number,
      height: number,
      radii: number | number[]
    ) => {
      ctx.roundRect(x, y, width, height, radii)
    }
  )

  engine.global.set(
    '__canvas_rectPath',
    (x: number, y: number, width: number, height: number) => {
      ctx.rect(x, y, width, height)
    }
  )

  engine.global.set('__canvas_clip', (fillRule?: CanvasFillRule) => {
    if (fillRule) {
      ctx.clip(fillRule)
    } else {
      ctx.clip()
    }
  })

  // Hit testing (basic implementation - uses current path)
  engine.global.set(
    '__canvas_isPointInPath',
    (x: number, y: number, fillRule: CanvasFillRule) => {
      return ctx.isPointInPath(x, y, fillRule)
    }
  )

  engine.global.set(
    '__canvas_isPointInStroke',
    (x: number, y: number) => {
      return ctx.isPointInStroke(x, y)
    }
  )

  // Line styling
  engine.global.set('__canvas_setLineCap', (cap: CanvasLineCap) => {
    ctx.lineCap = cap
  })

  engine.global.set('__canvas_setLineJoin', (join: CanvasLineJoin) => {
    ctx.lineJoin = join
  })

  engine.global.set('__canvas_setMiterLimit', (limit: number) => {
    ctx.miterLimit = limit
  })

  engine.global.set('__canvas_setLineDash', (segments: number[]) => {
    ctx.setLineDash(segments)
  })

  engine.global.set('__canvas_getLineDash', () => {
    return ctx.getLineDash()
  })

  engine.global.set('__canvas_setLineDashOffset', (offset: number) => {
    ctx.lineDashOffset = offset
  })

  // Shadows
  engine.global.set('__canvas_setShadowColor', (color: string) => {
    ctx.shadowColor = color
  })

  engine.global.set('__canvas_setShadowBlur', (blur: number) => {
    ctx.shadowBlur = blur
  })

  engine.global.set('__canvas_setShadowOffsetX', (offset: number) => {
    ctx.shadowOffsetX = offset
  })

  engine.global.set('__canvas_setShadowOffsetY', (offset: number) => {
    ctx.shadowOffsetY = offset
  })

  engine.global.set(
    '__canvas_setShadow',
    (color: string, blur: number, offsetX: number, offsetY: number) => {
      ctx.shadowColor = color
      ctx.shadowBlur = blur
      ctx.shadowOffsetX = offsetX
      ctx.shadowOffsetY = offsetY
    }
  )

  engine.global.set('__canvas_clearShadow', () => {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  })

  // Compositing
  engine.global.set('__canvas_setGlobalAlpha', (alpha: number) => {
    ctx.globalAlpha = alpha
  })

  engine.global.set(
    '__canvas_setCompositeOperation',
    (operation: GlobalCompositeOperation) => {
      ctx.globalCompositeOperation = operation
    }
  )

  engine.global.set('__canvas_setImageSmoothing', (enabled: boolean) => {
    ctx.imageSmoothingEnabled = enabled
  })

  engine.global.set('__canvas_setFilter', (filter: string) => {
    ctx.filter = filter
  })

  // Text alignment
  engine.global.set('__canvas_setTextAlign', (align: CanvasTextAlign) => {
    ctx.textAlign = align
  })

  engine.global.set(
    '__canvas_setTextBaseline',
    (baseline: CanvasTextBaseline) => {
      ctx.textBaseline = baseline
    }
  )

  engine.global.set(
    '__canvas_setDirection',
    (direction: CanvasDirection) => {
      ctx.direction = direction
    }
  )

  engine.global.set('__canvas_getTextMetrics', (text: string) => {
    const metrics = ctx.measureText(text)
    return {
      width: metrics.width,
      actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
      actualBoundingBoxRight: metrics.actualBoundingBoxRight,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
      fontBoundingBoxAscent: metrics.fontBoundingBoxAscent,
      fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
    }
  })

  // Capture
  engine.global.set(
    '__canvas_capture',
    (format?: string | null, quality?: number | null) => {
      if (format && quality !== undefined && quality !== null) {
        return canvas.toDataURL(format, quality)
      } else if (format) {
        return canvas.toDataURL(format)
      }
      return canvas.toDataURL()
    }
  )

  // Fill/stroke style (for gradients and patterns)
  engine.global.set(
    '__canvas_setFillStyle',
    (style: string | Record<string, unknown>) => {
      if (typeof style === 'string') {
        ctx.fillStyle = style
      } else if (style.type === 'linear') {
        const gradient = ctx.createLinearGradient(
          style.x0 as number,
          style.y0 as number,
          style.x1 as number,
          style.y1 as number
        )
        const stops = style.stops as Array<{ offset: number; color: string }>
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
        ctx.fillStyle = gradient
      } else if (style.type === 'radial') {
        const gradient = ctx.createRadialGradient(
          style.x0 as number,
          style.y0 as number,
          style.r0 as number,
          style.x1 as number,
          style.y1 as number,
          style.r1 as number
        )
        const stops = style.stops as Array<{ offset: number; color: string }>
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
        ctx.fillStyle = gradient
      } else if (style.type === 'conic') {
        const gradient = ctx.createConicGradient(
          style.startAngle as number,
          style.x as number,
          style.y as number
        )
        const stops = style.stops as Array<{ offset: number; color: string }>
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
        ctx.fillStyle = gradient
      }
    }
  )

  engine.global.set(
    '__canvas_setStrokeStyle',
    (style: string | Record<string, unknown>) => {
      if (typeof style === 'string') {
        ctx.strokeStyle = style
      } else if (style.type === 'linear') {
        const gradient = ctx.createLinearGradient(
          style.x0 as number,
          style.y0 as number,
          style.x1 as number,
          style.y1 as number
        )
        const stops = style.stops as Array<{ offset: number; color: string }>
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
        ctx.strokeStyle = gradient
      } else if (style.type === 'radial') {
        const gradient = ctx.createRadialGradient(
          style.x0 as number,
          style.y0 as number,
          style.r0 as number,
          style.x1 as number,
          style.y1 as number,
          style.r1 as number
        )
        const stops = style.stops as Array<{ offset: number; color: string }>
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
        ctx.strokeStyle = gradient
      } else if (style.type === 'conic') {
        const gradient = ctx.createConicGradient(
          style.startAngle as number,
          style.x as number,
          style.y as number
        )
        const stops = style.stops as Array<{ offset: number; color: string }>
        for (const stop of stops) {
          gradient.addColorStop(stop.offset, stop.color)
        }
        ctx.strokeStyle = gradient
      }
    }
  )

  // Asset stubs (not fully implemented for standalone - assets need to be embedded differently)
  engine.global.set('__canvas_assets_addPath', () => {
    // No-op for standalone - assets should be pre-bundled
  })

  engine.global.set(
    '__canvas_assets_loadImage',
    (name: string, filename: string) => {
      // Return a handle for reference
      return { _type: 'image', _name: name, _file: filename }
    }
  )

  engine.global.set(
    '__canvas_assets_loadFont',
    (name: string, filename: string) => {
      return { _type: 'font', _name: name, _file: filename }
    }
  )

  engine.global.set('__canvas_assets_getWidth', () => 0)
  engine.global.set('__canvas_assets_getHeight', () => 0)

  engine.global.set(
    '__canvas_drawImage',
    () => {
      // Image drawing not fully implemented for standalone yet
      console.warn('draw_image not fully supported in standalone export')
    }
  )

  // Pixel manipulation stubs (simplified for standalone)
  engine.global.set(
    '__canvas_createImageData',
    (width: number, height: number) => {
      return { id: -1, width, height }
    }
  )

  engine.global.set(
    '__canvas_getImageData',
    (x: number, y: number, width: number, height: number) => {
      const imageData = ctx.getImageData(x, y, width, height)
      return { id: -1, width, height, data: Array.from(imageData.data) }
    }
  )

  engine.global.set(
    '__canvas_imageDataGetPixel',
    (
      _id: number,
      x: number,
      y: number,
      data?: number[],
      width?: number
    ) => {
      if (!data || !width) return [0, 0, 0, 0]
      const i = (y * width + x) * 4
      return [data[i], data[i + 1], data[i + 2], data[i + 3]]
    }
  )

  engine.global.set('__canvas_imageDataSetPixel', () => {
    // Simplified - would need proper implementation
  })

  engine.global.set('__canvas_putImageData', () => {
    // Simplified - would need proper implementation
  })

  engine.global.set('__canvas_cloneImageData', () => null)

  // Path2D stubs (would need proper implementation for full support)
  engine.global.set('__canvas_createPath', () => ({ id: -1 }))
  engine.global.set('__canvas_clonePath', () => ({ id: -1 }))
  engine.global.set('__canvas_disposePath', () => {})
  engine.global.set('__canvas_pathMoveTo', () => {})
  engine.global.set('__canvas_pathLineTo', () => {})
  engine.global.set('__canvas_pathClosePath', () => {})
  engine.global.set('__canvas_pathRect', () => {})
  engine.global.set('__canvas_pathRoundRect', () => {})
  engine.global.set('__canvas_pathArc', () => {})
  engine.global.set('__canvas_pathArcTo', () => {})
  engine.global.set('__canvas_pathEllipse', () => {})
  engine.global.set('__canvas_pathQuadraticCurveTo', () => {})
  engine.global.set('__canvas_pathBezierCurveTo', () => {})
  engine.global.set('__canvas_pathAddPath', () => {})
  engine.global.set('__canvas_fillPath', () => {})
  engine.global.set('__canvas_strokePath', () => {})
  engine.global.set('__canvas_clipPath', () => {})
  engine.global.set('__canvas_isPointInStoredPath', () => false)
  engine.global.set('__canvas_isPointInStoredStroke', () => false)

  // --- Audio API ---

  // Audio asset registration
  engine.global.set(
    '__canvas_assets_loadSound',
    (name: string, filename: string) => {
      state.audioAssets.set(name, { name, filename, type: 'sound' })
      return { _type: 'sound', _name: name, _file: filename }
    }
  )

  engine.global.set(
    '__canvas_assets_loadMusic',
    (name: string, filename: string) => {
      state.audioAssets.set(name, { name, filename, type: 'music' })
      return { _type: 'music', _name: name, _file: filename }
    }
  )

  // Helper to extract audio name from handle or string
  const extractAudioName = (nameOrHandle: unknown): string => {
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
    throw new Error('Invalid audio asset reference')
  }

  // Sound effect functions
  engine.global.set(
    '__audio_playSound',
    (nameOrHandle: unknown, volume?: number | null) => {
      const name = extractAudioName(nameOrHandle)
      state.audioEngine.playSound(name, volume ?? 1)
    }
  )

  engine.global.set('__audio_getSoundDuration', (nameOrHandle: unknown) => {
    const name = extractAudioName(nameOrHandle)
    return state.audioEngine.getSoundDuration(name)
  })

  // Music functions
  engine.global.set(
    '__audio_playMusic',
    (nameOrHandle: unknown, volume?: number | null, loop?: boolean | null) => {
      const name = extractAudioName(nameOrHandle)
      state.audioEngine.playMusic(name, {
        volume: volume ?? 1,
        loop: loop ?? false,
      })
    }
  )

  engine.global.set('__audio_stopMusic', () => {
    state.audioEngine.stopMusic()
  })

  engine.global.set('__audio_pauseMusic', () => {
    state.audioEngine.pauseMusic()
  })

  engine.global.set('__audio_resumeMusic', () => {
    state.audioEngine.resumeMusic()
  })

  engine.global.set('__audio_setMusicVolume', (volume: number) => {
    state.audioEngine.setMusicVolume(volume)
  })

  engine.global.set('__audio_isMusicPlaying', () => {
    return state.audioEngine.isMusicPlaying()
  })

  engine.global.set('__audio_getMusicTime', () => {
    return state.audioEngine.getMusicTime()
  })

  engine.global.set('__audio_getMusicDuration', () => {
    return state.audioEngine.getMusicDuration()
  })

  // Global audio control
  engine.global.set('__audio_setMasterVolume', (volume: number) => {
    state.audioEngine.setMasterVolume(volume)
  })

  engine.global.set('__audio_getMasterVolume', () => {
    return state.audioEngine.getMasterVolume()
  })

  engine.global.set('__audio_mute', () => {
    state.audioEngine.mute()
  })

  engine.global.set('__audio_unmute', () => {
    state.audioEngine.unmute()
  })

  engine.global.set('__audio_isMuted', () => {
    return state.audioEngine.isMuted()
  })
}
