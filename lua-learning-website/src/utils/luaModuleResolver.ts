/**
 * Module path resolver for Lua require statements.
 * Matches the resolution logic used in the runtime (LuaEngineFactory).
 */

/**
 * Options for resolving a module path.
 */
export interface ModuleResolverOptions {
  /** Module name from require statement (e.g., "utils" or "lib.helpers") */
  moduleName: string
  /** Absolute path to the current file (e.g., "/home/main.lua") */
  currentFilePath: string
  /** Function to check if a file exists at a given path */
  fileExists: (path: string) => boolean
}

/**
 * Result of module resolution.
 */
export interface ResolvedModule {
  /** Resolved absolute path to the module file */
  path: string
  /** Original module name */
  moduleName: string
}

/**
 * Get the directory portion of a file path.
 * @param filePath - Full file path (e.g., "/home/user/script.lua")
 * @returns Directory path (e.g., "/home/user")
 */
function getDirectoryFromPath(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/')
  if (lastSlash <= 0) return '/'
  return filePath.substring(0, lastSlash)
}

/**
 * Join path segments into a single path.
 * Handles leading/trailing slashes correctly.
 * @param segments - Path segments to join
 * @returns Joined path
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
 * Resolve a module name to an absolute file path.
 *
 * Resolution order (matches runtime require behavior):
 * 1. {scriptDir}/{modulePath}.lua
 * 2. {scriptDir}/{modulePath}/init.lua
 * 3. /{modulePath}.lua (root fallback)
 * 4. /{modulePath}/init.lua (root fallback)
 *
 * @param options - Resolution options
 * @returns Resolved module info, or null if not found
 *
 * @example
 * // Simple module in same directory
 * resolveModulePath({
 *   moduleName: 'utils',
 *   currentFilePath: '/home/main.lua',
 *   fileExists: (p) => p === '/home/utils.lua'
 * })
 * // Returns: { path: '/home/utils.lua', moduleName: 'utils' }
 *
 * @example
 * // Nested module with dot notation
 * resolveModulePath({
 *   moduleName: 'lib.helpers',
 *   currentFilePath: '/home/main.lua',
 *   fileExists: (p) => p === '/home/lib/helpers.lua'
 * })
 * // Returns: { path: '/home/lib/helpers.lua', moduleName: 'lib.helpers' }
 */
export function resolveModulePath(
  options: ModuleResolverOptions
): ResolvedModule | null {
  const { moduleName, currentFilePath, fileExists } = options

  // Get the directory of the current file
  const baseDir = getDirectoryFromPath(currentFilePath)

  // Convert module name to relative path
  // Support both "lib/utils" and "lib.utils" formats
  const modulePath = moduleName.replace(/\./g, '/')

  // Try relative to current file's directory first
  const relativePath = joinPath(baseDir, modulePath + '.lua')
  if (fileExists(relativePath)) {
    return { path: relativePath, moduleName }
  }

  // Try init.lua for package directories
  const initPath = joinPath(baseDir, modulePath, 'init.lua')
  if (fileExists(initPath)) {
    return { path: initPath, moduleName }
  }

  // Fall back to root if different from base
  if (baseDir !== '/') {
    const rootPath = '/' + modulePath + '.lua'
    if (fileExists(rootPath)) {
      return { path: rootPath, moduleName }
    }

    // Try root init.lua
    const rootInitPath = '/' + modulePath + '/init.lua'
    if (fileExists(rootInitPath)) {
      return { path: rootInitPath, moduleName }
    }
  }

  return null
}
