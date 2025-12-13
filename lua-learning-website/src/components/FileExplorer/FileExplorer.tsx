import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { FileTree } from '../FileTree'
import { ContextMenu } from '../ContextMenu'
import { ConfirmDialog } from '../ConfirmDialog'
import { AddWorkspaceDialog } from '../AddWorkspaceDialog'
import { useFileExplorer } from './useFileExplorer'
import type { FileExplorerProps } from './types'
import type { ContextMenuItem } from '../ContextMenu'
import styles from './FileExplorer.module.css'

// Stryker disable all: Icon components are visual-only, no logic to test
const NewFileIcon = () => (
  <svg className={styles.toolbarIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M12 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4l-1-3zm-1 13H5V3h5v2h2v9zM8 7v2H6v1h2v2h1V10h2V9h-2V7H8z"
    />
  </svg>
)

const NewFolderIcon = () => (
  <svg className={styles.toolbarIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1zm-1 10H3V5h4l1 1h5v8zM8 8v1.5H6.5V11h1.5v1.5H9.5V11H11V9.5H9.5V8H8z"
    />
  </svg>
)

const AddWorkspaceIcon = () => (
  <svg className={styles.toolbarIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1z"
    />
    <circle cx="12" cy="11" r="3" fill="currentColor" stroke="var(--bg-primary, #252526)" strokeWidth="1" />
    <path d="M12 9.5v3M10.5 11h3" stroke="var(--bg-primary, #252526)" strokeWidth="1" strokeLinecap="round" />
  </svg>
)
// Stryker restore all

// Stryker disable all: Menu item IDs are internal identifiers tested via behavior
const fileContextMenuItems: ContextMenuItem[] = [
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]

const folderContextMenuItems: ContextMenuItem[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'divider', type: 'divider' },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete' },
]
// Stryker restore all

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
  onMoveFile,
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
    (name: string) => {
      workspaceProps?.onAddLocalWorkspace(name)
      setIsAddWorkspaceDialogOpen(false)
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

  // Find node type by path
  const findNodeType = useCallback((path: string): 'file' | 'folder' | null => {
    const search = (nodes: typeof tree): 'file' | 'folder' | null => {
      for (const node of nodes) {
        if (node.path === path) return node.type
        if (node.children) {
          const found = search(node.children)
          if (found) return found
        }
      }
      return null
    }
    return search(tree)
    // Stryker disable next-line all: React hooks dependency optimization
  }, [tree])

  // Check if a path is a workspace root (for context menu options)
  const isWorkspaceRoot = useCallback((path: string): boolean => {
    for (const node of tree) {
      if (node.path === path && node.isWorkspace) {
        return true
      }
    }
    return false
  }, [tree])

  // Find node name by path
  const findNodeName = useCallback((path: string): string => {
    const search = (nodes: typeof tree): string | null => {
      for (const node of nodes) {
        if (node.path === path) return node.name
        if (node.children) {
          const found = search(node.children)
          if (found) return found
        }
      }
      return null
    }
    return search(tree) || path.split('/').pop() || path
    // Stryker disable next-line all: React hooks dependency optimization
  }, [tree])

  const handleSelect = useCallback((path: string) => {
    selectPath(path)
    onSelectFile(path)
  }, [selectPath, onSelectFile])

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
      case 'refresh':
        // Refresh workspace - fire and forget
        workspaceProps?.onRefreshWorkspace(targetPath)
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
    workspaceProps,
  ])

  const handleRenameSubmit = useCallback((path: string, newName: string) => {
    const type = findNodeType(path)
    if (type === 'folder') {
      onRenameFolder(path, newName)
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
  }, [findNodeType, onRenameFile, onRenameFolder, cancelRename, pendingNewFilePath, onCancelPendingNewFile, pendingNewFolderPath, onCancelPendingNewFolder])

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
  // Add "Refresh" option for local workspace folders that support it
  const contextMenuItems = (() => {
    if (contextMenu.targetType !== 'folder') {
      return fileContextMenuItems
    }

    const targetPath = contextMenu.targetPath
    // Check if this is a workspace root that supports refresh
    if (targetPath && isWorkspaceRoot(targetPath) && workspaceProps?.supportsRefresh(targetPath)) {
      // Insert Refresh at the top for local workspaces
      return [
        { id: 'refresh', label: 'Refresh' },
        { id: 'divider-refresh', type: 'divider' as const },
        ...folderContextMenuItems,
      ]
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
          onToggle={toggleFolder}
          onContextMenu={handleContextMenu}
          onRename={startRename}
          onDelete={handleDeleteKey}
          renamingPath={renamingPath}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={handleRenameCancel}
          onDrop={onMoveFile}
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
        confirmLabel="Delete"
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
        />
      )}
    </div>
  )
}
