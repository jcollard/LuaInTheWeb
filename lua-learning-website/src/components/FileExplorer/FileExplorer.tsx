import { useCallback, type MouseEvent } from 'react'
import { FileTree } from '../FileTree'
import { ContextMenu } from '../ContextMenu'
import { ConfirmDialog } from '../ConfirmDialog'
import { useFileExplorer } from './useFileExplorer'
import type { FileExplorerProps } from './types'
import type { ContextMenuItem } from '../ContextMenu'
import styles from './FileExplorer.module.css'

// Icons
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

export function FileExplorer({
  tree,
  selectedPath: controlledSelectedPath,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  onSelectFile,
  className,
}: FileExplorerProps) {
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

  // Use controlled selected path if provided
  const selectedPath = controlledSelectedPath ?? internalSelectedPath

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
  }, [findNodeType, openContextMenu])

  const handleContextMenuSelect = useCallback((action: string) => {
    const { targetPath, targetType } = contextMenu

    if (!targetPath) return

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
      case 'delete': {
        const name = findNodeName(targetPath)
        const isFolder = targetType === 'folder'
        openConfirmDialog({
          title: `Delete ${isFolder ? 'Folder' : 'File'}`,
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
  ])

  const handleRenameSubmit = useCallback((path: string, newName: string) => {
    const type = findNodeType(path)
    if (type === 'folder') {
      onRenameFolder(path, newName)
    } else {
      onRenameFile(path, newName)
    }
    cancelRename()
  }, [findNodeType, onRenameFile, onRenameFolder, cancelRename])

  const combinedClassName = className
    ? `${styles.explorer} ${className}`
    : styles.explorer

  const contextMenuItems = contextMenu.targetType === 'folder'
    ? folderContextMenuItems
    : fileContextMenuItems

  return (
    <div className={combinedClassName}>
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
          renamingPath={renamingPath}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={cancelRename}
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
    </div>
  )
}
