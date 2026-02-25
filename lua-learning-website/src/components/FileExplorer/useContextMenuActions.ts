import { useCallback } from 'react'
import type { ContextMenuState, ConfirmDialogState, WorkspaceProps } from './types'

interface UseContextMenuActionsParams {
  contextMenu: ContextMenuState
  findNodeType: (path: string) => 'file' | 'folder' | null
  findNodeName: (path: string) => string
  startRename: (path: string) => void
  openConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void
  closeConfirmDialog: () => void
  closeContextMenu: () => void
  onCreateFile: (parentPath?: string) => void
  onCreateFolder: (parentPath?: string) => void
  onDeleteFile: (path: string) => void
  onDeleteFolder: (path: string) => void
  onPreviewMarkdown?: (path: string) => void
  onEditMarkdown?: (path: string) => void
  onPreviewHtml?: (path: string) => void
  onEditHtml?: (path: string) => void
  onOpenHtmlInBrowser?: (path: string) => void
  onCdToLocation?: (path: string) => void
  onRunLuaFile?: (path: string) => void
  triggerUpload: (targetPath: string) => void
  triggerFolderUpload?: (targetPath: string) => void
  openCloneDialog: (projectPath: string) => void
  onDownloadFile?: (path: string) => void
  onDownloadAsZip?: (path: string) => void
  workspaceProps?: WorkspaceProps
}

/**
 * Hook encapsulating context menu action dispatch and delete-key handler.
 * Extracted from FileExplorer to reduce component line count.
 */
export function useContextMenuActions({
  contextMenu,
  findNodeType,
  findNodeName,
  startRename,
  openConfirmDialog,
  closeConfirmDialog,
  closeContextMenu,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onPreviewMarkdown,
  onEditMarkdown,
  onPreviewHtml,
  onEditHtml,
  onOpenHtmlInBrowser,
  onCdToLocation,
  onRunLuaFile,
  triggerUpload,
  triggerFolderUpload,
  openCloneDialog,
  onDownloadFile,
  onDownloadAsZip,
  workspaceProps,
}: UseContextMenuActionsParams) {
  const handleContextMenuSelect = useCallback((action: string) => {
    const { targetPath, targetType } = contextMenu

    if (!targetPath) return

    // Stryker disable next-line StringLiteral: switch case IDs tested via behavior
    switch (action) {
      case 'preview-markdown':
        onPreviewMarkdown?.(targetPath)
        break
      case 'edit-markdown':
        onEditMarkdown?.(targetPath)
        break
      case 'preview-html':
        onPreviewHtml?.(targetPath)
        break
      case 'edit-html':
        onEditHtml?.(targetPath)
        break
      case 'open-in-browser':
        onOpenHtmlInBrowser?.(targetPath)
        break
      case 'open-in-terminal':
        onCdToLocation?.(targetPath)
        break
      case 'run-lua':
        onRunLuaFile?.(targetPath)
        break
      case 'new-file':
        onCreateFile(targetPath)
        break
      case 'new-folder':
        onCreateFolder(targetPath)
        break
      case 'upload-files':
        triggerUpload(targetPath)
        break
      case 'upload-folder':
        triggerFolderUpload?.(targetPath)
        break
      case 'rename':
        startRename(targetPath)
        break
      case 'rename-workspace':
        // Rename workspace uses the same rename mechanism as folders
        startRename(targetPath)
        break
      case 'refresh':
        // Refresh workspace - fire and forget
        workspaceProps?.onRefreshWorkspace(targetPath)
        break
      case 'disconnect-workspace':
        // Disconnect workspace without removing it
        workspaceProps?.onDisconnectWorkspace?.(targetPath)
        break
      case 'remove-workspace': {
        const name = findNodeName(targetPath)
        openConfirmDialog({
          // Stryker disable next-line StringLiteral: dialog text is display-only
          title: 'Remove Workspace',
          // Stryker disable next-line StringLiteral: dialog text is display-only
          message: `Are you sure you want to remove the workspace "${name}"? This will not delete any files.`,
          variant: 'danger',
          onConfirm: () => {
            workspaceProps?.onRemoveWorkspace(targetPath)
            closeConfirmDialog()
          },
        })
        break
      }
      case 'clone-project':
        openCloneDialog(targetPath)
        break
      case 'download':
        onDownloadFile?.(targetPath)
        break
      case 'download-zip':
        onDownloadAsZip?.(targetPath)
        break
      case 'delete': {
        const name = findNodeName(targetPath)
        const isFolder = targetType === 'folder'
        openConfirmDialog({
          // Stryker disable next-line StringLiteral: dialog text is display-only
          title: `Delete ${isFolder ? 'Folder' : 'File'}`,
          // Stryker disable next-line StringLiteral: dialog text is display-only
          message: `Are you sure you want to delete "${name}"?${isFolder ? ' This will also delete all contents.' : ''}`,
          variant: 'danger',
          onConfirm: () => {
            if (isFolder) {
              onDeleteFolder(targetPath)
            } else {
              onDeleteFile(targetPath)
            }
            closeConfirmDialog()
          },
        })
        break
      }
    }

    closeContextMenu()
    // Stryker disable next-line all: React hooks dependency optimization
  }, [
    contextMenu,
    findNodeName,
    startRename,
    openConfirmDialog,
    closeConfirmDialog,
    closeContextMenu,
    onCreateFile,
    onCreateFolder,
    onDeleteFile,
    onDeleteFolder,
    onPreviewMarkdown,
    onEditMarkdown,
    onPreviewHtml,
    onEditHtml,
    onOpenHtmlInBrowser,
    onCdToLocation,
    onRunLuaFile,
    triggerUpload,
    triggerFolderUpload,
    openCloneDialog,
    onDownloadFile,
    onDownloadAsZip,
    workspaceProps,
  ])

  const handleDeleteKey = useCallback((path: string) => {
    const type = findNodeType(path)
    if (!type) return

    const name = findNodeName(path)
    const isFolder = type === 'folder'
    openConfirmDialog({
      // Stryker disable next-line StringLiteral: dialog text is display-only
      title: `Delete ${isFolder ? 'Folder' : 'File'}`,
      // Stryker disable next-line StringLiteral: dialog text is display-only
      message: `Are you sure you want to delete "${name}"?${isFolder ? ' This will also delete all contents.' : ''}`,
      variant: 'danger',
      onConfirm: () => {
        if (isFolder) {
          onDeleteFolder(path)
        } else {
          onDeleteFile(path)
        }
        closeConfirmDialog()
      },
    })
    // Stryker disable next-line all: React hooks dependency optimization
  }, [findNodeType, findNodeName, openConfirmDialog, closeConfirmDialog, onDeleteFile, onDeleteFolder])

  return { handleContextMenuSelect, handleDeleteKey }
}
