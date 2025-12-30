/**
 * Read-only in-memory filesystem implementation.
 * Used for library and documentation workspaces.
 */

import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'
import { isBinaryExtension } from '../utils/binaryExtensions'

/**
 * Create a read-only in-memory filesystem for library workspaces.
 * Files can be read but not written, deleted, or created.
 * Supports nested directory structures (e.g., 'lua/string.md').
 * Optionally supports binary files.
 */
export function createReadOnlyFileSystem(
  files: Record<string, string>,
  binaryFiles?: Record<string, Uint8Array>
): IFileSystem {
  const throwReadOnly = (): never => {
    throw new Error('This file is read-only and cannot be modified.')
  }

  const binaries = binaryFiles ?? {}

  // Extract all directory paths from file paths (text and binary)
  const directories = new Set<string>([''])
  const allFilePaths = [...Object.keys(files), ...Object.keys(binaries)]
  for (const filePath of allFilePaths) {
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
      return normalized in files || normalized in binaries || directories.has(normalized)
    },
    isDirectory: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      return directories.has(normalized)
    },
    isFile: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      return normalized in files || normalized in binaries
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

      // Process text and binary files together
      for (const filePath of allFilePaths) {
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
      // Check if it's a binary file
      if (normalized in binaries) {
        throw new Error(`Cannot read binary file as text: ${path}`)
      }
      const content = files[normalized]
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    },
    writeFile: throwReadOnly,
    createDirectory: throwReadOnly,
    delete: throwReadOnly,

    // Binary file support
    isBinaryFile: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      // Check if explicitly in binaries or has binary extension
      return normalized in binaries || (normalized in files === false && isBinaryExtension(path))
    },
    readBinaryFile: (path: string) => {
      const normalized = path.startsWith('/') ? path.slice(1) : path
      const content = binaries[normalized]
      if (content === undefined) {
        // Check if it's a text file
        if (normalized in files) {
          throw new Error(`Cannot read text file as binary: ${path}`)
        }
        throw new Error(`File not found: ${path}`)
      }
      return content
    },
    writeBinaryFile: throwReadOnly,
  }
}
