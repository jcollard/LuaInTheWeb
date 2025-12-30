import { useState, useCallback, useRef } from 'react'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'
import type { AdaptedFileSystem } from '../../hooks/compositeFileSystemAdapter'
import {
  processFileUploadBatch,
  findConflictingFiles,
  processFolderUploadBatch,
  findFolderConflictingFiles,
} from '../FileExplorer/uploadHandler'

export interface FolderUploadProgress {
  current: number
  total: number
  currentFile?: string
}

export interface UseUploadHandlerParams {
  /** The active filesystem (external or internal) */
  filesystem: UseFileSystemReturn | AdaptedFileSystem
  /** External filesystem if provided (for workspace integration) */
  externalFileSystem?: AdaptedFileSystem
  /** Internal filesystem (for batch mode optimization) */
  internalFilesystem: UseFileSystemReturn
  /** Show toast notification */
  showToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void
  /** Show error toast */
  showError: (message: string) => void
  /** Callback to refresh the file tree */
  onTreeRefresh: () => void
}

export interface UseUploadHandlerReturn {
  // Public API (exposed to IDEContext consumers)
  uploadFiles: (files: FileList, targetFolderPath: string) => Promise<void>
  uploadFolder: (files: FileList, targetFolderPath: string) => Promise<void>

  // Dialog state (for rendering UploadConflictDialog)
  uploadConflictDialogOpen: boolean
  conflictingFileNames: string[]
  handleUploadConflictConfirm: () => Promise<void>
  handleUploadConflictCancel: () => void

  // Modal state (for rendering LoadingModal)
  folderUploadModalOpen: boolean
  folderUploadProgress: FolderUploadProgress | undefined
  handleFolderUploadCancel: () => void
}

