/**
 * Documentation for Lua library modules (like shell, canvas).
 *
 * This module provides documentation lookup for functions and fields
 * in library modules that can be required via `require('modulename')`.
 *
 * Documentation is dynamically parsed from the Lua source files using
 * the same parser used for user modules.
 */

import { getLibrarySource, getRegisteredLibraries } from './luaLibraryRegistry'
import { parseLuaDocComments, type UserFunctionDoc } from './luaDocParser'

/**
 * Documentation entry for a library member (function or field).
 */
export interface LibraryDocEntry {
  /** The member name (e.g., 'clear', 'foreground') */
  name: string
  /** The function/field signature */
  signature: string
  /** Description of what the member does */
  description: string
  /** The library this belongs to (e.g., 'shell') */
  library: string
  /** Parameter documentation if this is a function */
  params?: Array<{ name: string; description: string }>
  /** Return value documentation */
  returns?: string
}

/**
 * Cache for parsed library documentation.
 * Maps library name to a map of member name -> doc entry.
 */
const libraryDocCache = new Map<string, Map<string, LibraryDocEntry>>()

/**
 * Extract the member name from a qualified function name.
 * e.g., 'shell.clear' -> 'clear', 'canvas.assets.image' -> 'assets.image'
 */
function extractMemberName(fullName: string, libraryName: string): string {
  const prefix = `${libraryName}.`
  if (fullName.startsWith(prefix)) {
    return fullName.slice(prefix.length)
  }
  return fullName
}

/**
 * Convert a UserFunctionDoc to a LibraryDocEntry.
 */
function toLibraryDocEntry(doc: UserFunctionDoc, libraryName: string): LibraryDocEntry {
  const memberName = extractMemberName(doc.name, libraryName)
  return {
    name: memberName,
    signature: doc.signature,
    description: doc.description,
    library: libraryName,
    params: doc.params,
    returns: doc.returns,
  }
}

/**
 * Parse and cache documentation for a library.
 */
function parseLibraryDocs(libraryName: string): Map<string, LibraryDocEntry> | null {
  // Check cache first
  const cached = libraryDocCache.get(libraryName)
  if (cached) {
    return cached
  }

  // Get the source code
  const source = getLibrarySource(libraryName)
  if (!source) {
    return null
  }

  // Parse the documentation
  const userDocs = parseLuaDocComments(source)

  // Convert to LibraryDocEntry format and index by member name
  const docMap = new Map<string, LibraryDocEntry>()
  for (const doc of userDocs) {
    const entry = toLibraryDocEntry(doc, libraryName)
    docMap.set(entry.name, entry)
  }

  // Cache and return
  libraryDocCache.set(libraryName, docMap)
  return docMap
}

/**
 * Get the list of available libraries with documentation.
 *
 * @returns Array of library names
 */
export function getAvailableLibraries(): string[] {
  return getRegisteredLibraries()
}

/**
 * Get documentation for a library member.
 *
 * @param libraryName - The library name (e.g., 'shell')
 * @param memberName - The member name (e.g., 'foreground', 'RED')
 * @returns The documentation entry or null if not found
 */
export function getLibraryDocumentation(
  libraryName: string,
  memberName: string
): LibraryDocEntry | null {
  const docs = parseLibraryDocs(libraryName)
  if (!docs) {
    return null
  }

  return docs.get(memberName) ?? null
}
