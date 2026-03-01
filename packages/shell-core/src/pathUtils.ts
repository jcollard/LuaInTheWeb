/**
 * Path manipulation utilities for shell-core.
 * All paths are normalized to use forward slashes and absolute paths.
 */

/**
 * Normalize a path by:
 * - Converting backslashes to forward slashes
 * - Removing consecutive slashes
 * - Resolving . and .. segments
 * - Ensuring leading slash
 * - Removing trailing slash (except for root)
 */
export function normalizePath(path: string): string {
  if (!path) {
    return '/'
  }

  // Convert backslashes to forward slashes
  const normalized = path.replace(/\\/g, '/')

  // Split into segments
  const segments = normalized.split('/').filter((s) => s !== '')

  // Resolve . and .. segments
  const resolved: string[] = []
  for (const segment of segments) {
    if (segment === '.') {
      continue
    }
    if (segment === '..') {
      resolved.pop()
    } else {
      resolved.push(segment)
    }
  }

  // Build the result path
  const result = '/' + resolved.join('/')

  return result
}

/**
 * Join path segments into a single normalized path.
 * If any segment is absolute (starts with /), it resets the base.
 */
export function joinPath(...segments: string[]): string {
  let result = ''

  for (const segment of segments) {
    if (!segment) {
      continue
    }

    // Convert backslashes
    const normalized = segment.replace(/\\/g, '/')

    if (normalized.startsWith('/')) {
      // Absolute path resets the result
      result = normalized
    } else if (result) {
      result = result + '/' + normalized
    } else {
      result = normalized
    }
  }

  return normalizePath(result)
}

/**
 * Resolve a path relative to a base directory.
 * If the path is absolute, it's returned as-is (normalized).
 * If relative, it's joined with the base.
 */
export function resolvePath(base: string, path: string): string {
  if (isAbsolutePath(path)) {
    return normalizePath(path)
  }
  return joinPath(base, path)
}

/**
 * Check if a path is absolute (starts with /).
 */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/')
}

/**
 * Get the parent directory of a path.
 * Returns '/' for root path or root children.
 */
export function getParentPath(path: string): string {
  const normalized = normalizePath(path)

  if (normalized === '/') {
    return '/'
  }

  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash <= 0) {
    return '/'
  }

  return normalized.substring(0, lastSlash)
}

/**
 * Get the basename (last segment) of a path.
 * Returns empty string for root path.
 */
export function getBasename(path: string): string {
  const normalized = normalizePath(path)

  if (normalized === '/') {
    return ''
  }

  const lastSlash = normalized.lastIndexOf('/')
  return normalized.substring(lastSlash + 1)
}
