import type { ConfirmDialogState } from './types'
import { isBinaryExtension } from '../../utils/binaryExtensions'

export interface FileUploadParams {
  file: File
  targetFolderPath: string
  pathExists: (path: string) => boolean
  writeTextFile: (path: string, content: string) => void
  writeBinaryFile: (path: string, content: Uint8Array) => void
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Process a single file upload.
 * Handles text vs binary detection and file conflict confirmation.
 */
export async function processFileUpload(params: FileUploadParams): Promise<void> {
  const {
    file,
    targetFolderPath,
    pathExists,
    writeTextFile,
    writeBinaryFile,
    openConfirmDialog,
    closeConfirmDialog,
    onSuccess,
    onError,
  } = params

  const targetPath =
    targetFolderPath === '/' ? `/${file.name}` : `${targetFolderPath}/${file.name}`

  const writeFile = async () => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      if (isBinaryExtension(file.name)) {
        writeBinaryFile(targetPath, new Uint8Array(arrayBuffer))
      } else {
        const text = new TextDecoder().decode(arrayBuffer)
        writeTextFile(targetPath, text)
      }
      onSuccess?.()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  // Check for conflicts
  if (pathExists(targetPath)) {
    openConfirmDialog({
      title: 'Replace File',
      message: `A file named "${file.name}" already exists. Do you want to replace it?`,
      variant: 'danger',
      confirmLabel: 'Replace',
      onConfirm: async () => {
        await writeFile()
        closeConfirmDialog()
      },
    })
  } else {
    await writeFile()
  }
}

export interface UploadBatchParams {
  files: FileList
  targetFolderPath: string
  pathExists: (path: string) => boolean
  writeTextFile: (path: string, content: string) => void
  writeBinaryFile: (path: string, content: Uint8Array) => void
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
  onComplete?: (results: { success: number; failed: number }) => void
  onError?: (fileName: string, error: string) => void
}

/**
 * Find files from a FileList that would conflict with existing files.
 * Returns an array of file names that already exist in the target folder.
 */
export function findConflictingFiles(
  files: FileList,
  targetFolderPath: string,
  pathExists: (path: string) => boolean
): string[] {
  const conflicts: string[] = []
  for (const file of Array.from(files)) {
    const targetPath =
      targetFolderPath === '/' ? `/${file.name}` : `${targetFolderPath}/${file.name}`
    if (pathExists(targetPath)) {
      conflicts.push(file.name)
    }
  }
  return conflicts
}

/**
 * Find files from a folder upload that would conflict with existing files.
 * Uses webkitRelativePath to detect conflicts with full path structure.
 * Returns an array of relative paths that already exist.
 */
export function findFolderConflictingFiles(
  files: FileList,
  targetFolderPath: string,
  pathExists: (path: string) => boolean
): string[] {
  const conflicts: string[] = []
  for (const file of Array.from(files)) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    if (!relativePath) continue

    const targetPath =
      targetFolderPath === '/' ? `/${relativePath}` : `${targetFolderPath}/${relativePath}`
    if (pathExists(targetPath)) {
      conflicts.push(relativePath)
    }
  }
  return conflicts
}

/**
 * Process a batch of file uploads.
 * Files are processed sequentially to handle conflict dialogs properly.
 */
export async function processFileUploadBatch(params: UploadBatchParams): Promise<void> {
  const {
    files,
    targetFolderPath,
    pathExists,
    writeTextFile,
    writeBinaryFile,
    openConfirmDialog,
    closeConfirmDialog,
    onComplete,
    onError,
  } = params

  let success = 0
  let failed = 0

  for (const file of Array.from(files)) {
    await processFileUpload({
      file,
      targetFolderPath,
      pathExists,
      writeTextFile,
      writeBinaryFile,
      openConfirmDialog,
      closeConfirmDialog,
      onSuccess: () => {
        success++
      },
      onError: (error) => {
        failed++
        onError?.(file.name, error)
      },
    })
  }

  onComplete?.({ success, failed })
}

export interface FolderUploadBatchParams {
  files: FileList
  targetFolderPath: string
  pathExists: (path: string) => boolean
  writeTextFile: (path: string, content: string) => void
  writeBinaryFile: (path: string, content: Uint8Array) => void
  createDirectory: (path: string) => void
  cancelledRef: { current: boolean }
  onProgress: (current: number, total: number, currentFile: string) => void
  onComplete: (results: { success: number; failed: number; cancelled: boolean }) => void
  onError?: (fileName: string, error: string) => void
  /** Optional: Call after all files are processed to commit batch changes (for silent operations) */
  commitBatch?: () => void
}

/**
 * Process a folder upload batch with progress tracking and cancellation support.
 * Creates necessary directories and yields to browser between files for non-blocking UI.
 */
export async function processFolderUploadBatch(params: FolderUploadBatchParams): Promise<void> {
  const {
    files,
    targetFolderPath,
    writeTextFile,
    writeBinaryFile,
    createDirectory,
    cancelledRef,
    onProgress,
    onComplete,
    onError,
    commitBatch,
  } = params

  const fileArray = Array.from(files)
  const total = fileArray.length
  let success = 0
  let failed = 0

  // Track created directories to avoid redundant mkdir calls
  const createdDirs = new Set<string>()

  // Batch progress updates to avoid UI thrashing with large uploads
  // Update at most every 100ms, plus always report first and last file
  const PROGRESS_INTERVAL_MS = 100
  let lastProgressUpdate = 0

  for (let i = 0; i < fileArray.length; i++) {
    // Check for cancellation before processing each file
    if (cancelledRef.current) {
      onComplete({ success, failed, cancelled: true })
      return
    }

    const file = fileArray[i]
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    if (!relativePath) continue

    // Report progress (batched to avoid UI thrashing)
    const now = Date.now()
    const isFirstOrLast = i === 0 || i === total - 1
    if (isFirstOrLast || now - lastProgressUpdate >= PROGRESS_INTERVAL_MS) {
      onProgress(i + 1, total, relativePath)
      lastProgressUpdate = now
    }

    try {
      // Build target path
      const targetPath =
        targetFolderPath === '/' ? `/${relativePath}` : `${targetFolderPath}/${relativePath}`

      // Create parent directories
      const pathParts = relativePath.split('/')
      let currentPath = targetFolderPath === '/' ? '' : targetFolderPath
      for (let j = 0; j < pathParts.length - 1; j++) {
        currentPath = `${currentPath}/${pathParts[j]}`
        if (!createdDirs.has(currentPath)) {
          createDirectory(currentPath)
          createdDirs.add(currentPath)
        }
      }

      // Write file
      const arrayBuffer = await file.arrayBuffer()
      if (isBinaryExtension(file.name)) {
        writeBinaryFile(targetPath, new Uint8Array(arrayBuffer))
      } else {
        const text = new TextDecoder().decode(arrayBuffer)
        writeTextFile(targetPath, text)
      }
      success++
    } catch (error) {
      failed++
      onError?.(relativePath, error instanceof Error ? error.message : 'Upload failed')
    }

    // Yield to browser to allow UI updates and cancellation checks
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Check for cancellation after processing each file
    if (cancelledRef.current) {
      // Commit any successful writes before reporting completion
      commitBatch?.()
      onComplete({ success, failed, cancelled: true })
      return
    }
  }

  // Commit all writes in one state update (avoids 6000 re-renders for 6000 files)
  commitBatch?.()
  onComplete({ success, failed, cancelled: false })
}
