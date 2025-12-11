import { useState, useCallback, useEffect, useRef } from 'react'
import type { VirtualFile, TreeNode, FileSystemState, UseFileSystemReturn } from './fileSystemTypes'
import {
  DEBOUNCE_MS,
  validateFileName,
  getFileName,
  getParentPath,
  normalizePath,
  loadFromStorage,
  saveToStorage,
  buildTree,
} from './fileSystemUtils'

// Re-export types for backward compatibility
export type { VirtualFile, TreeNode, UseFileSystemReturn }

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

  const isDirectory = useCallback(
    (path: string): boolean => {
      const normalizedPath = normalizePath(path)
      return state.folders.has(normalizedPath)
    },
    [state.folders]
  )

  const createFile = useCallback(
    (path: string, content: string = ''): void => {
      const normalizedPath = normalizePath(path)
      const fileName = getFileName(normalizedPath)

      validateFileName(fileName)

      if (normalizedPath in state.files || state.folders.has(normalizedPath)) {
        throw new Error(`File already exists: ${normalizedPath}`)
      }

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
          [normalizedPath]: { name: fileName, content, createdAt: now, updatedAt: now },
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
          [normalizedPath]: { ...prev.files[normalizedPath], content, updatedAt: Date.now() },
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
        return { ...prev, version: prev.version + 1, files: newFiles }
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
        newFiles[normalizedNewPath] = { ...file, name: newFileName, updatedAt: Date.now() }
        return { ...prev, version: prev.version + 1, files: newFiles }
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

      const parentPath = getParentPath(normalizedPath)
      if (parentPath !== '/' && !state.folders.has(parentPath)) {
        throw new Error(`Parent folder not found: ${parentPath}`)
      }

      setState((prev) => {
        const newFolders = new Set(prev.folders)
        newFolders.add(normalizedPath)
        return { ...prev, version: prev.version + 1, folders: newFolders }
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
        const newFiles = { ...prev.files }
        const newFolders = new Set(prev.folders)

        for (const filePath of Object.keys(newFiles)) {
          if (filePath.startsWith(normalizedPath + '/')) {
            delete newFiles[filePath]
          }
        }

        for (const folderPath of newFolders) {
          if (folderPath === normalizedPath || folderPath.startsWith(normalizedPath + '/')) {
            newFolders.delete(folderPath)
          }
        }

        return { ...prev, version: prev.version + 1, files: newFiles, folders: newFolders }
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

        for (const filePath of Object.keys(prev.files)) {
          if (filePath.startsWith(normalizedOldPath + '/')) {
            const newFilePath = normalizedNewPath + filePath.slice(normalizedOldPath.length)
            newFiles[newFilePath] = { ...prev.files[filePath], updatedAt: Date.now() }
            delete newFiles[filePath]
          }
        }

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

        return { ...prev, version: prev.version + 1, files: newFiles, folders: newFolders }
      })
    },
    [state.files, state.folders]
  )

  const moveFile = useCallback(
    (sourcePath: string, targetFolderPath: string): void => {
      const normalizedSourcePath = normalizePath(sourcePath)
      const normalizedTargetFolder = normalizePath(targetFolderPath)

      const isSourceFile = normalizedSourcePath in state.files
      const isSourceFolder = state.folders.has(normalizedSourcePath)

      if (!isSourceFile && !isSourceFolder) {
        throw new Error(`Source not found: ${normalizedSourcePath}`)
      }

      if (normalizedTargetFolder !== '/' && !state.folders.has(normalizedTargetFolder)) {
        throw new Error(`Target folder not found: ${normalizedTargetFolder}`)
      }

      const itemName = getFileName(normalizedSourcePath)
      const newPath = normalizedTargetFolder === '/' ? `/${itemName}` : `${normalizedTargetFolder}/${itemName}`

      const currentParent = getParentPath(normalizedSourcePath)
      if (currentParent === normalizedTargetFolder) return // No-op

      if (isSourceFolder && (normalizedTargetFolder === normalizedSourcePath || normalizedTargetFolder.startsWith(normalizedSourcePath + '/'))) {
        throw new Error(`Cannot move folder into itself or its children`)
      }

      if (newPath in state.files || state.folders.has(newPath)) {
        throw new Error(`Target already exists: ${newPath}`)
      }

      if (isSourceFile) {
        setState((prev) => {
          const file = prev.files[normalizedSourcePath]
          const newFiles = { ...prev.files }
          delete newFiles[normalizedSourcePath]
          newFiles[newPath] = { ...file, updatedAt: Date.now() }
          return { ...prev, version: prev.version + 1, files: newFiles }
        })
      } else {
        setState((prev) => {
          const newFiles = { ...prev.files }
          const newFolders = new Set(prev.folders)

          for (const filePath of Object.keys(prev.files)) {
            if (filePath.startsWith(normalizedSourcePath + '/')) {
              const newFilePath = newPath + filePath.slice(normalizedSourcePath.length)
              newFiles[newFilePath] = { ...prev.files[filePath], updatedAt: Date.now() }
              delete newFiles[filePath]
            }
          }

          for (const folderPath of prev.folders) {
            if (folderPath === normalizedSourcePath) {
              newFolders.delete(folderPath)
              newFolders.add(newPath)
            } else if (folderPath.startsWith(normalizedSourcePath + '/')) {
              const newFolderPath = newPath + folderPath.slice(normalizedSourcePath.length)
              newFolders.delete(folderPath)
              newFolders.add(newFolderPath)
            }
          }

          return { ...prev, version: prev.version + 1, files: newFiles, folders: newFolders }
        })
      }
    },
    [state.files, state.folders]
  )

  const listDirectory = useCallback(
    (path: string): string[] => {
      const normalizedPath = normalizePath(path)
      const children: string[] = []

      for (const filePath of Object.keys(state.files)) {
        const parentPath = getParentPath(filePath)
        if (parentPath === normalizedPath) {
          children.push(getFileName(filePath))
        }
      }

      for (const folderPath of state.folders) {
        if (folderPath === '/') continue
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
    return buildTree(state.files, state.folders, '/')
  }, [state.files, state.folders])

  return {
    createFile,
    readFile,
    writeFile,
    deleteFile,
    renameFile,
    moveFile,
    createFolder,
    deleteFolder,
    renameFolder,
    exists,
    isDirectory,
    listDirectory,
    getTree,
  }
}
