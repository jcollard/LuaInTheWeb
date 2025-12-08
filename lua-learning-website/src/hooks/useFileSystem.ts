import { useState, useCallback, useEffect, useRef } from 'react'

// Types
export interface VirtualFile {
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
}

interface FileSystemState {
  version: number
  files: Record<string, VirtualFile>
  folders: Set<string>
}

export interface UseFileSystemReturn {
  // File operations
  createFile: (path: string, content?: string) => void
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => void
  deleteFile: (path: string) => void
  renameFile: (oldPath: string, newPath: string) => void

  // Folder operations
  createFolder: (path: string) => void
  deleteFolder: (path: string) => void
  renameFolder: (oldPath: string, newPath: string) => void

  // Utilities
  exists: (path: string) => boolean
  listDirectory: (path: string) => string[]
  getTree: () => TreeNode[]
}

const STORAGE_KEY = 'lua-ide-filesystem'
const DEBOUNCE_MS = 300

// Invalid characters for file/folder names (Windows + Unix restrictions)
const INVALID_CHARS_REGEX = /[\\:*?"<>|]/

function validateFileName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Invalid file name: name cannot be empty')
  }
  if (INVALID_CHARS_REGEX.test(name)) {
    throw new Error(`Invalid file name: contains forbidden characters (\\:*?"<>|)`)
  }
}

function getFileName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length === 0 ? '/' : '/' + parts.join('/')
}

