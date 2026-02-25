import { useCallback, useEffect, type MouseEvent } from 'react'
import { FileTree } from '../FileTree'
import { ContextMenu } from '../ContextMenu'
import { ConfirmDialog } from '../ConfirmDialog'
import { AddWorkspaceDialog } from '../AddWorkspaceDialog'
import { CloneProjectDialog } from '../CloneProjectDialog'
import { useFileExplorer } from './useFileExplorer'
import { useCloneDialog } from './useCloneDialog'
import { useWorkspaceDialogHandlers } from './useWorkspaceDialogHandlers'
import { useContextMenuActions } from './useContextMenuActions'
import { useFileUpload } from './useFileUpload'
import { useTreeUtilities } from './useTreeUtilities'
import { useRenameHandler } from './useRenameHandler'
import { NewFileIcon, NewFolderIcon, AddWorkspaceIcon } from './FileExplorerIcons'
import { getContextMenuItems } from './contextMenuHelper'
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
  onPreviewMarkdown,
  onEditMarkdown,
  onPreviewHtml,
  onEditHtml,
  onOpenHtmlInBrowser,
  onCdToLocation,
  onRunLuaFile,
  onUploadFiles,
  onUploadFolder,
  onCloneProject,
  className,
  workspaceProps,
}: FileExplorerProps) {
  const {
    isAddWorkspaceDialogOpen,
    handleAddWorkspaceClick,
    handleAddWorkspaceCancel,
    handleCreateVirtualWorkspace,
    handleCreateLocalWorkspace,
    handleReconnectWorkspace,
  } = useWorkspaceDialogHandlers(workspaceProps)
  const { cloneDialogState, openCloneDialog, handleCloneDialogCancel, handleCloneProject } = useCloneDialog(onCloneProject)

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

  // File and folder upload hook
  const {
    fileInputRef,
    triggerUpload,
    handleFileSelect,
    folderInputRef,
    triggerFolderUpload,
    handleFolderSelect,
  } = useFileUpload({
    onFilesSelected: (files, targetPath) => {
      onUploadFiles?.(files, targetPath)
    },
    onFolderSelected: onUploadFolder
      ? (files, targetPath) => {
          onUploadFolder(files, targetPath)
        }
      : undefined,
  })

  // Use controlled selected path if provided
  const selectedPath = controlledSelectedPath ?? internalSelectedPath

  // Tree utility functions - memoized wrappers (extracted to separate hook)
  const {
    findNodeType,
    findNodeName,
    pathExists,
    isWorkspaceRoot,
    isLibraryWorkspace,
    isDocsWorkspace,
    isBookWorkspace,
    isExamplesWorkspace,
    isProjectsWorkspace,
    isProjectSubfolder,
    getWorkspaceForPath,
    isInReadOnlyWorkspace,
  } = useTreeUtilities(tree)

  // Rename handling (extracted to separate hook)
  const { handleRenameSubmit, handleRenameCancel } = useRenameHandler({
    findNodeType,
    isWorkspaceRoot,
    renamingPath,
    cancelRename,
    pendingNewFilePath,
    pendingNewFolderPath,
    onRenameFile,
    onRenameFolder,
    onDeleteFile,
    onDeleteFolder,
    onCancelPendingNewFile,
    onCancelPendingNewFolder,
    workspaceProps,
  })

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

  // Context menu action dispatch and delete-key handler (extracted to separate hook)
  const { handleContextMenuSelect, handleDeleteKey } = useContextMenuActions({
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
    workspaceProps,
  })

  const combinedClassName = className
    ? `${styles.explorer} ${className}`
    : styles.explorer

  // Build context menu items dynamically using the helper
  const contextMenuItems = getContextMenuItems({
    contextMenu,
    isWorkspaceRoot,
    isLibraryWorkspace,
    isDocsWorkspace,
    isBookWorkspace,
    isExamplesWorkspace,
    isProjectsWorkspace,
    isProjectSubfolder,
    isInReadOnlyWorkspace,
    supportsRefresh: workspaceProps?.supportsRefresh,
  })

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
          pendingWorkspaces={workspaceProps?.pendingWorkspaces}
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

      {/* Clone Project Dialog */}
      <CloneProjectDialog
        isOpen={cloneDialogState.isOpen}
        projectName={cloneDialogState.projectName}
        isFileSystemAccessSupported={workspaceProps?.isFileSystemAccessSupported ?? false}
        onClone={handleCloneProject}
        onCancel={handleCloneDialogCancel}
        isFolderAlreadyMounted={workspaceProps?.isFolderAlreadyMounted}
        getUniqueWorkspaceName={workspaceProps?.getUniqueWorkspaceName}
      />

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        data-testid="file-upload-input"
      />

      {/* Hidden folder input for folder uploads */}
      {folderInputRef && handleFolderSelect && (
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error - webkitdirectory is a non-standard but widely supported attribute
          webkitdirectory=""
          style={{ display: 'none' }}
          onChange={handleFolderSelect}
          data-testid="folder-upload-input"
        />
      )}
    </div>
  )
}
