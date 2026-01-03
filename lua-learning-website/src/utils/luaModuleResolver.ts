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
  /**
   * Current working directory for require() resolution.
   * Searched FIRST, before currentFilePath directory, per standard Lua behavior.
   * If not provided, CWD is not searched (backward compatible).
   */
  cwd?: string
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
 * Resolution order (matches standard Lua require behavior):
 * 1. {cwd}/{modulePath}.lua (CWD first - standard Lua ./?.lua)
 * 2. {cwd}/{modulePath}/init.lua (package in CWD)
 * 3. /{modulePath}.lua (root fallback)
 * 4. /{modulePath}/init.lua (root fallback)
 *
 * NOTE: Standard Lua does NOT search relative to the current file's directory.
 * Users must use full paths like require('lib.helpers') not require('helpers').
 *
 * @param options - Resolution options
 * @returns Resolved module info, or null if not found
 *
 * @example
 * // Module in CWD
 * resolveModulePath({
 *   moduleName: 'utils',
 *   currentFilePath: '/home/main.lua',
 *   cwd: '/home',
 *   fileExists: (p) => p === '/home/utils.lua'
 * })
 * // Returns: { path: '/home/utils.lua', moduleName: 'utils' }
 *
 * @example
 * // Nested module with dot notation from root
 * resolveModulePath({
 *   moduleName: 'lib.helpers',
 *   currentFilePath: '/home/main.lua',
 *   cwd: '/',
 *   fileExists: (p) => p === '/lib/helpers.lua'
 * })
 * // Returns: { path: '/lib/helpers.lua', moduleName: 'lib.helpers' }
 */
export function resolveModulePath(
  options: ModuleResolverOptions
): ResolvedModule | null {
  const { moduleName, fileExists, cwd } = options

  // Convert module name to relative path
  // Support both "lib/utils" and "lib.utils" formats
  const modulePath = moduleName.replace(/\./g, '/')

  // Helper to try both .lua and /init.lua variants in a directory
  const tryDirectory = (dir: string): string | null => {
    // Try dir/module.lua
    const luaPath = joinPath(dir, modulePath + '.lua')
    if (fileExists(luaPath)) return luaPath
    // Try dir/module/init.lua
    const initPath = joinPath(dir, modulePath, 'init.lua')
    if (fileExists(initPath)) return initPath
    return null
  }

  // 1. Search CWD first (standard Lua ./?.lua behavior)
  if (cwd) {
    const found = tryDirectory(cwd)
    if (found) return { path: found, moduleName }
  }

  // 2. Fall back to root if different from CWD
  if (cwd !== '/') {
    const found = tryDirectory('/')
    if (found) return { path: found, moduleName }
  }

  return null
}
