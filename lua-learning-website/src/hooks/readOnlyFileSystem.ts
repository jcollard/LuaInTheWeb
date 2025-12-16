/**
 * Read-only in-memory filesystem implementation.
 * Used for library and documentation workspaces.
 */

import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'

/**
 * Create a read-only in-memory filesystem for library workspaces.
 * Files can be read but not written, deleted, or created.
 * Supports nested directory structures (e.g., 'lua/string.md').
 */
export function createReadOnlyFileSystem(files: Record<string, string>): IFileSystem {
  const throwReadOnly = (): never => {
    throw new Error('This file is read-only and cannot be modified.')
  }

  // Extract all directory paths from file paths
  const directories = new Set<string>([''])
  for (const filePath of Object.keys(files)) {
    const parts = filePath.split('/')
    let currentPath = ''
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
      directories.add(currentPath)
    }
  }

  return {
    getCurrentDirectory: () => '/',
    setCurrentDirectory: () => {}, // Allow cd, but no-op
    exists: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      return normalized in files || directories.has(normalized)
    },
    isDirectory: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      return directories.has(normalized)
    },
    isFile: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      return normalized in files
    },
    listDirectory: (path: string) => {
      const normalized =
        path === '/' || path === '' ? '' : path.startsWith('/') ? path.slice(1) : path
      if (!directories.has(normalized)) {
        return []
      }

      const prefix = normalized ? `${normalized}/` : ''
      const entries: FileEntry[] = []
      const seenNames = new Set<string>()

      for (const filePath of Object.keys(files)) {
        if (normalized === '' || filePath.startsWith(prefix)) {
          const relativePath = normalized === '' ? filePath : filePath.slice(prefix.length)
          const slashIndex = relativePath.indexOf('/')
          const name = slashIndex === -1 ? relativePath : relativePath.slice(0, slashIndex)

          if (name && !seenNames.has(name)) {
            seenNames.add(name)
            const isDir = slashIndex !== -1
            entries.push({
              name,
              type: isDir ? 'directory' : 'file',
              path: `/${prefix}${name}`,
            })
          }
        }
      }

      return entries.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    },
    readFile: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      const content = files[normalized]
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    },
    writeFile: throwReadOnly,
    createDirectory: throwReadOnly,
    delete: throwReadOnly,
  }
}
