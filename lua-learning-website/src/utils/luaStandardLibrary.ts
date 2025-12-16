/**
 * Lua 5.4 Standard Library Documentation
 * Documentation derived from the official Lua 5.4 Reference Manual
 */

import {
  luaGlobalFunctions,
  stringLibrary,
  tableLibrary,
  mathLibrary,
} from './luaStdlibDocs'

export interface LuaDocEntry {
  name: string
  signature: string
  description: string
  library?: string
}

// Combined lookup table
const allDocumentation: Record<string, LuaDocEntry> = {
  ...luaGlobalFunctions,
  ...stringLibrary,
  ...tableLibrary,
  ...mathLibrary,
}

/**
 * Gets documentation for a Lua standard library function
 * @param name The function name (e.g., "print", "string.sub", "table.insert")
 * @returns The documentation entry or null if not found
 */
export function getLuaDocumentation(name: string): LuaDocEntry | null {
  if (!name) {
    return null
  }
  return allDocumentation[name] ?? null
}
