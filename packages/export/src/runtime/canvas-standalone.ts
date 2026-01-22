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
  LUA_HC_CODE,
  LUA_LOCALSTORAGE_CODE,
} from '@lua-learning/lua-runtime'

import type { LuaEngine } from 'wasmoon'

/**
 * Cached gamepad state for a single gamepad.
 * Polled once per frame for consistent input detection.
 */
export interface GamepadState {
  connected: boolean
  id: string
  buttons: number[]
  buttonsPressed: boolean[]
  axes: number[]
}

/**
 * Create an empty gamepad state.
 */
function createEmptyGamepadState(): GamepadState {
  return {
    connected: false,
    id: '',
    buttons: [],
    buttonsPressed: [],
    axes: [],
  }
}

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
 * HC collision detection library Lua code.
 * Used for games that require collision detection.
 */
export const hcLuaCode = LUA_HC_CODE

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
  // Cached arrays for getKeysDown/getKeysPressed - rebuilt only when dirty
  keysDownArray: string[]
  keysPressedArray: string[]
  keysDownDirty: boolean
  keysPressedDirty: boolean
  mouseX: number
  mouseY: number
  mouseButtonsDown: Set<number>
  mouseButtonsPressed: Set<number>
  currentFontSize: number
  currentFontFamily: string
  stopResolve: (() => void) | null
  // Audio state - set by AUDIO_INLINE_JS's setupAudioBridge
  audioEngine?: { dispose: () => void }
  audioAssets: Map<string, { name: string; filename: string; type: 'sound' | 'music' }>
  // Gamepad state for "just pressed" detection
  previousGamepadButtons: number[][]
  // Cached gamepad states polled once per frame
  currentGamepadStates: GamepadState[]
  // Path2D registry state
  pathRegistry: Map<number, Path2D>
  nextPathId: number
  // ImageData registry state (Issue #603 - avoid GC pressure)
  imageDataStore: Map<number, { data: Uint8ClampedArray; width: number; height: number }>
  nextImageDataId: number
  // Gradient cache for GC pressure reduction (Issue #605)
  gradientCache: Map<string, CanvasGradient>
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
    // Cached arrays for getKeysDown/getKeysPressed - rebuilt only when dirty
    keysDownArray: [],
    keysPressedArray: [],
    keysDownDirty: true,
    keysPressedDirty: true,
    mouseX: 0,
    mouseY: 0,
    mouseButtonsDown: new Set(),
    mouseButtonsPressed: new Set(),
    currentFontSize: 16,
    currentFontFamily: 'monospace',
    stopResolve: null,
    // audioEngine is set by AUDIO_INLINE_JS's setupAudioBridge
    audioAssets: new Map(),
    // Gamepad state for "just pressed" detection
    previousGamepadButtons: [[], [], [], []],
    // Cached gamepad states polled once per frame
    currentGamepadStates: [
      createEmptyGamepadState(),
      createEmptyGamepadState(),
      createEmptyGamepadState(),
      createEmptyGamepadState(),
    ],
    // Path2D registry state
    pathRegistry: new Map(),
    nextPathId: 1,
    // ImageData registry state (Issue #603 - avoid GC pressure)
    imageDataStore: new Map(),
    nextImageDataId: 1,
    // Gradient cache for GC pressure reduction (Issue #605)
    gradientCache: new Map(),
  }
}

/**
 * Set up input event listeners for the canvas.
 */
export function setupInputListeners(state: CanvasRuntimeState): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!state.keysDown.has(e.code)) {
      state.keysPressed.add(e.code)
      state.keysPressedDirty = true
    }
    state.keysDown.add(e.code)
    state.keysDownDirty = true
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    state.keysDown.delete(e.code)
    state.keysDownDirty = true
  }

  const handleMouseMove = (e: MouseEvent) => {
    const rect = state.canvas.getBoundingClientRect()
    // Get position relative to displayed element
    const displayX = e.clientX - rect.left
    const displayY = e.clientY - rect.top
    // Scale from display coords to canvas logical coords (handles scaled canvas)
    state.mouseX = displayX * (state.canvas.width / rect.width)
    state.mouseY = displayY * (state.canvas.height / rect.height)
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

  const handleContextMenu = (e: MouseEvent) => {
    // Prevent browser context menu so right-click can be used in games
    e.preventDefault()
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  state.canvas.addEventListener('mousemove', handleMouseMove)
  state.canvas.addEventListener('mousedown', handleMouseDown)
  state.canvas.addEventListener('mouseup', handleMouseUp)
  state.canvas.addEventListener('contextmenu', handleContextMenu)

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    state.canvas.removeEventListener('mousemove', handleMouseMove)
    state.canvas.removeEventListener('mousedown', handleMouseDown)
    state.canvas.removeEventListener('mouseup', handleMouseUp)
    state.canvas.removeEventListener('contextmenu', handleContextMenu)
  }
}

