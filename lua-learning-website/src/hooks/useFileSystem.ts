/* eslint-disable max-lines */
// This hook manages all filesystem operations with synchronized refs for shell commands.
// Splitting would break the ref synchronization that enables synchronous filesystem access.
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

  // Synchronous refs to track state for immediate validation
  // This fixes the race condition where React state updates are batched/async
  // but shell commands need synchronous filesystem operations
  const filesRef = useRef<Record<string, VirtualFile>>(state.files)
  const foldersRef = useRef<Set<string>>(new Set(state.folders))

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

      // Use refs for synchronous validation
      if (normalizedPath in filesRef.current || foldersRef.current.has(normalizedPath)) {
        throw new Error(`File already exists: ${normalizedPath}`)
      }

      const parentPath = getParentPath(normalizedPath)
      if (parentPath !== '/' && !foldersRef.current.has(parentPath)) {
        throw new Error(`Parent folder not found: ${parentPath}`)
      }

      const now = Date.now()
      const newFile = { name: fileName, content, createdAt: now, updatedAt: now }

      // Update ref synchronously for immediate subsequent operations
      filesRef.current = { ...filesRef.current, [normalizedPath]: newFile }

      setState((prev) => ({
        ...prev,
        version: prev.version + 1,
        files: {
          ...prev.files,
          [normalizedPath]: newFile,
        },
      }))
    },
    []
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

      // Use ref for synchronous validation
      if (!(normalizedPath in filesRef.current)) {
        throw new Error(`File not found: ${normalizedPath}`)
      }

      // Update ref synchronously
      const newFilesRef = { ...filesRef.current }
      delete newFilesRef[normalizedPath]
      filesRef.current = newFilesRef

      setState((prev) => {
        const newFiles = { ...prev.files }
        delete newFiles[normalizedPath]
        return { ...prev, version: prev.version + 1, files: newFiles }
      })
    },
    []
  )

  const renameFile = useCallback(
    (oldPath: string, newPath: string): void => {
      const normalizedOldPath = normalizePath(oldPath)
      const normalizedNewPath = normalizePath(newPath)

      // Use refs for synchronous validation
      if (!(normalizedOldPath in filesRef.current)) {
        throw new Error(`File not found: ${normalizedOldPath}`)
      }

      if (normalizedNewPath in filesRef.current || foldersRef.current.has(normalizedNewPath)) {
        throw new Error(`Target already exists: ${normalizedNewPath}`)
      }

      const newFileName = getFileName(normalizedNewPath)
      validateFileName(newFileName)

      // Update ref synchronously
      const file = filesRef.current[normalizedOldPath]
      const newFilesRef = { ...filesRef.current }
      delete newFilesRef[normalizedOldPath]
      newFilesRef[normalizedNewPath] = { ...file, name: newFileName, updatedAt: Date.now() }
      filesRef.current = newFilesRef

      setState((prev) => {
        const prevFile = prev.files[normalizedOldPath]
        const newFiles = { ...prev.files }
        delete newFiles[normalizedOldPath]
        newFiles[normalizedNewPath] = { ...prevFile, name: newFileName, updatedAt: Date.now() }
        return { ...prev, version: prev.version + 1, files: newFiles }
      })
    },
    []
  )

  const createFolder = useCallback(
    (path: string): void => {
      const normalizedPath = normalizePath(path)
      const folderName = getFileName(normalizedPath)

      validateFileName(folderName)

      // Use refs for synchronous validation
      if (normalizedPath in filesRef.current || foldersRef.current.has(normalizedPath)) {
        throw new Error(`Folder already exists: ${normalizedPath}`)
      }

      const parentPath = getParentPath(normalizedPath)
      if (parentPath !== '/' && !foldersRef.current.has(parentPath)) {
        throw new Error(`Parent folder not found: ${parentPath}`)
      }

      // Update ref synchronously for immediate subsequent operations
      const newFoldersRef = new Set(foldersRef.current)
      newFoldersRef.add(normalizedPath)
      foldersRef.current = newFoldersRef

      setState((prev) => {
        const newFolders = new Set(prev.folders)
        newFolders.add(normalizedPath)
        return { ...prev, version: prev.version + 1, folders: newFolders }
      })
    },
    []
  )

  const deleteFolder = useCallback(
    (path: string): void => {
      const normalizedPath = normalizePath(path)

      // Use ref for synchronous validation
      if (!foldersRef.current.has(normalizedPath)) {
        throw new Error(`Folder not found: ${normalizedPath}`)
      }

      // Update refs synchronously
      const newFilesRef = { ...filesRef.current }
      const newFoldersRef = new Set(foldersRef.current)

      for (const filePath of Object.keys(newFilesRef)) {
        if (filePath.startsWith(normalizedPath + '/')) {
          delete newFilesRef[filePath]
        }
      }

      for (const folderPath of newFoldersRef) {
        if (folderPath === normalizedPath || folderPath.startsWith(normalizedPath + '/')) {
          newFoldersRef.delete(folderPath)
        }
      }

      filesRef.current = newFilesRef
      foldersRef.current = newFoldersRef

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
    []
  )

  const renameFolder = useCallback(
    (oldPath: string, newPath: string): void => {
      const normalizedOldPath = normalizePath(oldPath)
      const normalizedNewPath = normalizePath(newPath)

      // Use refs for synchronous validation
      if (!foldersRef.current.has(normalizedOldPath)) {
        throw new Error(`Folder not found: ${normalizedOldPath}`)
      }

      if (normalizedNewPath in filesRef.current || foldersRef.current.has(normalizedNewPath)) {
        throw new Error(`Target already exists: ${normalizedNewPath}`)
      }

      const newFolderName = getFileName(normalizedNewPath)
      validateFileName(newFolderName)

      // Update refs synchronously
      const newFilesRef = { ...filesRef.current }
      const newFoldersRef = new Set(foldersRef.current)

      for (const filePath of Object.keys(filesRef.current)) {
        if (filePath.startsWith(normalizedOldPath + '/')) {
          const newFilePath = normalizedNewPath + filePath.slice(normalizedOldPath.length)
          newFilesRef[newFilePath] = { ...filesRef.current[filePath], updatedAt: Date.now() }
          delete newFilesRef[filePath]
        }
      }

      for (const folderPath of foldersRef.current) {
        if (folderPath === normalizedOldPath) {
          newFoldersRef.delete(folderPath)
          newFoldersRef.add(normalizedNewPath)
        } else if (folderPath.startsWith(normalizedOldPath + '/')) {
          const newFolderPath = normalizedNewPath + folderPath.slice(normalizedOldPath.length)
          newFoldersRef.delete(folderPath)
          newFoldersRef.add(newFolderPath)
        }
      }

      filesRef.current = newFilesRef
      foldersRef.current = newFoldersRef

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
    []
  )

  const moveFile = useCallback(
    (sourcePath: string, targetFolderPath: string): void => {
      const normalizedSourcePath = normalizePath(sourcePath)
      const normalizedTargetFolder = normalizePath(targetFolderPath)

      // Use refs for synchronous validation
      const isSourceFile = normalizedSourcePath in filesRef.current
      const isSourceFolder = foldersRef.current.has(normalizedSourcePath)

      if (!isSourceFile && !isSourceFolder) {
        throw new Error(`Source not found: ${normalizedSourcePath}`)
      }

      if (normalizedTargetFolder !== '/' && !foldersRef.current.has(normalizedTargetFolder)) {
        throw new Error(`Target folder not found: ${normalizedTargetFolder}`)
      }

      const itemName = getFileName(normalizedSourcePath)
      const newPath = normalizedTargetFolder === '/' ? `/${itemName}` : `${normalizedTargetFolder}/${itemName}`

      const currentParent = getParentPath(normalizedSourcePath)
      if (currentParent === normalizedTargetFolder) return // No-op

      if (isSourceFolder && (normalizedTargetFolder === normalizedSourcePath || normalizedTargetFolder.startsWith(normalizedSourcePath + '/'))) {
        throw new Error(`Cannot move folder into itself or its children`)
      }

      if (newPath in filesRef.current || foldersRef.current.has(newPath)) {
        throw new Error(`Target already exists: ${newPath}`)
      }

      if (isSourceFile) {
        // Update ref synchronously
        const file = filesRef.current[normalizedSourcePath]
        const newFilesRef = { ...filesRef.current }
        delete newFilesRef[normalizedSourcePath]
        newFilesRef[newPath] = { ...file, updatedAt: Date.now() }
        filesRef.current = newFilesRef

        setState((prev) => {
          const prevFile = prev.files[normalizedSourcePath]
          const newFiles = { ...prev.files }
          delete newFiles[normalizedSourcePath]
          newFiles[newPath] = { ...prevFile, updatedAt: Date.now() }
          return { ...prev, version: prev.version + 1, files: newFiles }
        })
      } else {
        // Update refs synchronously for folder move
        const newFilesRef = { ...filesRef.current }
        const newFoldersRef = new Set(foldersRef.current)

        for (const filePath of Object.keys(filesRef.current)) {
          if (filePath.startsWith(normalizedSourcePath + '/')) {
            const newFilePath = newPath + filePath.slice(normalizedSourcePath.length)
            newFilesRef[newFilePath] = { ...filesRef.current[filePath], updatedAt: Date.now() }
            delete newFilesRef[filePath]
          }
        }

        for (const folderPath of foldersRef.current) {
          if (folderPath === normalizedSourcePath) {
            newFoldersRef.delete(folderPath)
            newFoldersRef.add(newPath)
          } else if (folderPath.startsWith(normalizedSourcePath + '/')) {
            const newFolderPath = newPath + folderPath.slice(normalizedSourcePath.length)
            newFoldersRef.delete(folderPath)
            newFoldersRef.add(newFolderPath)
          }
        }

        filesRef.current = newFilesRef
        foldersRef.current = newFoldersRef

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
    []
  )

  const copyFile = useCallback(
    (sourcePath: string, targetFolderPath: string): void => {
      const normalizedSourcePath = normalizePath(sourcePath)
      const normalizedTargetFolder = normalizePath(targetFolderPath)

      // Use refs for synchronous validation
      const isSourceFile = normalizedSourcePath in filesRef.current
      const isSourceFolder = foldersRef.current.has(normalizedSourcePath)

      if (!isSourceFile && !isSourceFolder) {
        throw new Error(`Source not found: ${normalizedSourcePath}`)
      }

      if (normalizedTargetFolder !== '/' && !foldersRef.current.has(normalizedTargetFolder)) {
        throw new Error(`Target folder not found: ${normalizedTargetFolder}`)
      }

      const itemName = getFileName(normalizedSourcePath)
      const newPath = normalizedTargetFolder === '/' ? `/${itemName}` : `${normalizedTargetFolder}/${itemName}`

      if (newPath in filesRef.current || foldersRef.current.has(newPath)) {
        throw new Error(`Target already exists: ${newPath}`)
      }

      if (isSourceFile) {
        // Copy file - create new file with same content
        const file = filesRef.current[normalizedSourcePath]
        const now = Date.now()
        const newFile = { name: itemName, content: file.content, createdAt: now, updatedAt: now }

        // Update ref synchronously
        filesRef.current = { ...filesRef.current, [newPath]: newFile }

        setState((prev) => ({
          ...prev,
          version: prev.version + 1,
          files: { ...prev.files, [newPath]: newFile },
        }))
      } else {
        // Copy folder - recursively copy all contents
        const newFilesRef = { ...filesRef.current }
        const newFoldersRef = new Set(foldersRef.current)
        const now = Date.now()

        // Add the target folder
        newFoldersRef.add(newPath)

        // Copy all nested folders
        for (const folderPath of foldersRef.current) {
          if (folderPath.startsWith(normalizedSourcePath + '/')) {
            const newFolderPath = newPath + folderPath.slice(normalizedSourcePath.length)
            newFoldersRef.add(newFolderPath)
          }
        }

        // Copy all nested files
        for (const filePath of Object.keys(filesRef.current)) {
          if (filePath.startsWith(normalizedSourcePath + '/')) {
            const newFilePath = newPath + filePath.slice(normalizedSourcePath.length)
            const file = filesRef.current[filePath]
            newFilesRef[newFilePath] = { ...file, createdAt: now, updatedAt: now }
          }
        }

        filesRef.current = newFilesRef
        foldersRef.current = newFoldersRef

        setState((prev) => {
          const newFiles = { ...prev.files }
          const newFolders = new Set(prev.folders)

          // Add the target folder
          newFolders.add(newPath)

          // Copy all nested folders
          for (const folderPath of prev.folders) {
            if (folderPath.startsWith(normalizedSourcePath + '/')) {
              const newFolderPath = newPath + folderPath.slice(normalizedSourcePath.length)
              newFolders.add(newFolderPath)
            }
          }

          // Copy all nested files
          for (const filePath of Object.keys(prev.files)) {
            if (filePath.startsWith(normalizedSourcePath + '/')) {
              const newFilePath = newPath + filePath.slice(normalizedSourcePath.length)
              const file = prev.files[filePath]
              newFiles[newFilePath] = { ...file, createdAt: now, updatedAt: now }
            }
          }

          return { ...prev, version: prev.version + 1, files: newFiles, folders: newFolders }
        })
      }
    },
    []
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
    copyFile,
    createFolder,
    deleteFolder,
    renameFolder,
    exists,
    isDirectory,
    listDirectory,
    getTree,
  }
}
