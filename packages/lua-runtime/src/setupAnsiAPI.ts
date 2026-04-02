/**
 * Shared ANSI terminal API setup for Lua processes.
 * Registers all JS bridge functions and Lua wrapper code needed for
 * ansi.start(), ansi.stop(), drawing, input, and timing functions.
 */

import type { LuaEngine } from 'wasmoon'
import type { AnsiController } from './AnsiController'
import type { RGBColor } from './screenTypes'
import { ansiLuaCode } from './ansiLuaWrapper'
import { parseAnsiEscapes } from './ansiEscapeParser'

/**
 * Convert a flat array of numbers from a wasmoon Lua table into RGBColor triples.
 * Wasmoon may pass Lua array tables as JS arrays (0-indexed) or 1-indexed objects.
 */
function flatToValues(flat: Record<number, number>): number[] {
  const values: number[] = []
  if (Array.isArray(flat)) {
    for (const v of flat) values.push(v)
  } else {
    let i = 1
    while (flat[i] !== undefined) {
      values.push(flat[i])
      i++
    }
  }
  return values
}

function parseFlatColorsToRgb(flatColors: Record<number, number>): RGBColor[] {
  const values = flatToValues(flatColors)
  const colors: RGBColor[] = []
  for (let j = 0; j < values.length; j += 3) {
    colors.push([values[j], values[j + 1], values[j + 2]])
  }
  return colors
}

/**
 * Parse flat bg color triples, treating [-1,-1,-1] as undefined (transparent).
 */
function parseFlatBgColorsToRgb(flatColors: Record<number, number>): (RGBColor | undefined)[] {
  const values = flatToValues(flatColors)
  const colors: (RGBColor | undefined)[] = []
  for (let j = 0; j < values.length; j += 3) {
    if (values[j] === -1 && values[j + 1] === -1 && values[j + 2] === -1) {
      colors.push(undefined)
    } else {
      colors.push([values[j], values[j + 1], values[j + 2]])
    }
  }
  return colors
}

/**
 * Options for ANSI API file reading support.
 */
export interface AnsiAPIOptions {
  /** Read a file by absolute path. Returns content string or null if not found. */
  fileReader?: (path: string) => string | null
  /** Current working directory for resolving relative paths. */
  cwd?: string
}

/**
 * Join path segments into a single absolute path.
 */
export function joinPath(...segments: string[]): string {
  const parts: string[] = []
  for (const segment of segments) {
    const cleanSegment = segment.replace(/^\/+|\/+$/g, '')
    if (cleanSegment) {
      parts.push(cleanSegment)
    }
  }
  return '/' + parts.join('/')
}

/**
 * Set up ANSI terminal API functions in the Lua engine.
 *
 * @param engine - The Lua engine to set up
 * @param getController - Function to get the ANSI controller (allows lazy access)
 * @param options - Optional file reading support for ansi.load_screen()
 */
