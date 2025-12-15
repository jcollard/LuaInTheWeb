import { useState, useCallback, useMemo, useEffect } from 'react'
import { IDEContextProvider, useIDE } from '../IDEContext'
import { ActivityBar } from '../ActivityBar'
import { StatusBar } from '../StatusBar'
import { SidebarPanel } from '../SidebarPanel'
import { EditorPanel } from '../EditorPanel'
import { BottomPanel } from '../BottomPanel'
import { IDEPanelGroup } from '../IDEPanelGroup'
import { IDEPanel } from '../IDEPanel'
import { IDEResizeHandle } from '../IDEResizeHandle'
import { ConfirmDialog } from '../ConfirmDialog'
import { ToastContainer } from '../Toast'
import { WelcomeScreen } from '../WelcomeScreen'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useWorkspaceManager } from '../../hooks/useWorkspaceManager'
import { useIDEDiagnostics } from '../../hooks/useIDEDiagnostics'
import { createFileSystemAdapter } from '../../hooks/compositeFileSystemAdapter'
import { initFormatter, formatLuaCode } from '../../utils/luaFormatter'
import type { Workspace } from '../../hooks/workspaceTypes'
import type { IFileSystem } from '@lua-learning/shell-core'
import styles from './IDELayout.module.css'
import type { IDELayoutProps } from './types'

/**
 * Props passed from IDELayout to IDELayoutInner
 */
interface IDELayoutInnerProps {
  className?: string
  compositeFileSystem: IFileSystem
  workspaces: Workspace[]
  addVirtualWorkspace: (name: string) => void
  addLocalWorkspace: (name: string, handle: FileSystemDirectoryHandle) => Promise<Workspace>
  removeWorkspace: (workspaceId: string) => void
  isFileSystemAccessSupported: () => boolean
  refreshWorkspace: (mountPath: string) => Promise<void>
  supportsRefresh: (mountPath: string) => boolean
  reconnectWorkspace: (id: string, handle: FileSystemDirectoryHandle) => Promise<void>
  tryReconnectWithStoredHandle: (id: string) => Promise<boolean>
  disconnectWorkspace: (id: string) => void
  renameWorkspace: (mountPath: string, newName: string) => void
  isFolderAlreadyMounted: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  getUniqueWorkspaceName: (baseName: string) => string
}

/**
 * Inner component that uses IDE context
 */
