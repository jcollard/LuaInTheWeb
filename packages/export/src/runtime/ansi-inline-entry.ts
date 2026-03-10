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
 */

import { AnsiController } from '@lua-learning/lua-runtime'
import type { AnsiCallbacks, AnsiTerminalHandle } from '@lua-learning/lua-runtime'
import { setupAnsiAPI } from '@lua-learning/lua-runtime'
import type { AnsiAPIOptions } from '@lua-learning/lua-runtime'
import { ansiLuaCode } from '@lua-learning/lua-runtime'
import { CrtShader, CRT_DEFAULTS } from '@lua-learning/lua-runtime'

// Expose globally for use in exported HTML
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).AnsiStandalone = {
  AnsiController,
  setupAnsiAPI,
  ansiLuaCode,
  CrtShader,
  CRT_DEFAULTS,
}

export type { AnsiCallbacks, AnsiTerminalHandle, AnsiAPIOptions }
