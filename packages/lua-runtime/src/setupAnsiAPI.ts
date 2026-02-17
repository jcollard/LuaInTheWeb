/**
 * Shared ANSI terminal API setup for Lua processes.
 * Registers all JS bridge functions and Lua wrapper code needed for
 * ansi.start(), ansi.stop(), drawing, input, and timing functions.
 */

import type { LuaEngine } from 'wasmoon'
import type { AnsiController } from './AnsiController'
import { ansiLuaCode } from './ansiLuaWrapper'

/**
 * Set up ANSI terminal API functions in the Lua engine.
 *
 * @param engine - The Lua engine to set up
 * @param getController - Function to get the ANSI controller (allows lazy access)
 */
export function setupAnsiAPI(
  engine: LuaEngine,
  getController: () => AnsiController | null
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

  // --- Set up Lua-side ansi table ---
  // ANSI is NOT a global - it must be accessed via require('ansi')
  engine.doStringSync(ansiLuaCode)
}
