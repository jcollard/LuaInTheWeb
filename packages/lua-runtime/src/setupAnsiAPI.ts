/**
 * Shared ANSI terminal API setup for Lua processes.
 * Registers all JS bridge functions and Lua wrapper code needed for
 * ansi.start(), ansi.stop(), drawing, input, and timing functions.
 */

import type { LuaEngine } from 'wasmoon'
import type { AnsiController } from './AnsiController'
import { ansiLuaCode } from './ansiLuaWrapper'

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
function joinPath(...segments: string[]): string {
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
