import { useState, useEffect, useCallback, type FormEvent } from 'react'
import type { CloneTargetType } from './types'

export interface UseCloneProjectFormParams {
  isOpen: boolean
  projectName: string
  isFileSystemAccessSupported: boolean
  onClone: (name: string, type: CloneTargetType, handle?: FileSystemDirectoryHandle) => void
  onCancel: () => void
  isFolderAlreadyMounted?: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  getUniqueWorkspaceName?: (baseName: string) => string
}

export interface UseCloneProjectFormReturn {
  cloneType: CloneTargetType
  workspaceName: string
  selectedHandle: FileSystemDirectoryHandle | null
  error: string | null
  isSelectingFolder: boolean
  isFormValid: boolean
  setWorkspaceName: (name: string) => void
  handleSelectFolder: () => Promise<void>
  handleSubmit: (event?: FormEvent) => void
  handleKeyDown: (event: { key: string; preventDefault: () => void }) => void
  handleTypeChange: (type: CloneTargetType) => void
}

export function useCloneProjectForm({
  isOpen,
  projectName,
  isFileSystemAccessSupported,
  onClone,
  onCancel,
  isFolderAlreadyMounted,
  getUniqueWorkspaceName,
}: UseCloneProjectFormParams): UseCloneProjectFormReturn {
  const defaultType: CloneTargetType = isFileSystemAccessSupported ? 'local' : 'virtual'
  const [cloneType, setCloneType] = useState<CloneTargetType>(defaultType)
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      const type = isFileSystemAccessSupported ? 'local' : 'virtual'
      setCloneType(type)
      const uniqueName = getUniqueWorkspaceName
        ? getUniqueWorkspaceName(projectName)
        : projectName
      setWorkspaceName(uniqueName)
      setSelectedHandle(null)
      setError(null)
      setIsSelectingFolder(false)
    }
  // Stryker disable next-line all: React hooks dependency optimization
  }, [isOpen, projectName, isFileSystemAccessSupported, getUniqueWorkspaceName])

  const isFormValid = cloneType === 'virtual'
    ? workspaceName.trim().length > 0
    : selectedHandle !== null && workspaceName.trim().length > 0

  const handleSelectFolder = useCallback(async () => {
    setError(null)
    setIsSelectingFolder(true)

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })

      if (isFolderAlreadyMounted) {
        const isDuplicate = await isFolderAlreadyMounted(handle)
        if (isDuplicate) {
          setError('This folder is already mounted as a workspace.')
          setIsSelectingFolder(false)
          return
        }
      }

      setSelectedHandle(handle)

      const baseName = handle.name
      const uniqueName = getUniqueWorkspaceName
        ? getUniqueWorkspaceName(baseName)
        : baseName
      setWorkspaceName(uniqueName)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to select folder. Please try again.')
      }
    } finally {
      setIsSelectingFolder(false)
    }
  // Stryker disable next-line all: React hooks dependency optimization
  }, [isFolderAlreadyMounted, getUniqueWorkspaceName])

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      if (!isFormValid) return

      const trimmedName = workspaceName.trim()
      if (cloneType === 'virtual') {
        onClone(trimmedName, 'virtual')
      } else if (selectedHandle) {
        onClone(trimmedName, 'local', selectedHandle)
      }
    },
    // Stryker disable next-line all: React hooks dependency optimization
    [cloneType, workspaceName, selectedHandle, isFormValid, onClone]
  )

  const handleKeyDown = useCallback(
    (event: { key: string; preventDefault: () => void }) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    },
    // Stryker disable next-line all: React hooks dependency optimization
    [onCancel]
  )

  // Stryker disable next-line all: React hooks dependency optimization
  const handleTypeChange = useCallback((type: CloneTargetType) => {
    setCloneType(type)
    if (type === 'virtual') {
      setSelectedHandle(null)
    }
    setError(null)
  }, [])

  return {
    cloneType,
    workspaceName,
    selectedHandle,
    error,
    isSelectingFolder,
    isFormValid,
    setWorkspaceName,
    handleSelectFolder,
    handleSubmit,
    handleKeyDown,
    handleTypeChange,
  }
}