export function useUploadHandler({
  filesystem,
  externalFileSystem,
  internalFilesystem,
  showToast,
  showError,
  onTreeRefresh,
}: UseUploadHandlerParams): UseUploadHandlerReturn {
  // Upload conflict dialog state
  const [uploadConflictDialogOpen, setUploadConflictDialogOpen] = useState(false)
  const [conflictingFileNames, setConflictingFileNames] = useState<string[]>([])
  const pendingUploadRef = useRef<{ files: FileList; targetFolderPath: string } | null>(null)

  // Folder upload loading modal state
  const [folderUploadModalOpen, setFolderUploadModalOpen] = useState(false)
  const [folderUploadProgress, setFolderUploadProgress] = useState<FolderUploadProgress | undefined>(undefined)
  const folderUploadCancelledRef = useRef(false)
  const pendingFolderUploadRef = useRef<{ files: FileList; targetFolderPath: string } | null>(null)

  // Execute a file upload batch
  const executeUploadBatch = useCallback(async (files: FileList, targetFolderPath: string) => {
    await processFileUploadBatch({
      files,
      targetFolderPath,
      pathExists: (path) => filesystem.exists(path),
      writeTextFile: (path, content) => filesystem.writeFile(path, content),
      writeBinaryFile: (path, content) => filesystem.writeBinaryFile(path, content),
      openConfirmDialog: () => {
        // Individual file conflicts are handled by batch-level conflict dialog
      },
      closeConfirmDialog: () => {},
      onComplete: async () => {
        await filesystem.flush()
        onTreeRefresh()
      },
      onError: (fileName, error) => {
        showError(`Failed to upload ${fileName}: ${error}`)
      },
    })
  }, [filesystem, showError, onTreeRefresh])

  // Execute a folder upload batch with progress tracking
  const executeFolderUploadBatch = useCallback(async (files: FileList, targetFolderPath: string) => {
    folderUploadCancelledRef.current = false
    setFolderUploadProgress({ current: 0, total: files.length })
    setFolderUploadModalOpen(true)

    // Use silent batch functions for internal filesystem to avoid re-renders
    const useBatchMode = !externalFileSystem && internalFilesystem

    await processFolderUploadBatch({
      files,
      targetFolderPath,
      pathExists: (path) => filesystem.exists(path),
      writeTextFile: useBatchMode
        ? (path, content) => internalFilesystem.createFileSilent(path, content)
        : (path, content) => filesystem.writeFile(path, content),
      writeBinaryFile: useBatchMode
        ? (path, content) => internalFilesystem.writeBinaryFileSilent(path, content)
        : (path, content) => filesystem.writeBinaryFile(path, content),
      createDirectory: useBatchMode
        ? (path) => internalFilesystem.createFolderSilent(path)
        : (path) => filesystem.createFolder(path),
      commitBatch: useBatchMode ? () => internalFilesystem.commitBatch() : undefined,
      cancelledRef: folderUploadCancelledRef,
      onProgress: (current, total, currentFile) => {
        setFolderUploadProgress({ current, total, currentFile })
      },
      onComplete: async ({ success, failed, cancelled }) => {
        setFolderUploadModalOpen(false)
        setFolderUploadProgress(undefined)

        await filesystem.flush()
        onTreeRefresh()

        if (cancelled) {
          showToast({ message: `Upload cancelled. ${success} files uploaded.`, type: 'info' })
        } else if (failed > 0) {
          showToast({ message: `Upload complete. ${success} succeeded, ${failed} failed.`, type: 'error' })
        } else {
          showToast({ message: `Successfully uploaded ${success} files.`, type: 'success' })
        }
      },
      onError: (fileName, error) => {
        console.error(`Failed to upload ${fileName}: ${error}`)
      },
    })
  }, [filesystem, showToast, externalFileSystem, internalFilesystem, onTreeRefresh])

  // Handle conflict dialog confirm
  const handleUploadConflictConfirm = useCallback(async () => {
    const pendingFolder = pendingFolderUploadRef.current
    if (pendingFolder) {
      setUploadConflictDialogOpen(false)
      setConflictingFileNames([])
      await executeFolderUploadBatch(pendingFolder.files, pendingFolder.targetFolderPath)
      pendingFolderUploadRef.current = null
      return
    }

    const pending = pendingUploadRef.current
    if (pending) {
      setUploadConflictDialogOpen(false)
      setConflictingFileNames([])
      await executeUploadBatch(pending.files, pending.targetFolderPath)
      pendingUploadRef.current = null
    }
  }, [executeUploadBatch, executeFolderUploadBatch])

  // Handle conflict dialog cancel
  const handleUploadConflictCancel = useCallback(() => {
    setUploadConflictDialogOpen(false)
    setConflictingFileNames([])
    pendingUploadRef.current = null
    pendingFolderUploadRef.current = null
  }, [])

  // Upload files to a target folder
  const uploadFiles = useCallback(async (files: FileList, targetFolderPath: string) => {
    const conflicts = findConflictingFiles(files, targetFolderPath, (path) => filesystem.exists(path))

    if (conflicts.length > 0) {
      pendingUploadRef.current = { files, targetFolderPath }
      setConflictingFileNames(conflicts)
      setUploadConflictDialogOpen(true)
    } else {
      await executeUploadBatch(files, targetFolderPath)
    }
  }, [filesystem, executeUploadBatch])

  // Handle cancel button on loading modal
  const handleFolderUploadCancel = useCallback(() => {
    folderUploadCancelledRef.current = true
  }, [])

  // Upload folder to a target folder
  const uploadFolder = useCallback(async (files: FileList, targetFolderPath: string) => {
    const conflicts = findFolderConflictingFiles(files, targetFolderPath, (path) => filesystem.exists(path))

    if (conflicts.length > 0) {
      pendingFolderUploadRef.current = { files, targetFolderPath }
      setConflictingFileNames(conflicts)
      setUploadConflictDialogOpen(true)
    } else {
      await executeFolderUploadBatch(files, targetFolderPath)
    }
  }, [filesystem, executeFolderUploadBatch])

  return {
    uploadFiles,
    uploadFolder,
    uploadConflictDialogOpen,
    conflictingFileNames,
    handleUploadConflictConfirm,
    handleUploadConflictCancel,
    folderUploadModalOpen,
    folderUploadProgress,
    handleFolderUploadCancel,
  }
}
