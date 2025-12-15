import type { ConfirmDialogState } from './types'

interface DropHandlerParams {
  sourcePath: string
  targetFolderPath: string
  pathExists: (path: string) => boolean
  getWorkspaceForPath: (path: string) => string | null
  onMoveFile: ((source: string, target: string) => void) | undefined
  onCopyFile: ((source: string, target: string) => void) | undefined
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
}

/**
 * Handle drop operation with overwrite confirmation and cross-workspace detection.
 * Cross-workspace operations only allow copy to prevent data loss.
 */
export function handleDropOperation({
  sourcePath,
  targetFolderPath,
  pathExists,
  getWorkspaceForPath,
  onMoveFile,
  onCopyFile,
  openConfirmDialog,
  closeConfirmDialog,
}: DropHandlerParams): void {
  if (!onMoveFile) return

  // Extract filename from source path and build target path
  const fileName = sourcePath.split('/').pop() || ''
  const targetPath = targetFolderPath === '/' ? `/${fileName}` : `${targetFolderPath}/${fileName}`

  // Check if this is a cross-workspace operation
  const sourceWorkspace = getWorkspaceForPath(sourcePath)
  const targetWorkspace = getWorkspaceForPath(targetFolderPath)
  const isCrossWorkspace = sourceWorkspace && targetWorkspace && sourceWorkspace !== targetWorkspace

  if (isCrossWorkspace) {
    handleCrossWorkspaceDrop({
      sourcePath,
      targetFolderPath,
      targetPath,
      fileName,
      sourceWorkspace,
      targetWorkspace,
      pathExists,
      onCopyFile,
      openConfirmDialog,
      closeConfirmDialog,
    })
  } else {
    handleSameWorkspaceDrop({
      sourcePath,
      targetFolderPath,
      targetPath,
      fileName,
      pathExists,
      onMoveFile,
      openConfirmDialog,
      closeConfirmDialog,
    })
  }
}

interface CrossWorkspaceDropParams {
  sourcePath: string
  targetFolderPath: string
  targetPath: string
  fileName: string
  sourceWorkspace: string
  targetWorkspace: string
  pathExists: (path: string) => boolean
  onCopyFile: ((source: string, target: string) => void) | undefined
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
}

function handleCrossWorkspaceDrop({
  sourcePath,
  targetFolderPath,
  targetPath,
  fileName,
  sourceWorkspace,
  targetWorkspace,
  pathExists,
  onCopyFile,
  openConfirmDialog,
  closeConfirmDialog,
}: CrossWorkspaceDropParams): void {
  const sourceWorkspaceName = sourceWorkspace.split('/').pop() || sourceWorkspace
  const targetWorkspaceName = targetWorkspace.split('/').pop() || targetWorkspace

  if (pathExists(targetPath)) {
    // Target exists in different workspace
    openConfirmDialog({
      title: 'Copy Between Workspaces',
      message: `You are copying "${fileName}" from "${sourceWorkspaceName}" to "${targetWorkspaceName}". A file with this name already exists. Do you want to replace it with a copy?`,
      variant: 'danger',
      confirmLabel: 'Replace with Copy',
      onConfirm: () => {
        onCopyFile?.(sourcePath, targetFolderPath)
        closeConfirmDialog()
      },
    })
  } else {
    openConfirmDialog({
      title: 'Copy Between Workspaces',
      message: `Moving files between workspaces is not allowed to prevent data loss. Would you like to copy "${fileName}" from "${sourceWorkspaceName}" to "${targetWorkspaceName}" instead?`,
      variant: 'default',
      confirmLabel: 'Copy',
      onConfirm: () => {
        onCopyFile?.(sourcePath, targetFolderPath)
        closeConfirmDialog()
      },
    })
  }
}

interface SameWorkspaceDropParams {
  sourcePath: string
  targetFolderPath: string
  targetPath: string
  fileName: string
  pathExists: (path: string) => boolean
  onMoveFile: (source: string, target: string) => void
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
}

function handleSameWorkspaceDrop({
  sourcePath,
  targetFolderPath,
  targetPath,
  fileName,
  pathExists,
  onMoveFile,
  openConfirmDialog,
  closeConfirmDialog,
}: SameWorkspaceDropParams): void {
  if (pathExists(targetPath)) {
    openConfirmDialog({
      title: 'Replace File',
      message: `A file named "${fileName}" already exists in this location. Do you want to replace it?`,
      variant: 'danger',
      confirmLabel: 'Replace',
      onConfirm: () => {
        onMoveFile(sourcePath, targetFolderPath)
        closeConfirmDialog()
      },
    })
  } else {
    onMoveFile(sourcePath, targetFolderPath)
  }
}
