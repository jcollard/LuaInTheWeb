/**
 * Utility functions for the virtual file system
 */

import type { FileSystemState, SerializedState, VirtualFile } from './fileSystemTypes'

export const STORAGE_KEY = 'lua-ide-filesystem'
export const DEBOUNCE_MS = 300

// Invalid characters for file/folder names (Windows + Unix restrictions)
const INVALID_CHARS_REGEX = /[\\:*?"<>|]/

export function validateFileName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Invalid file name: name cannot be empty')
  }
  if (INVALID_CHARS_REGEX.test(name)) {
    throw new Error(`Invalid file name: contains forbidden characters (\\:*?"<>|)`)
  }
}

export function getFileName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

export function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length === 0 ? '/' : '/' + parts.join('/')
}

export function normalizePath(path: string): string {
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  // Remove trailing slash unless it's root
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1)
  }
  return path
}

export function loadFromStorage(): FileSystemState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { version: 1, files: {}, folders: new Set(['/']) }
    }
    const parsed: SerializedState = JSON.parse(stored)
    return {
      version: parsed.version || 1,
      files: parsed.files || {},
      folders: new Set(parsed.folders || ['/']),
    }
  } catch {
    return { version: 1, files: {}, folders: new Set(['/']) }
  }
}

export function saveToStorage(state: FileSystemState): void {
  const serialized: SerializedState = {
    version: state.version,
    files: state.files,
    folders: Array.from(state.folders),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
}

/**
 * Build a tree structure from file and folder collections
 */
export function buildTree(
  files: Record<string, VirtualFile>,
  folders: Set<string>,
  dirPath: string
): import('./fileSystemTypes').TreeNode[] {
  const nodes: import('./fileSystemTypes').TreeNode[] = []

  // Collect files in this directory
  for (const [filePath, file] of Object.entries(files)) {
    const parentPath = getParentPath(filePath)
    if (parentPath === dirPath) {
      nodes.push({
        name: file.name,
        path: filePath,
        type: 'file',
      })
    }
  }

  // Collect folders in this directory
  for (const folderPath of folders) {
    if (folderPath === '/') continue // Skip root
    const parentPath = getParentPath(folderPath)
    if (parentPath === dirPath) {
      nodes.push({
        name: getFileName(folderPath),
        path: folderPath,
        type: 'folder',
        children: buildTree(files, folders, folderPath),
      })
    }
  }

  // Sort: folders first, then alphabetically
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}
