/**
 * Registry for built-in Lua libraries.
 *
 * Maps library names to their Lua source code, enabling unified
 * documentation parsing for both built-in and user-created modules.
 */

import { LUA_SHELL_CODE, LUA_CANVAS_CODE, LUA_LOCALSTORAGE_CODE } from '@lua-learning/lua-runtime'

/**
 * Registry mapping library names to their Lua source code.
 */
const registry = new Map<string, string>([
  ['shell', LUA_SHELL_CODE],
  ['canvas', LUA_CANVAS_CODE],
  ['localstorage', LUA_LOCALSTORAGE_CODE],
])

/**
 * Get the Lua source code for a library.
 *
 * @param name - The library name (e.g., 'shell', 'canvas')
 * @returns The Lua source code or null if not found
 */
export function getLibrarySource(name: string): string | null {
  return registry.get(name) ?? null
}

/**
 * Check if a library is registered.
 *
 * @param name - The library name to check
 * @returns True if the library is registered
 */
export function hasLibrary(name: string): boolean {
  return registry.has(name)
}

/**
 * Get all registered library names.
 *
 * @returns Array of library names
 */
export function getRegisteredLibraries(): string[] {
  return Array.from(registry.keys())
}