function IDELayoutInner({
  className,
  compositeFileSystem,
  workspaces,
  addVirtualWorkspace,
  addLocalWorkspace,
  removeWorkspace,
  isFileSystemAccessSupported,
  refreshWorkspace,
  supportsRefresh,
  reconnectWorkspace,
  tryReconnectWithStoredHandle,
  disconnectWorkspace,
  renameWorkspace,
  isFolderAlreadyMounted,
  getUniqueWorkspaceName,
}: IDELayoutInnerProps) {
  const {
    code,
    setCode,
    fileName,
    isDirty,
    activePanel,
    setActivePanel,
    sidebarVisible,
    toggleSidebar,
    terminalVisible,
    toggleTerminal,
    // Filesystem
    fileTree,
    refreshFileTree,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    moveFile,
    copyFile,
    openFile,
    saveFile,
    // New file creation
    pendingNewFilePath,
    createFileWithRename,
    clearPendingNewFile,
    // New folder creation
    pendingNewFolderPath,
    createFolderWithRename,
    clearPendingNewFolder,
    // Tabs
    tabs,
    activeTab,
    selectTab,
    closeTab,
    // Toasts
    toasts,
    showError,
    dismissToast,
    // Recent files
    recentFiles,
    clearRecentFiles,
  } = useIDE()

  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [pendingCloseTabPath, setPendingCloseTabPath] = useState<string | null>(null)
  const [isFormatting, setIsFormatting] = useState(false)

  // Diagnostics hook for showing Lua errors in editor
  const { handleEditorReady } = useIDEDiagnostics()

  // Initialize the Lua formatter on mount
  useEffect(() => {
    initFormatter().catch(console.error)
  }, [])

  // Handle adding a local workspace (dialog provides both name and handle)
  const handleAddLocalWorkspace = useCallback(
    async (name: string, handle: FileSystemDirectoryHandle) => {
      await addLocalWorkspace(name, handle)
      refreshFileTree()
    },
    [addLocalWorkspace, refreshFileTree]
  )

  // Handle reconnecting a disconnected local workspace
  const handleReconnectWorkspace = useCallback(
    async (mountPath: string) => {
      // Find workspace by mount path
      const workspace = workspaces.find((w) => w.mountPath === mountPath)
      if (!workspace || workspace.type !== 'local') {
        return
      }

      // First, try to reconnect using the stored handle (shows simple permission prompt)
      const reconnected = await tryReconnectWithStoredHandle(workspace.id)
      if (reconnected) {
        refreshFileTree()
        return
      }

      // If stored handle failed, fall back to directory picker
      try {
        const handle = await window.showDirectoryPicker({
          mode: 'readwrite',
        })
        await reconnectWorkspace(workspace.id, handle)
        refreshFileTree()
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to reconnect workspace:', err)
        }
      }
    },
    [workspaces, tryReconnectWithStoredHandle, reconnectWorkspace, refreshFileTree]
  )

  // Handle removing a workspace by mount path
  const handleRemoveWorkspace = useCallback(
    (mountPath: string) => {
      const workspace = workspaces.find((w) => w.mountPath === mountPath)
      if (workspace) {
        removeWorkspace(workspace.id)
        refreshFileTree()
      }
    },
    [workspaces, removeWorkspace, refreshFileTree]
  )

  // Handle renaming a workspace
  const handleRenameWorkspace = useCallback(
    (mountPath: string, newName: string) => {
      renameWorkspace(mountPath, newName)
      refreshFileTree()
    },
    [renameWorkspace, refreshFileTree]
  )

  // Handle disconnecting a local workspace
  const handleDisconnectWorkspace = useCallback(
    (mountPath: string) => {
      const workspace = workspaces.find((w) => w.mountPath === mountPath)
      if (workspace) {
        disconnectWorkspace(workspace.id)
        refreshFileTree()
      }
    },
    [workspaces, disconnectWorkspace, refreshFileTree]
  )

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    toggleTerminal,
    toggleSidebar,
    saveFile,
  })

  const combinedClassName = className
    ? `${styles.ideLayout} ${className}`
    : styles.ideLayout

  // Wrapper for FileExplorer's onCreateFile - creates with unique filename and starts rename
  const handleCreateFile = useCallback((parentPath?: string) => {
    createFileWithRename(parentPath)
  }, [createFileWithRename])

  // Wrapper for FileExplorer's onCreateFolder - creates with unique folder name and starts rename
  const handleCreateFolder = useCallback((parentPath?: string) => {
    createFolderWithRename(parentPath)
  }, [createFolderWithRename])

  // Handle tab close with dirty confirmation
  const handleCloseTab = useCallback((path: string) => {
    const tab = tabs.find(t => t.path === path)
    if (tab?.isDirty) {
      // Show confirmation dialog
      setPendingCloseTabPath(path)
    } else {
      // Close immediately
      closeTab(path)
    }
  }, [tabs, closeTab])

  // Confirm closing dirty tab (discard changes)
  const handleConfirmCloseTab = useCallback(() => {
    if (pendingCloseTabPath) {
      closeTab(pendingCloseTabPath)
      setPendingCloseTabPath(null)
    }
  }, [pendingCloseTabPath, closeTab])

  // Cancel closing dirty tab
  const handleCancelCloseTab = useCallback(() => {
    setPendingCloseTabPath(null)
  }, [])

  // Open Shell (show terminal if hidden)
  const handleOpenShell = useCallback(() => {
    if (!terminalVisible) {
      toggleTerminal()
    }
  }, [terminalVisible, toggleTerminal])

  // Format the current code
  const handleFormat = useCallback(() => {
    if (!code.trim()) return

    setIsFormatting(true)
    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      const result = formatLuaCode(code)
      if (result.success && result.code !== undefined) {
        setCode(result.code)
      } else if (!result.success && result.error) {
        showError(`Format failed: ${result.error}`)
      }
      setIsFormatting(false)
    }, 0)
  }, [code, setCode, showError])

  // Explorer props for FileExplorer
  const explorerProps = {
    tree: fileTree,
    selectedPath: activeTab,
    pendingNewFilePath,
    pendingNewFolderPath,
    onCreateFile: handleCreateFile,
    onCreateFolder: handleCreateFolder,
    onRenameFile: renameFile,
    onRenameFolder: renameFolder,
    onDeleteFile: deleteFile,
    onDeleteFolder: deleteFolder,
    onSelectFile: openFile,
    onMoveFile: moveFile,
    onCopyFile: copyFile,
    onCancelPendingNewFile: clearPendingNewFile,
    onCancelPendingNewFolder: clearPendingNewFolder,
    // Workspace management props
    workspaceProps: {
      workspaces,
      isFileSystemAccessSupported: isFileSystemAccessSupported(),
      onAddVirtualWorkspace: addVirtualWorkspace,
      onAddLocalWorkspace: handleAddLocalWorkspace,
      onRemoveWorkspace: handleRemoveWorkspace,
      onRefreshWorkspace: async (mountPath: string) => {
        await refreshWorkspace(mountPath)
        refreshFileTree()
      },
      supportsRefresh,
      onReconnectWorkspace: handleReconnectWorkspace,
      onDisconnectWorkspace: handleDisconnectWorkspace,
      onRenameWorkspace: handleRenameWorkspace,
      isFolderAlreadyMounted,
      getUniqueWorkspaceName,
    },
  }

  // Tab bar props for EditorPanel (only when tabs exist)
  const tabBarProps = tabs.length > 0 ? {
    tabs,
    activeTab,
    onSelect: selectTab,
    onClose: handleCloseTab,
  } : undefined

  return (
    <div className={combinedClassName} data-testid="ide-layout">
      <div className={styles.mainContainer}>
        <div className={styles.activityBar}>
          <ActivityBar
            activeItem={activePanel}
            onItemClick={setActivePanel}
          />
        </div>
        <div className={styles.workArea}>
          <IDEPanelGroup direction="horizontal" persistId="ide-main">
            {sidebarVisible && (
              <>
                <IDEPanel defaultSize={20} minSize={15} maxSize={40}>
                  <SidebarPanel
                    activePanel={activePanel}
                    explorerProps={explorerProps}
                  />
                </IDEPanel>
                <IDEResizeHandle />
              </>
            )}
            <IDEPanel defaultSize={sidebarVisible ? 80 : 100} minSize={40}>
              <IDEPanelGroup direction="vertical" persistId="ide-editor">
                <IDEPanel defaultSize={70} minSize={30}>
                  {tabs.length === 0 ? (
                    <WelcomeScreen
                      recentFiles={recentFiles}
                      onCreateFile={() => handleCreateFile()}
                      onOpenFile={openFile}
                      onOpenShell={handleOpenShell}
                      onClearRecentFiles={clearRecentFiles}
                    />
                  ) : (
                    <EditorPanel
                      code={code}
                      onChange={setCode}
                      fileName={fileName}
                      isDirty={isDirty}
                      cursorLine={cursorLine}
                      cursorColumn={cursorColumn}
                      onCursorChange={(line, col) => {
                        setCursorLine(line)
                        setCursorColumn(col)
                      }}
                      tabBarProps={tabBarProps}
                      onFormat={handleFormat}
                      isFormatting={isFormatting}
                      onEditorReady={handleEditorReady}
                    />
                  )}
                </IDEPanel>
                {/* Always render BottomPanel to preserve shell state */}
                <IDEResizeHandle style={{ display: terminalVisible ? undefined : 'none' }} />
                <IDEPanel
                  defaultSize={30}
                  minSize={terminalVisible ? 15 : 0}
                  collapsible
                  collapsed={!terminalVisible}
                >
                  <BottomPanel fileSystem={compositeFileSystem} onFileSystemChange={refreshFileTree} />
                </IDEPanel>
              </IDEPanelGroup>
            </IDEPanel>
          </IDEPanelGroup>
        </div>
      </div>
      <StatusBar
        line={cursorLine}
        column={cursorColumn}
        language="Lua"
        encoding="UTF-8"
        indentation="Spaces: 2"
      />
      {/* Dirty tab close confirmation dialog */}
      <ConfirmDialog
        isOpen={pendingCloseTabPath !== null}
        title="Unsaved Changes"
        message={`You have unsaved changes in "${tabs.find(t => t.path === pendingCloseTabPath)?.name || 'this file'}". Do you want to discard your changes?`}
        confirmLabel="Discard"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmCloseTab}
        onCancel={handleCancelCloseTab}
      />
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