/**
 * Poll gamepad state once per frame.
 * Updates currentGamepadStates with fresh button/axis values and calculates
 * which buttons were just pressed this frame.
 *
 * GC Optimization: Uses in-place array updates instead of creating new arrays.
 */
function pollGamepads(state: CanvasRuntimeState): void {
  const gamepads = navigator.getGamepads?.() ?? []

  for (let i = 0; i < 4; i++) {
    const gamepad = gamepads[i]
    const cached = state.currentGamepadStates[i]
    const prevButtons = state.previousGamepadButtons[i]

    if (!gamepad?.connected) {
      if (cached.connected) {
        cached.connected = false
        cached.id = ''
        // Clear in-place instead of = []
        cached.buttons.length = 0
        cached.buttonsPressed.length = 0
        cached.axes.length = 0
        prevButtons.length = 0
      }
      continue
    }

    cached.connected = true
    cached.id = gamepad.id

    const buttonCount = gamepad.buttons.length
    const axisCount = gamepad.axes.length

    // Resize arrays to match gamepad (in-place)
    cached.buttons.length = buttonCount
    cached.buttonsPressed.length = buttonCount
    cached.axes.length = axisCount

    // Ensure prevButtons has correct size
    if (prevButtons.length !== buttonCount) {
      prevButtons.length = buttonCount
      for (let b = 0; b < buttonCount; b++) {
        prevButtons[b] = 0
      }
    }

    // Update in-place (no new arrays)
    for (let b = 0; b < buttonCount; b++) {
      const value = gamepad.buttons[b].value
      cached.buttons[b] = value
      // Button just pressed if value > 0 and wasn't before
      cached.buttonsPressed[b] = value > 0 && prevButtons[b] === 0
      prevButtons[b] = value
    }

    for (let a = 0; a < axisCount; a++) {
      cached.axes[a] = gamepad.axes[a]
    }
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

    // Poll gamepad state once at frame start (before Lua callback)
    pollGamepads(state)

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
    if (state.keysPressed.size > 0) {
      state.keysPressed.clear()
      state.keysPressedDirty = true
    }
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

  // Set default font and text baseline (matching CanvasRenderer constructor behavior)
  ctx.font = `${state.currentFontSize}px ${state.currentFontFamily}`
  ctx.textBaseline = 'top'

  // Lifecycle functions
  engine.global.set('__canvas_is_active', () => state.isRunning)

  engine.global.set('__canvas_start', async () => {
    // Audio is initialized by AUDIO_INLINE_JS via user interaction handlers
    // Return a Promise that resolves when canvas.stop() is called
    return new Promise<void>((resolve) => {
      state.isRunning = true
      state.stopResolve = resolve
      startGameLoop(state)
    })
  })

  engine.global.set('__canvas_stop', () => {
    state.isRunning = false
    // Clear imageDataStore to prevent memory leaks
    state.imageDataStore.clear()
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
    // Clear gradient cache to allow new gradients when canvas is cleared (Issue #605)
    state.gradientCache.clear()
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
      // Note: textBaseline is set via __canvas_setTextBaseline (default 'top' in init)
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
  // GC Optimization: Use cached arrays, rebuilt only when dirty
  engine.global.set('__canvas_getKeysDown', () => {
    if (state.keysDownDirty) {
      state.keysDownArray.length = 0
      for (const key of state.keysDown) {
        state.keysDownArray.push(key)
      }
      state.keysDownDirty = false
    }
    return state.keysDownArray
  })
  engine.global.set('__canvas_getKeysPressed', () => {
    if (state.keysPressedDirty) {
      state.keysPressedArray.length = 0
      for (const key of state.keysPressed) {
        state.keysPressedArray.push(key)
      }
      state.keysPressedDirty = false
    }
    return state.keysPressedArray
  })
  engine.global.set('__canvas_getMouseX', () => state.mouseX)
  engine.global.set('__canvas_getMouseY', () => state.mouseY)
  engine.global.set('__canvas_isMouseDown', (button: number) =>
    state.mouseButtonsDown.has(button)
  )
  engine.global.set('__canvas_isMousePressed', (button: number) =>
    state.mouseButtonsPressed.has(button)
  )

  // Gamepad input - reads from cached state polled once per frame
  // GC Optimization: Use counting loop instead of filter
  engine.global.set('__canvas_getGamepadCount', () => {
    let count = 0
    for (const g of state.currentGamepadStates) {
      if (g.connected) count++
    }
    return count
  })

  engine.global.set('__canvas_isGamepadConnected', (index: number) => {
    return state.currentGamepadStates[index]?.connected ?? false
  })

  engine.global.set(
    '__canvas_getGamepadButton',
    (gamepadIndex: number, buttonIndex: number) => {
      const cached = state.currentGamepadStates[gamepadIndex]
      if (!cached?.connected) return 0
      return cached.buttons[buttonIndex] ?? 0
    }
  )

  engine.global.set(
    '__canvas_isGamepadButtonPressed',
    (gamepadIndex: number, buttonIndex: number) => {
      const cached = state.currentGamepadStates[gamepadIndex]
      if (!cached?.connected) return false
      return cached.buttonsPressed[buttonIndex] ?? false
    }
  )

  engine.global.set(
    '__canvas_getGamepadAxis',
    (gamepadIndex: number, axisIndex: number) => {
      const cached = state.currentGamepadStates[gamepadIndex]
      if (!cached?.connected) return 0
      return cached.axes[axisIndex] ?? 0
    }
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
  // Gradient caching for GC pressure reduction (Issue #605)
  engine.global.set(
    '__canvas_setFillStyle',
    (style: string | Record<string, unknown>) => {
      if (typeof style === 'string') {
        ctx.fillStyle = style
        return
      }

      // Check gradient cache using JSON.stringify key
      const cacheKey = JSON.stringify(style)
      const cached = state.gradientCache.get(cacheKey)
      if (cached) {
        ctx.fillStyle = cached
        return
      }

      // Create gradient based on type
      let gradient: CanvasGradient
      if (style.type === 'linear') {
        gradient = ctx.createLinearGradient(
          style.x0 as number,
          style.y0 as number,
          style.x1 as number,
          style.y1 as number
        )
      } else if (style.type === 'radial') {
        gradient = ctx.createRadialGradient(
          style.x0 as number,
          style.y0 as number,
          style.r0 as number,
          style.x1 as number,
          style.y1 as number,
          style.r1 as number
        )
      } else if (style.type === 'conic') {
        gradient = ctx.createConicGradient(
          style.startAngle as number,
          style.x as number,
          style.y as number
        )
      } else {
        return // Unknown type, do nothing
      }

      // Add color stops
      const stops = style.stops as Array<{ offset: number; color: string }>
      for (const stop of stops) {
        gradient.addColorStop(stop.offset, stop.color)
      }

      // Cache and apply
      state.gradientCache.set(cacheKey, gradient)
      ctx.fillStyle = gradient
    }
  )

  engine.global.set(
    '__canvas_setStrokeStyle',
    (style: string | Record<string, unknown>) => {
      if (typeof style === 'string') {
        ctx.strokeStyle = style
        return
      }

      // Check gradient cache using JSON.stringify key
      const cacheKey = JSON.stringify(style)
      const cached = state.gradientCache.get(cacheKey)
      if (cached) {
        ctx.strokeStyle = cached
        return
      }

      // Create gradient based on type
      let gradient: CanvasGradient
      if (style.type === 'linear') {
        gradient = ctx.createLinearGradient(
          style.x0 as number,
          style.y0 as number,
          style.x1 as number,
          style.y1 as number
        )
      } else if (style.type === 'radial') {
        gradient = ctx.createRadialGradient(
          style.x0 as number,
          style.y0 as number,
          style.r0 as number,
          style.x1 as number,
          style.y1 as number,
          style.r1 as number
        )
      } else if (style.type === 'conic') {
        gradient = ctx.createConicGradient(
          style.startAngle as number,
          style.x as number,
          style.y as number
        )
      } else {
        return // Unknown type, do nothing
      }

      // Add color stops
      const stops = style.stops as Array<{ offset: number; color: string }>
      for (const stop of stops) {
        gradient.addColorStop(stop.offset, stop.color)
      }

      // Cache and apply
      state.gradientCache.set(cacheKey, gradient)
      ctx.strokeStyle = gradient
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

  // === PIXEL MANIPULATION (full implementation - Issue #603 pattern) ===
  // Uses ID-based registry to store Uint8ClampedArray on JS side, avoiding
  // expensive Array.from() conversions and enabling O(1) put_image_data.

  /**
   * create_image_data: Creates empty pixel buffer
   * Allocations per call:
   *   1× Uint8ClampedArray(width × height × 4) - pixel buffer (required)
   *   1× Object { data, width, height }        - storage entry
   *   1× Object { id, width, height }          - return value
   */
  engine.global.set('__canvas_createImageData', (width: number, height: number) => {
    const data = new Uint8ClampedArray(width * height * 4)
    const id = state.nextImageDataId++
    state.imageDataStore.set(id, { data, width, height })
    return { id, width, height }
  })

  /**
   * get_image_data: Captures canvas region, stores Uint8ClampedArray directly
   * Allocations per call:
   *   1× Uint8ClampedArray (copy of canvas data) - required
   *   1× Object { data, width, height }          - storage entry
   *   1× Object { id, width, height }            - return value
   * Note: Does NOT use Array.from() - stores typed array directly to avoid GC pressure
   */
  engine.global.set(
    '__canvas_getImageData',
    (x: number, y: number, width: number, height: number) => {
      const imageData = ctx.getImageData(x, y, width, height)
      const id = state.nextImageDataId++
      state.imageDataStore.set(id, {
        data: new Uint8ClampedArray(imageData.data),
        width,
        height,
      })
      return { id, width, height }
    }
  )

  /**
   * get_pixel: Read from stored array by index
   * Allocations per call:
   *   1× Array [r, g, b, a] - return value (4 elements, unavoidable)
   * Time complexity: O(1)
   */
  engine.global.set('__canvas_imageDataGetPixel', (id: number, x: number, y: number) => {
    const stored = state.imageDataStore.get(id)
    if (!stored || x < 0 || x >= stored.width || y < 0 || y >= stored.height) {
      return [0, 0, 0, 0]
    }
    const idx = (y * stored.width + x) * 4
    return [stored.data[idx], stored.data[idx + 1], stored.data[idx + 2], stored.data[idx + 3]]
  })

  /**
   * set_pixel: Write to stored array by index
   * Allocations per call: 0 (direct array mutation)
   * Time complexity: O(1)
   */
  engine.global.set(
    '__canvas_imageDataSetPixel',
    (id: number, x: number, y: number, r: number, g: number, b: number, a: number) => {
      const stored = state.imageDataStore.get(id)
      if (!stored || x < 0 || x >= stored.width || y < 0 || y >= stored.height) return
      const idx = (y * stored.width + x) * 4
      stored.data[idx] = r
      stored.data[idx + 1] = g
      stored.data[idx + 2] = b
      stored.data[idx + 3] = a
    }
  )

  /**
   * put_image_data: Writes stored pixel data to canvas
   * Allocations per call:
   *   1× ImageData wrapper - wraps existing Uint8ClampedArray (no pixel data copy)
   * Time complexity: O(1) for wrapper creation, O(n) for canvas write (browser internal)
   * Note: ImageData constructor with typed array creates a view, not a copy
   */
  engine.global.set(
    '__canvas_putImageData',
    (
      id: number,
      dx: number,
      dy: number,
      dirtyX?: number | null,
      dirtyY?: number | null,
      dirtyWidth?: number | null,
      dirtyHeight?: number | null
    ) => {
      const stored = state.imageDataStore.get(id)
      if (!stored) return
      const imageData = new ImageData(
        stored.data as Uint8ClampedArray<ArrayBuffer>,
        stored.width,
        stored.height
      )
      if (dirtyX != null && dirtyY != null && dirtyWidth != null && dirtyHeight != null) {
        ctx.putImageData(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)
      } else {
        ctx.putImageData(imageData, dx, dy)
      }
    }
  )

  /**
   * clone_image_data: Creates independent copy of pixel data
   * Allocations per call:
   *   1× Uint8ClampedArray (deep copy of pixel data) - required for clone
   *   1× Object { data, width, height }              - storage entry
   *   1× Object { id, width, height }                - return value
   */
  engine.global.set('__canvas_cloneImageData', (id: number) => {
    const stored = state.imageDataStore.get(id)
    if (!stored) return null
    const newData = new Uint8ClampedArray(stored.data)
    const newId = state.nextImageDataId++
    state.imageDataStore.set(newId, { data: newData, width: stored.width, height: stored.height })
    return { id: newId, width: stored.width, height: stored.height }
  })

  /**
   * dispose: Releases ImageData from memory
   * Allocations per call: 0 (Map.delete only)
   */
  engine.global.set('__canvas_imageDataDispose', (id: number) => {
    state.imageDataStore.delete(id)
  })

  // Path2D API - fully implemented for standalone export
  engine.global.set('__canvas_createPath', () => {
    const id = state.nextPathId++
    state.pathRegistry.set(id, new Path2D())
    return { id }
  })

  engine.global.set('__canvas_clonePath', (pathId: number) => {
    const sourcePath = state.pathRegistry.get(pathId)
    if (!sourcePath) return { id: -1 }
    const id = state.nextPathId++
    state.pathRegistry.set(id, new Path2D(sourcePath))
    return { id }
  })

  engine.global.set('__canvas_disposePath', (pathId: number) => {
    state.pathRegistry.delete(pathId)
  })

  engine.global.set('__canvas_pathMoveTo', (pathId: number, x: number, y: number) => {
    const path = state.pathRegistry.get(pathId)
    if (path) path.moveTo(x, y)
  })

  engine.global.set('__canvas_pathLineTo', (pathId: number, x: number, y: number) => {
    const path = state.pathRegistry.get(pathId)
    if (path) path.lineTo(x, y)
  })

  engine.global.set('__canvas_pathClosePath', (pathId: number) => {
    const path = state.pathRegistry.get(pathId)
    if (path) path.closePath()
  })

  engine.global.set(
    '__canvas_pathRect',
    (pathId: number, x: number, y: number, width: number, height: number) => {
      const path = state.pathRegistry.get(pathId)
      if (path) path.rect(x, y, width, height)
    }
  )

  engine.global.set(
    '__canvas_pathRoundRect',
    (
      pathId: number,
      x: number,
      y: number,
      width: number,
      height: number,
      radii: number | number[]
    ) => {
      const path = state.pathRegistry.get(pathId)
      if (path) path.roundRect(x, y, width, height, radii)
    }
  )

  engine.global.set(
    '__canvas_pathArc',
    (
      pathId: number,
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise: boolean
    ) => {
      const path = state.pathRegistry.get(pathId)
      if (path) path.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    }
  )

  engine.global.set(
    '__canvas_pathArcTo',
    (pathId: number, x1: number, y1: number, x2: number, y2: number, radius: number) => {
      const path = state.pathRegistry.get(pathId)
      if (path) path.arcTo(x1, y1, x2, y2, radius)
    }
  )

  engine.global.set(
    '__canvas_pathEllipse',
    (
      pathId: number,
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      rotation: number,
      startAngle: number,
      endAngle: number,
      counterclockwise: boolean
    ) => {
      const path = state.pathRegistry.get(pathId)
      if (path) {
        path.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
      }
    }
  )

  engine.global.set(
    '__canvas_pathQuadraticCurveTo',
    (pathId: number, cpx: number, cpy: number, x: number, y: number) => {
      const path = state.pathRegistry.get(pathId)
      if (path) path.quadraticCurveTo(cpx, cpy, x, y)
    }
  )

  engine.global.set(
    '__canvas_pathBezierCurveTo',
    (
      pathId: number,
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number
    ) => {
      const path = state.pathRegistry.get(pathId)
      if (path) path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
    }
  )

  engine.global.set('__canvas_pathAddPath', (pathId: number, sourcePathId: number) => {
    const path = state.pathRegistry.get(pathId)
    const sourcePath = state.pathRegistry.get(sourcePathId)
    if (path && sourcePath) path.addPath(sourcePath)
  })

  engine.global.set('__canvas_fillPath', (pathId: number, fillRule?: CanvasFillRule) => {
    const path = state.pathRegistry.get(pathId)
    if (path) {
      if (fillRule) {
        ctx.fill(path, fillRule)
      } else {
        ctx.fill(path)
      }
    }
  })

  engine.global.set('__canvas_strokePath', (pathId: number) => {
    const path = state.pathRegistry.get(pathId)
    if (path) ctx.stroke(path)
  })

  engine.global.set('__canvas_clipPath', (pathId: number, fillRule?: CanvasFillRule) => {
    const path = state.pathRegistry.get(pathId)
    if (path) {
      if (fillRule) {
        ctx.clip(path, fillRule)
      } else {
        ctx.clip(path)
      }
    }
  })

  engine.global.set(
    '__canvas_isPointInStoredPath',
    (pathId: number, x: number, y: number, fillRule?: CanvasFillRule) => {
      const path = state.pathRegistry.get(pathId)
      if (!path) return false
      if (fillRule) {
        return ctx.isPointInPath(path, x, y, fillRule)
      }
      return ctx.isPointInPath(path, x, y)
    }
  )

  engine.global.set(
    '__canvas_isPointInStoredStroke',
    (pathId: number, x: number, y: number) => {
      const path = state.pathRegistry.get(pathId)
      if (!path) return false
      return ctx.isPointInStroke(path, x, y)
    }
  )

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

  // Note: Audio playback functions (__audio_playSound, __audio_playMusic, etc.)
  // are provided by AUDIO_INLINE_JS via setupAudioBridge, which handles
  // browser autoplay policy with user interaction handlers.

  // --- LocalStorage API ---
  setupLocalStorageBridge(engine)
}

/**
 * Estimate the remaining localStorage space in bytes.
 */
function getRemainingSpace(): number {
  const STORAGE_LIMIT = 5 * 1024 * 1024 // 5MB typical limit
  try {
    if (typeof localStorage === 'undefined') {
      return 0
    }
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null) {
        const value = localStorage.getItem(key)
        totalSize += key.length * 2
        if (value !== null) {
          totalSize += value.length * 2
        }
      }
    }
    return Math.max(0, STORAGE_LIMIT - totalSize)
  } catch {
    return 0
  }
}

/**
 * Set up localStorage bridge functions on a wasmoon engine.
 */
export function setupLocalStorageBridge(engine: LuaEngine): void {
  // Get item from localStorage
  // NOTE: We return `undefined` instead of `null` because wasmoon's PromiseTypeExtension
  // tries to call .then() on return values to detect Promises, and null.then() throws.
  // Both `undefined` and `null` become `nil` in Lua, so this is safe.
  engine.global.set('__localstorage_getItem', (key: string): string | undefined => {
    try {
      if (typeof localStorage === 'undefined') {
        return undefined
      }
      const value = localStorage.getItem(key)
      return value === null ? undefined : value
    } catch {
      return undefined
    }
  })

  // Set item in localStorage - returns [success, errorMessage?]
  // NOTE: Return undefined instead of null for the error field (wasmoon issue)
  engine.global.set(
    '__localstorage_setItem',
    (key: string, value: string): [boolean, string | undefined] => {
      try {
        if (typeof localStorage === 'undefined') {
          return [false, 'localStorage not available']
        }
        localStorage.setItem(key, value)
        return [true, undefined]
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'QuotaExceededError' ||
            error.message.includes('quota'))
        ) {
          return [false, 'Storage quota exceeded']
        }
        return [false, error instanceof Error ? error.message : 'Unknown error']
      }
    }
  )

  // Remove item from localStorage
  engine.global.set('__localstorage_removeItem', (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch {
      // Silently ignore errors
    }
  })

  // Clear all localStorage
  engine.global.set('__localstorage_clear', (): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear()
      }
    } catch {
      // Silently ignore errors
    }
  })

  // Clear localStorage keys with a specific prefix
  engine.global.set('__localstorage_clearWithPrefix', (prefix: string): void => {
    try {
      if (typeof localStorage === 'undefined') return
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch {
      // Silently ignore errors
    }
  })

  // Get remaining storage space in bytes
  engine.global.set('__localstorage_getRemainingSpace', (): number => {
    return getRemainingSpace()
  })
}

/**
 * LocalStorage Lua code for package.preload registration.
 * This allows users to load it with: local localstorage = require('localstorage')
 */
export const localStorageLuaCode = LUA_LOCALSTORAGE_CODE
