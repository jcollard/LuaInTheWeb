/**
 * Resolve a path relative to a base directory
 * Handles ., .., absolute paths, and ~
 */
export function resolvePath(basePath: string, targetPath: string): string {
  // Handle home shortcut
  if (targetPath === '~' || targetPath === '') {
    return '/';
  }

  // Handle absolute paths
  if (targetPath.startsWith('/')) {
    return normalizePath(targetPath);
  }

  // Handle relative paths
  const base = basePath === '/' ? '' : basePath;
  const combined = `${base}/${targetPath}`;
  return normalizePath(combined);
}

/**
 * Normalize a path by resolving . and .. components
 */
export function normalizePath(path: string): string {
  const parts = path.split('/').filter((p) => p !== '' && p !== '.');
  const result: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      // Go up one level (pop from result) if possible
      if (result.length > 0) {
        result.pop();
      }
    } else {
      result.push(part);
    }
  }

  return '/' + result.join('/');
}

/**
 * Get the parent directory of a path
 */
export function getParentPath(path: string): string {
  if (path === '/') {
    return '/';
  }
  const parts = path.split('/').filter((p) => p !== '');
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  const joined = segments.join('/');
  return normalizePath(joined);
}
