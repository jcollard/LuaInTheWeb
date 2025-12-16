import { useCallback, useEffect, useState, useMemo, type MouseEvent } from 'react'
import { FileTree } from '../FileTree'
import { ContextMenu } from '../ContextMenu'
import { ConfirmDialog } from '../ConfirmDialog'
import { AddWorkspaceDialog } from '../AddWorkspaceDialog'
import { useFileExplorer } from './useFileExplorer'
import { NewFileIcon, NewFolderIcon, AddWorkspaceIcon } from './FileExplorerIcons'
import {
  fileContextMenuItems,
  folderContextMenuItems,
  workspaceContextMenuItems,
  libraryWorkspaceContextMenuItems,
  docsWorkspaceContextMenuItems,
  buildConnectedWorkspaceMenuItems,
} from './contextMenuItems'
import {
  findNodeType as findNodeTypeUtil,
  findNodeName as findNodeNameUtil,
  pathExists as pathExistsUtil,
  isWorkspaceRoot as isWorkspaceRootUtil,
  isLibraryWorkspace as isLibraryWorkspaceUtil,
  isDocsWorkspace as isDocsWorkspaceUtil,
  getWorkspaceForPath as getWorkspaceForPathUtil,
} from './treeUtils'
import { handleDropOperation } from './dropHandler'
import type { FileExplorerProps } from './types'
import styles from './FileExplorer.module.css'