/**
 * Main IDE Layout component
 */
export function IDELayout({
  initialCode = '',
  className,
}: IDELayoutProps) {
  // Workspace management (hoisted here to pass filesystem to IDEContextProvider)
  const {
    workspaces,
    compositeFileSystem,
    addVirtualWorkspace,
    addLocalWorkspace,
    removeWorkspace,
    isFileSystemAccessSupported,
    refreshWorkspace,
    refreshAllLocalWorkspaces,
    supportsRefresh,
    reconnectWorkspace,
    tryReconnectWithStoredHandle,
    disconnectWorkspace,
    renameWorkspace,
    isFolderAlreadyMounted,
    getUniqueWorkspaceName,
  } = useWorkspaceManager()

  // Create adapted filesystem for IDEContext
  // Pass workspaces so the adapter can include disconnected workspaces in the tree
  const adaptedFileSystem = useMemo(
    () => createFileSystemAdapter(compositeFileSystem, workspaces),
    [compositeFileSystem, workspaces]
  )

  // Refresh all local workspaces when window gains focus
  // This picks up external filesystem changes made outside the browser
  useEffect(() => {
    const handleFocus = () => {
      // Fire and forget - refresh happens async
      refreshAllLocalWorkspaces()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshAllLocalWorkspaces])

  return (
    <IDEContextProvider initialCode={initialCode} fileSystem={adaptedFileSystem}>
      <IDELayoutInner
        className={className}
        compositeFileSystem={compositeFileSystem}
        workspaces={workspaces}
        addVirtualWorkspace={addVirtualWorkspace}
        addLocalWorkspace={addLocalWorkspace}
        removeWorkspace={removeWorkspace}
        isFileSystemAccessSupported={isFileSystemAccessSupported}
        refreshWorkspace={refreshWorkspace}
        supportsRefresh={supportsRefresh}
        reconnectWorkspace={reconnectWorkspace}
        tryReconnectWithStoredHandle={tryReconnectWithStoredHandle}
        disconnectWorkspace={disconnectWorkspace}
        renameWorkspace={renameWorkspace}
        isFolderAlreadyMounted={isFolderAlreadyMounted}
        getUniqueWorkspaceName={getUniqueWorkspaceName}
      />
    </IDEContextProvider>
  )
}
