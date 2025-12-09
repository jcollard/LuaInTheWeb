import { useState, useCallback } from 'react'

const STORAGE_KEY = 'lua-ide-recent-files'
const MAX_RECENT_FILES = 10

export interface RecentFile {
  path: string
  name: string
  accessedAt: number
}

export interface UseRecentFilesReturn {
  recentFiles: RecentFile[]
  addRecentFile: (path: string) => void
  removeRecentFile: (path: string) => void
  clearRecentFiles: () => void
}

function loadFromStorage(): RecentFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveToStorage(files: RecentFile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
}

function extractFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

export function useRecentFiles(): UseRecentFilesReturn {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadFromStorage)

  const addRecentFile = useCallback((path: string) => {
    setRecentFiles(prev => {
      // Remove existing entry if present
      const filtered = prev.filter(f => f.path !== path)

      // Add new entry at the beginning
      const newFile: RecentFile = {
        path,
        name: extractFileName(path),
        accessedAt: Date.now(),
      }

      const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES)
      saveToStorage(updated)
      return updated
    })
  }, [])

  const removeRecentFile = useCallback((path: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(f => f.path !== path)
      saveToStorage(updated)
      return updated
    })
  }, [])

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([])
    saveToStorage([])
  }, [])

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
  }
}