export function FileExplorer({
  tree,
  selectedPath: controlledSelectedPath,
  pendingNewFilePath,
  pendingNewFolderPath,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  onSelectFile,
  onDoubleClickFile,
  onMoveFile,
  onCopyFile,
  onCancelPendingNewFile,
  onCancelPendingNewFolder,
  className,
  workspaceProps,
}: FileExplorerProps) {
  const [isAddWorkspaceDialogOpen, setIsAddWorkspaceDialogOpen] = useState(false)

  const {
    selectedPath: internalSelectedPath,
    selectPath,
    expandedPaths,
    toggleFolder,
    renamingPath,
    startRename,
    cancelRename,
    contextMenu,
    openContextMenu,
    closeContextMenu,
    confirmDialog,
    openConfirmDialog,
    closeConfirmDialog,
  } = useFileExplorer()

  // Workspace management handlers
  const handleAddWorkspaceClick = useCallback(() => {
    setIsAddWorkspaceDialogOpen(true)
  }, [])

  const handleAddWorkspaceCancel = useCallback(() => {
    setIsAddWorkspaceDialogOpen(false)
  }, [])

  const handleCreateVirtualWorkspace = useCallback(
    (name: string) => {
      workspaceProps?.onAddVirtualWorkspace(name)
      setIsAddWorkspaceDialogOpen(false)
    },
    [workspaceProps]
  )

  const handleCreateLocalWorkspace = useCallback(
    (name: string, handle: FileSystemDirectoryHandle) => {
      workspaceProps?.onAddLocalWorkspace(name, handle)
      setIsAddWorkspaceDialogOpen(false)
    },
    [workspaceProps]
  )

  const handleReconnectWorkspace = useCallback(
    (mountPath: string) => {
      workspaceProps?.onReconnectWorkspace?.(mountPath)
    },
    [workspaceProps]
  )

  // Use controlled selected path if provided
  const selectedPath = controlledSelectedPath ?? internalSelectedPath

  // Start rename mode when a new file is pending
  useEffect(() => {
    if (pendingNewFilePath) {
      startRename(pendingNewFilePath)
    }
  }, [pendingNewFilePath, startRename])

  // Start rename mode when a new folder is pending
  useEffect(() => {
    if (pendingNewFolderPath) {
      startRename(pendingNewFolderPath)
    }
  }, [pendingNewFolderPath, startRename])

  // Tree utility functions - memoized wrappers around pure utilities
  const findNodeType = useMemo(
    () => (path: string) => findNodeTypeUtil(tree, path),
    [tree]
  )
  const isWorkspaceRoot = useMemo(
    () => (path: string) => isWorkspaceRootUtil(tree, path),
    [tree]
  )
  const isLibraryWorkspace = useMemo(
    () => (path: string) => isLibraryWorkspaceUtil(tree, path),
    [tree]
  )
  const isDocsWorkspace = useMemo(
    () => (path: string) => isDocsWorkspaceUtil(tree, path),
    [tree]
  )
  const findNodeName = useMemo(
    () => (path: string) => findNodeNameUtil(tree, path),
    [tree]
  )
  const pathExists = useMemo(
    () => (path: string) => pathExistsUtil(tree, path),
    [tree]
  )
  const getWorkspaceForPath = useMemo(
    () => (path: string) => getWorkspaceForPathUtil(tree, path),
    [tree]
  )

  const handleSelect = useCallback((path: string) => {
    selectPath(path)
    onSelectFile(path)
  }, [selectPath, onSelectFile])

  const handleDoubleClick = useCallback((path: string) => {
    onDoubleClickFile?.(path)
  }, [onDoubleClickFile])

  // Handle drop with overwrite confirmation and cross-workspace detection
  const handleDrop = useCallback((sourcePath: string, targetFolderPath: string) => {
    handleDropOperation({
      sourcePath,
      targetFolderPath,
      pathExists,
      getWorkspaceForPath,
      onMoveFile,
      onCopyFile,
      openConfirmDialog,
      closeConfirmDialog,
    })
  }, [pathExists, getWorkspaceForPath, onMoveFile, onCopyFile, openConfirmDialog, closeConfirmDialog])

  const handleContextMenu = useCallback((path: string, event: MouseEvent) => {
    const type = findNodeType(path)
    if (type) {
      openContextMenu(path, event.clientX, event.clientY, type)
    }
    // Stryker disable next-line all: React hooks dependency optimization
  }, [findNodeType, openContextMenu])

  const handleContextMenuSelect = useCallback((action: string) => {
    const { targetPath, targetType } = contextMenu

    if (!targetPath) return

    // Stryker disable next-line StringLiteral: switch case IDs tested via behavior
    switch (action) {
      case 'new-file':
        onCreateFile(targetPath)
        break
      case 'new-folder':
        onCreateFolder(targetPath)
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
    workspaceProps,
  ])

  const handleRenameSubmit = useCallback((path: string, newName: string) => {
    const type = findNodeType(path)
    if (type === 'folder') {
      // Check if this is a workspace root - use workspace rename instead of folder rename
      if (isWorkspaceRoot(path) && workspaceProps?.onRenameWorkspace) {
        workspaceProps.onRenameWorkspace(path, newName)
      } else {
        onRenameFolder(path, newName)
      }
    } else {
      onRenameFile(path, newName)
    }
    // Clear pending new file if this was a pending file being renamed
    if (path === pendingNewFilePath && onCancelPendingNewFile) {
      onCancelPendingNewFile()
    }
    // Clear pending new folder if this was a pending folder being renamed
    if (path === pendingNewFolderPath && onCancelPendingNewFolder) {
      onCancelPendingNewFolder()
    }
    cancelRename()
    // Stryker disable next-line all: React hooks dependency optimization
  }, [findNodeType, isWorkspaceRoot, onRenameFile, onRenameFolder, cancelRename, pendingNewFilePath, onCancelPendingNewFile, pendingNewFolderPath, onCancelPendingNewFolder, workspaceProps])

  // Handle rename cancel - delete pending new file/folder if applicable
  const handleRenameCancel = useCallback(() => {
    if (renamingPath === pendingNewFilePath && pendingNewFilePath) {
      // Delete the pending file since rename was cancelled
      onDeleteFile(pendingNewFilePath)
      if (onCancelPendingNewFile) {
        onCancelPendingNewFile()
      }
    }
    if (renamingPath === pendingNewFolderPath && pendingNewFolderPath) {
      // Delete the pending folder since rename was cancelled
      onDeleteFolder(pendingNewFolderPath)
      if (onCancelPendingNewFolder) {
        onCancelPendingNewFolder()
      }
    }
    cancelRename()
    // Stryker disable next-line all: React hooks dependency optimization
  }, [renamingPath, pendingNewFilePath, onDeleteFile, onCancelPendingNewFile, pendingNewFolderPath, onDeleteFolder, onCancelPendingNewFolder, cancelRename])

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

  const combinedClassName = className
    ? `${styles.explorer} ${className}`
    : styles.explorer

  // Build context menu items dynamically
  // Use workspace-specific menu for workspace roots, regular folder menu otherwise
  const contextMenuItems = (() => {
    if (contextMenu.targetType !== 'folder') {
      return fileContextMenuItems
    }

    const targetPath = contextMenu.targetPath

    // Check if this is a workspace root
    if (targetPath && isWorkspaceRoot(targetPath)) {
      // Library workspaces have no context menu options (read-only)
      if (isLibraryWorkspace(targetPath)) {
        return libraryWorkspaceContextMenuItems
      }
      // Docs workspaces have no context menu options (read-only)
      if (isDocsWorkspace(targetPath)) {
        return docsWorkspaceContextMenuItems
      }
      // Add "Refresh" and "Disconnect" options for connected local workspaces
      const isConnectedLocalWorkspace = workspaceProps?.supportsRefresh(targetPath)
      if (isConnectedLocalWorkspace) {
        return buildConnectedWorkspaceMenuItems()
      }
      return workspaceContextMenuItems
    }

    return folderContextMenuItems
  })()

  return (
    <div className={combinedClassName} data-testid="file-explorer">
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => onCreateFile()}
          aria-label="New File"
          title="New File"
        >
          <NewFileIcon />
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => onCreateFolder()}
          aria-label="New Folder"
          title="New Folder"
        >
          <NewFolderIcon />
        </button>
        {workspaceProps && (
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleAddWorkspaceClick}
            aria-label="Add Workspace"
            title="Add Workspace"
          >
            <AddWorkspaceIcon />
          </button>
        )}
      </div>

      {/* File Tree */}
      <div className={styles.treeContainer}>
        <FileTree
          tree={tree}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
          onToggle={toggleFolder}
          onContextMenu={handleContextMenu}
          onRename={startRename}
          onDelete={handleDeleteKey}
          renamingPath={renamingPath}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={handleRenameCancel}
          onDrop={handleDrop}
          onReconnect={handleReconnectWorkspace}
        />
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onSelect={handleContextMenuSelect}
        onClose={closeContextMenu}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel || 'Delete'}
        cancelLabel="Cancel"
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />

      {/* Add Workspace Dialog (optional) */}
      {workspaceProps && (
        <AddWorkspaceDialog
          isOpen={isAddWorkspaceDialogOpen}
          isFileSystemAccessSupported={workspaceProps.isFileSystemAccessSupported}
          onCreateVirtual={handleCreateVirtualWorkspace}
          onCreateLocal={handleCreateLocalWorkspace}
          onCancel={handleAddWorkspaceCancel}
          isFolderAlreadyMounted={workspaceProps.isFolderAlreadyMounted}
          getUniqueWorkspaceName={workspaceProps.getUniqueWorkspaceName}
        />
      )}
    </div>
  )
}
