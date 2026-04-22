/**
 * Entry point for generating the inline ANSI bridge for HTML exports.
 *
 * This file is bundled by esbuild into a self-contained JavaScript file
 * that gets embedded in exported HTML files.
 *
 * The bundle exposes:
 * - AnsiController - ANSI terminal controller
 * - setupAnsiAPI - Registers all JS bridge functions in the Lua engine
 * - ansiLuaCode - Combined Lua code for ANSI terminal API
 * - setupLocalStorageBridge - Registers localStorage JS bridge + Lua preload
 */

import { AnsiController } from '@lua-learning/lua-runtime'
import type { AnsiCallbacks, AnsiTerminalHandle } from '@lua-learning/lua-runtime'
import { setupAnsiAPI } from '@lua-learning/lua-runtime'
import type { AnsiAPIOptions } from '@lua-learning/lua-runtime'
import { ansiLuaCode } from '@lua-learning/lua-runtime'
import { CrtShader, CRT_DEFAULTS } from '@lua-learning/lua-runtime'
import { LUA_LOCALSTORAGE_CODE } from '@lua-learning/lua-runtime'
import {
  PixelAnsiRenderer,
  BITMAP_FONT_REGISTRY,
  DEFAULT_FONT_ID,
  getFontById,
  FONT_ATLASES,
} from '@lua-learning/lua-runtime'

function getRemainingSpace(): number {
  const STORAGE_LIMIT = 5 * 1024 * 1024
  try {
    if (typeof localStorage === 'undefined') return 0
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null) {
        used += key.length * 2
        const value = localStorage.getItem(key)
        if (value !== null) used += value.length * 2
      }
    }
    return Math.max(0, STORAGE_LIMIT - used)
  } catch {
    return 0
  }
}

// Uses `any` because the esbuild bundle stubs wasmoon (LuaEngine type unavailable).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupLocalStorageBridge(engine: any): Promise<void> {
  engine.global.set('__localstorage_getItem', (key: string): string | undefined => {
    try {
      if (typeof localStorage === 'undefined') return undefined
      const v = localStorage.getItem(key)
      return v === null ? undefined : v
    } catch {
      return undefined
    }
  })

  engine.global.set(
    '__localstorage_setItem',
    (key: string, value: string): [boolean, string | undefined] => {
      try {
        if (typeof localStorage === 'undefined') return [false, 'localStorage not available']
        localStorage.setItem(key, value)
        return [true, undefined]
      } catch (e) {
        if (
          e instanceof Error &&
          (e.name === 'QuotaExceededError' || e.message.includes('quota'))
        ) {
          return [false, 'Storage quota exceeded']
        }
        return [false, e instanceof Error ? e.message : 'Unknown error']
      }
    }
  )

  engine.global.set('__localstorage_removeItem', (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    } catch {
      // Silently ignore
    }
  })

  engine.global.set('__localstorage_clear', (): void => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.clear()
    } catch {
      // Silently ignore
    }
  })

  engine.global.set('__localstorage_clearWithPrefix', (prefix: string): void => {
    try {
      if (typeof localStorage === 'undefined') return
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(prefix)) keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      // Silently ignore
    }
  })

  engine.global.set('__localstorage_getRemainingSpace', (): number => {
    return getRemainingSpace()
  })

  return engine.doString(
    "package.preload['localstorage'] = function() " + LUA_LOCALSTORAGE_CODE + ' end'
  )
}

// Expose globally for use in exported HTML
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).AnsiStandalone = {
  AnsiController,
  setupAnsiAPI,
  ansiLuaCode,
  CrtShader,
  CRT_DEFAULTS,
  setupLocalStorageBridge,
  // Bitmap renderer + registry (Step 8). The HTML template uses these to
  // honor per-screen font + useFontBlocks settings from .ansi.lua files.
  PixelAnsiRenderer,
  BITMAP_FONT_REGISTRY,
  DEFAULT_FONT_ID,
  getFontById,
  FONT_ATLASES,
}

export type { AnsiCallbacks, AnsiTerminalHandle, AnsiAPIOptions }
