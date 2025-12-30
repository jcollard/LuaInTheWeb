import type { ConfirmDialogState } from './types'

/**
 * Binary file extensions - files with these extensions are treated as binary.
 * This mirrors the set in virtualFileSystemFactory.ts for consistency.
 */
const BINARY_EXTENSIONS = new Set([
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.ico',
  '.svg',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.flac',
  '.aac',
  // Video
  '.mp4',
  '.webm',
  '.avi',
  '.mov',
  '.mkv',
  // Fonts
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  // Generic binary
  '.bin',
  '.dat',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  // Documents (binary)
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
])

/**
 * Check if a path has a binary file extension.
 */
function isBinaryExtension(path: string): boolean {
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  return BINARY_EXTENSIONS.has(ext)
}

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