function normalizePath(path: string): string {
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

interface SerializedState {
  version: number
  files: Record<string, VirtualFile>
  folders?: string[]
}

function loadFromStorage(): FileSystemState {
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

function saveToStorage(state: FileSystemState): void {
  const serialized: SerializedState = {
    version: state.version,
    files: state.files,
    folders: Array.from(state.folders),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
}

export function useFileSystem(): UseFileSystemReturn {
  const [state, setState] = useState<FileSystemState>(() => loadFromStorage())
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced save to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(state)
    }, DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state])

  const exists = useCallback(
    (path: string): boolean => {
      const normalizedPath = normalizePath(path)
      return normalizedPath in state.files || state.folders.has(normalizedPath)
    },
    [state.files, state.folders]
  )

  const createFile = useCallback(
    (path: string, content: string = ''): void => {
      const normalizedPath = normalizePath(path)
      const fileName = getFileName(normalizedPath)

      validateFileName(fileName)

      if (normalizedPath in state.files || state.folders.has(normalizedPath)) {
        throw new Error(`File already exists: ${normalizedPath}`)
      }

      // Ensure parent folder exists
      const parentPath = getParentPath(normalizedPath)
      if (parentPath !== '/' && !state.folders.has(parentPath)) {
        throw new Error(`Parent folder not found: ${parentPath}`)
      }

      const now = Date.now()
      setState((prev) => ({
        ...prev,
        version: prev.version + 1,
        files: {
          ...prev.files,
          [normalizedPath]: {
            name: fileName,
            content,
            createdAt: now,
            updatedAt: now,
          },
        },
      }))
    },
    [state.files, state.folders]
  )

  const readFile = useCallback(
    (path: string): string | null => {
      const normalizedPath = normalizePath(path)
      const file = state.files[normalizedPath]
      return file ? file.content : null
    },
    [state.files]
  )

  const writeFile = useCallback(
    (path: string, content: string): void => {
      const normalizedPath = normalizePath(path)

      if (!(normalizedPath in state.files)) {
        throw new Error(`File not found: ${normalizedPath}`)
      }

      setState((prev) => ({
        ...prev,
        version: prev.version + 1,
        files: {
          ...prev.files,
          [normalizedPath]: {
            ...prev.files[normalizedPath],
            content,
            updatedAt: Date.now(),
          },
        },
      }))
    },
    [state.files]
  )

  const deleteFile = useCallback(
    (path: string): void => {
      const normalizedPath = normalizePath(path)

      if (!(normalizedPath in state.files)) {
        throw new Error(`File not found: ${normalizedPath}`)
      }

      setState((prev) => {
        const newFiles = { ...prev.files }
        delete newFiles[normalizedPath]
        return {
          ...prev,
          version: prev.version + 1,
          files: newFiles,
        }
      })
    },
    [state.files]
  )

  const renameFile = useCallback(
    (oldPath: string, newPath: string): void => {
      const normalizedOldPath = normalizePath(oldPath)
      const normalizedNewPath = normalizePath(newPath)

      if (!(normalizedOldPath in state.files)) {
        throw new Error(`File not found: ${normalizedOldPath}`)
      }

      if (normalizedNewPath in state.files || state.folders.has(normalizedNewPath)) {
        throw new Error(`Target already exists: ${normalizedNewPath}`)
      }

      const newFileName = getFileName(normalizedNewPath)
      validateFileName(newFileName)

      setState((prev) => {
        const file = prev.files[normalizedOldPath]
        const newFiles = { ...prev.files }
        delete newFiles[normalizedOldPath]
        newFiles[normalizedNewPath] = {
          ...file,
          name: newFileName,
          updatedAt: Date.now(),
        }
        return {
          ...prev,
          version: prev.version + 1,
          files: newFiles,
        }
      })
    },
    [state.files, state.folders]
  )

  const createFolder = useCallback(
    (path: string): void => {
      const normalizedPath = normalizePath(path)
      const folderName = getFileName(normalizedPath)

      validateFileName(folderName)

      if (normalizedPath in state.files || state.folders.has(normalizedPath)) {
        throw new Error(`Folder already exists: ${normalizedPath}`)
      }

      // Ensure parent folder exists
      const parentPath = getParentPath(normalizedPath)
      if (parentPath !== '/' && !state.folders.has(parentPath)) {
        throw new Error(`Parent folder not found: ${parentPath}`)
      }

      setState((prev) => {
        const newFolders = new Set(prev.folders)
        newFolders.add(normalizedPath)
        return {
          ...prev,
          version: prev.version + 1,
          folders: newFolders,
        }
      })
    },
    [state.files, state.folders]
  )

  const deleteFolder = useCallback(
    (path: string): void => {
      const normalizedPath = normalizePath(path)

      if (!state.folders.has(normalizedPath)) {
        throw new Error(`Folder not found: ${normalizedPath}`)
      }

      setState((prev) => {
        // Remove all files and folders under this path
        const newFiles = { ...prev.files }
        const newFolders = new Set(prev.folders)

        // Remove all files under this folder
        for (const filePath of Object.keys(newFiles)) {
          if (filePath.startsWith(normalizedPath + '/')) {
            delete newFiles[filePath]
          }
        }

        // Remove all subfolders
        for (const folderPath of newFolders) {
          if (folderPath === normalizedPath || folderPath.startsWith(normalizedPath + '/')) {
            newFolders.delete(folderPath)
          }
        }

        return {
          ...prev,
          version: prev.version + 1,
          files: newFiles,
          folders: newFolders,
        }
      })
    },
    [state.folders]
  )

  const renameFolder = useCallback(
    (oldPath: string, newPath: string): void => {
      const normalizedOldPath = normalizePath(oldPath)
      const normalizedNewPath = normalizePath(newPath)

      if (!state.folders.has(normalizedOldPath)) {
        throw new Error(`Folder not found: ${normalizedOldPath}`)
      }

      if (normalizedNewPath in state.files || state.folders.has(normalizedNewPath)) {
        throw new Error(`Target already exists: ${normalizedNewPath}`)
      }

      const newFolderName = getFileName(normalizedNewPath)
      validateFileName(newFolderName)

      setState((prev) => {
        const newFiles = { ...prev.files }
        const newFolders = new Set(prev.folders)

        // Update all file paths under this folder
        for (const filePath of Object.keys(prev.files)) {
          if (filePath.startsWith(normalizedOldPath + '/')) {
            const newFilePath = normalizedNewPath + filePath.slice(normalizedOldPath.length)
            newFiles[newFilePath] = {
              ...prev.files[filePath],
              updatedAt: Date.now(),
            }
            delete newFiles[filePath]
          }
        }

        // Update all subfolder paths
        for (const folderPath of prev.folders) {
          if (folderPath === normalizedOldPath) {
            newFolders.delete(folderPath)
            newFolders.add(normalizedNewPath)
          } else if (folderPath.startsWith(normalizedOldPath + '/')) {
            const newFolderPath = normalizedNewPath + folderPath.slice(normalizedOldPath.length)
            newFolders.delete(folderPath)
            newFolders.add(newFolderPath)
          }
        }

        return {
          ...prev,
          version: prev.version + 1,
          files: newFiles,
          folders: newFolders,
        }
      })
    },
    [state.files, state.folders]
  )

  const listDirectory = useCallback(
    (path: string): string[] => {
      const normalizedPath = normalizePath(path)
      const children: string[] = []

      // Add files in this directory
      for (const filePath of Object.keys(state.files)) {
        const parentPath = getParentPath(filePath)
        if (parentPath === normalizedPath) {
          children.push(getFileName(filePath))
        }
      }

      // Add folders in this directory
      for (const folderPath of state.folders) {
        if (folderPath === '/') continue // Skip root
        const parentPath = getParentPath(folderPath)
        if (parentPath === normalizedPath) {
          children.push(getFileName(folderPath))
        }
      }

      return children.sort()
    },
    [state.files, state.folders]
  )

  const getTree = useCallback((): TreeNode[] => {
    const buildTree = (dirPath: string): TreeNode[] => {
      const nodes: TreeNode[] = []

      // Collect files in this directory
      for (const [filePath, file] of Object.entries(state.files)) {
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
      for (const folderPath of state.folders) {
        if (folderPath === '/') continue // Skip root
        const parentPath = getParentPath(folderPath)
        if (parentPath === dirPath) {
          nodes.push({
            name: getFileName(folderPath),
            path: folderPath,
            type: 'folder',
            children: buildTree(folderPath),
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

    return buildTree('/')
  }, [state.files, state.folders])

  return {
    createFile,
    readFile,
    writeFile,
    deleteFile,
    renameFile,
    createFolder,
    deleteFolder,
    renameFolder,
    exists,
    listDirectory,
    getTree,
  }
}
