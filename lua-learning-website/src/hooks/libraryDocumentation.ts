/**
 * Library source code generators for the library workspace.
 *
 * Extracted from workspaceManagerHelpers to keep file size manageable.
 * Note: Documentation is now served from static files in public/docs/.
 */

import { LUA_SHELL_CODE, LUA_CANVAS_CODE } from '@lua-learning/lua-runtime'

/**
 * Generate a clean version of the shell library source code for display.
 * This reformats the embedded Lua code for better readability.
 */
export function generateShellLibrarySource(): string {
  // Add a header comment and clean up the source
  return `-- shell.lua - Terminal control library
-- Load with: local shell = require('shell')
--
-- This library provides functions for terminal control including
-- colors, cursor movement, and screen management.

${LUA_SHELL_CODE.trim()}
`
}

/**
 * Generate a clean version of the canvas library source code for display.
 * This reformats the embedded Lua code for better readability.
 */
export function generateCanvasLibrarySource(): string {
  // Add a header comment and clean up the source
  return `-- canvas.lua - Canvas Graphics Library
-- Load with: local canvas = require('canvas')
--
-- This library provides functions for 2D graphics rendering,
-- input handling, and game loop management.
-- Note: The canvas API is only available in canvas mode.

${LUA_CANVAS_CODE.trim()}
`
}