export function setupAnsiAPI(
  engine: LuaEngine,
  getController: () => AnsiController | null,
  options?: AnsiAPIOptions
): void {
  // --- Lifecycle functions ---
  engine.global.set('__ansi_is_active', () => {
    return getController()?.isActive() ?? false
  })

  engine.global.set('__ansi_start', () => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    return controller.start()
  })

  engine.global.set('__ansi_stop', () => {
    const controller = getController()
    if (controller?.isActive()) {
      controller.stop()
    }
  })

  // Set the raw callback (called from Lua wrapper that adds error handling)
  engine.global.set('__ansi_setOnTickCallback', (callback: () => void) => {
    getController()?.setOnTickCallback(callback)
  })

  // --- Terminal output functions ---
  engine.global.set('__ansi_write', (text: string) => {
    getController()?.write(text)
  })

  engine.global.set('__ansi_setCursor', (row: number, col: number) => {
    getController()?.setCursor(row, col)
  })

  engine.global.set('__ansi_clear', () => {
    getController()?.clear()
  })

  // --- Color functions ---
  engine.global.set('__ansi_setForeground', (r: number, g: number, b: number) => {
    getController()?.setForeground(r, g, b)
  })

  engine.global.set('__ansi_setBackground', (r: number, g: number, b: number) => {
    getController()?.setBackground(r, g, b)
  })

  engine.global.set('__ansi_reset', () => {
    getController()?.reset()
  })

  // --- CRT effect ---
  engine.global.set('__ansi_setCrt', (enabled: boolean, intensity?: number, config?: Record<string, number>) => {
    getController()?.setCrt(enabled, intensity, config)
  })

  // --- Timing functions ---
  engine.global.set('__ansi_getDelta', () => {
    return getController()?.getDelta() ?? 0
  })

  engine.global.set('__ansi_getTime', () => {
    return getController()?.getTime() ?? 0
  })

  // --- Input functions ---
  engine.global.set('__ansi_isKeyDown', (key: string) => {
    return getController()?.isKeyDown(key) ?? false
  })

  engine.global.set('__ansi_isKeyPressed', (key: string) => {
    return getController()?.isKeyPressed(key) ?? false
  })

  engine.global.set('__ansi_getKeysDown', () => {
    return getController()?.getKeysDown() ?? []
  })

  engine.global.set('__ansi_getKeysPressed', () => {
    return getController()?.getKeysPressed() ?? []
  })

  // --- Mouse input functions ---
  engine.global.set('__ansi_getMouseCol', () => {
    return getController()?.getMouseCol() ?? 0
  })

  engine.global.set('__ansi_getMouseRow', () => {
    return getController()?.getMouseRow() ?? 0
  })

  engine.global.set('__ansi_isMouseTopHalf', () => {
    return getController()?.isMouseTopHalf() ?? false
  })

  engine.global.set('__ansi_getMouseX', () => {
    return getController()?.getMouseX() ?? 0
  })

  engine.global.set('__ansi_getMouseY', () => {
    return getController()?.getMouseY() ?? 0
  })

  engine.global.set('__ansi_isMouseDown', (button: number) => {
    return getController()?.isMouseButtonDown(button) ?? false
  })

  engine.global.set('__ansi_isMousePressed', (button: number) => {
    return getController()?.isMouseButtonPressed(button) ?? false
  })

  // --- Screen functions ---
  engine.global.set('__ansi_createScreen', (data: Record<string, unknown>) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    return controller.createScreen(data)
  })

  engine.global.set('__ansi_setScreen', (id: number | null) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    controller.setScreen(id)
  })

  // --- Layer visibility functions ---
  engine.global.set('__ansi_screenGetLayers', (id: number) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    return controller.getScreenLayers(id)
  })

  engine.global.set('__ansi_screenLayerOn', (id: number, identifier: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    controller.setScreenLayerVisible(id, identifier, true)
  })

  engine.global.set('__ansi_screenLayerOff', (id: number, identifier: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    controller.setScreenLayerVisible(id, identifier, false)
  })

  engine.global.set('__ansi_screenLayerToggle', (id: number, identifier: string) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    controller.toggleScreenLayer(id, identifier)
  })

  // --- Animation playback functions ---
  engine.global.set('__ansi_screenPlay', (id: number) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    controller.screenPlay(id)
  })

  engine.global.set('__ansi_screenPause', (id: number) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    controller.screenPause(id)
  })

  engine.global.set('__ansi_screenIsPlaying', (id: number) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    return controller.screenIsPlaying(id)
  })

  // --- Swipe/dither transition functions ---
  engine.global.set('__ansi_screenSwipeOut', (
    id: number, duration: number, cR: number, cG: number, cB: number, char: string, dir: string,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenSwipeOut(id, duration, [cR, cG, cB], char, dir as 'right')
  })
  engine.global.set('__ansi_screenSwipeIn', (
    id: number, layerIdentifier: string, duration: number, dir: string,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenSwipeIn(id, layerIdentifier, duration, dir as 'right')
  })
  engine.global.set('__ansi_screenDitherOut', (
    id: number, duration: number, cR: number, cG: number, cB: number, char: string, seed: number,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenDitherOut(id, duration, [cR, cG, cB], char, seed)
  })
  engine.global.set('__ansi_screenDitherIn', (
    id: number, layerIdentifier: string, duration: number, seed: number,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenDitherIn(id, layerIdentifier, duration, seed)
  })
  engine.global.set('__ansi_screenSwipeOutLayers', (
    id: number, layerIdentifier: string, duration: number, dir: string,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenSwipeOutLayers(id, layerIdentifier, duration, dir as 'right')
  })
  engine.global.set('__ansi_screenDitherOutLayers', (
    id: number, layerIdentifier: string, duration: number, seed: number,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenDitherOutLayers(id, layerIdentifier, duration, seed)
  })
  engine.global.set('__ansi_screenIsSwiping', (id: number) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    return c.screenIsSwiping(id)
  })

  // --- Viewport / pan functions ---
  engine.global.set('__ansi_screenPan', (
    id: number, duration: number, fromCol: number, fromRow: number, toCol: number, toRow: number,
  ) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenPan(id, duration, fromCol, fromRow, toCol, toRow)
  })
  engine.global.set('__ansi_screenSetViewport', (id: number, col: number, row: number) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    c.screenSetViewport(id, col, row)
  })
  engine.global.set('__ansi_screenIsPanning', (id: number) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    return c.screenIsPanning(id)
  })
  engine.global.set('__ansi_screenGetViewport', (id: number) => {
    const c = getController(); if (!c) throw new Error('ANSI terminal not available')
    return c.screenGetViewport(id)
  })

  // --- Label functions ---
  engine.global.set('__ansi_screenSetLabel', (
    screenId: number,
    identifier: string,
    text: string,
    textFgR?: number,
    textFgG?: number,
    textFgB?: number,
    flatFgColors?: Record<number, number>,
    textBgR?: number,
    textBgG?: number,
    textBgB?: number,
    flatBgColors?: Record<number, number>,
  ) => {
    const controller = getController()
    if (!controller) {
      throw new Error('ANSI terminal not available')
    }
    const textFg: RGBColor | undefined = (textFgR != null)
      ? [textFgR, textFgG!, textFgB!]
      : undefined
    const textFgColors = flatFgColors ? parseFlatColorsToRgb(flatFgColors) : undefined
    const textBg: RGBColor | undefined = (textBgR != null)
      ? [textBgR, textBgG!, textBgB!]
      : undefined
    const textBgColors = flatBgColors ? parseFlatBgColorsToRgb(flatBgColors) as RGBColor[] : undefined
    controller.setScreenLabel(screenId, identifier, text, textFg, textFgColors, textBg, textBgColors)
  })

  // --- ANSI escape label functions ---
  // Parsed label stored between create and apply calls (closure, not on controller).
  let pendingEscapedLabel: ReturnType<typeof parseAnsiEscapes> | null = null

  engine.global.set('__ansi_createEscapedLabel', (
    text: string, defFgR: number, defFgG: number, defFgB: number,
    defBgR?: number, defBgG?: number, defBgB?: number,
  ): string => {
    const defaultFg: RGBColor = [defFgR, defFgG, defFgB]
    const defaultBg: RGBColor | undefined = (defBgR != null) ? [defBgR, defBgG!, defBgB!] : undefined
    pendingEscapedLabel = parseAnsiEscapes(text, defaultFg, defaultBg)
    return pendingEscapedLabel.text
  })

  engine.global.set('__ansi_screenSetEscapedLabel', (screenId: number, identifier: string) => {
    const controller = getController()
    if (!controller) throw new Error('ANSI terminal not available')
    if (!pendingEscapedLabel) throw new Error('No parsed label. Call create_escaped_label first.')
    const { text, fgColors, bgColors } = pendingEscapedLabel
    pendingEscapedLabel = null
    const hasBg = bgColors.some(c => c !== undefined)
    controller.setScreenLabel(screenId, identifier, text, undefined, fgColors, undefined, hasBg ? bgColors as RGBColor[] : undefined)
  })

  // --- File reading for load_screen ---
  if (options?.fileReader) {
    const fileReader = options.fileReader
    const cwd = options.cwd ?? '/'

    engine.global.set('__ansi_readFile', (path: string): string => {
      // Absolute paths are used directly
      if (path.startsWith('/')) {
        const content = fileReader(path)
        if (content !== null) return content
        throw new Error(`ANSI file not found: ${path}`)
      }

      // Relative paths: try CWD first, then root fallback
      const cwdPath = joinPath(cwd, path)
      const cwdContent = fileReader(cwdPath)
      if (cwdContent !== null) return cwdContent

      if (cwd !== '/') {
        const rootPath = joinPath('/', path)
        const rootContent = fileReader(rootPath)
        if (rootContent !== null) return rootContent
      }

      throw new Error(`ANSI file not found: ${path} (searched ${cwdPath})`)
    })
  }

  // --- Set up Lua-side ansi table ---
  // ANSI is NOT a global - it must be accessed via require('ansi')
  engine.doStringSync(ansiLuaCode)
}
