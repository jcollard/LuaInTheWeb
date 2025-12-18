/* eslint-disable max-lines */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
import { CanvasTabContent } from './CanvasTabContent'
import { MarkdownTabContent } from './MarkdownTabContent'
import { BinaryTabContent } from './BinaryTabContent'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useCanvasTabManager } from '../../hooks/useCanvasTabManager'
import { useWindowFocusRefresh } from '../../hooks/useWindowFocusRefresh'
import { useWorkspaceManager } from '../../hooks/useWorkspaceManager'
import { useEditorExtensions } from '../../hooks/useEditorExtensions'
import { createFileSystemAdapter } from '../../hooks/compositeFileSystemAdapter'
import { initFormatter, formatLuaCode } from '../../utils/luaFormatter'
import type { Workspace } from '../../hooks/workspaceTypes'
import type { IFileSystem } from '@lua-learning/shell-core'
import styles from './IDELayout.module.css'
import type { IDELayoutProps } from './types'
import { createExplorerProps } from './explorerPropsHelper'
import { useWorkspaceHandlers } from './workspaceHandlers'

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
  refreshAllLocalWorkspaces: () => Promise<void>
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
  refreshAllLocalWorkspaces,
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
    handleShellFileMove,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    moveFile,
    copyFile,
    openFile,
    openPreviewFile,
    openMarkdownPreview,
    openBinaryViewer,
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
    activeTabType,
    selectTab,
    closeTab,
    openCanvasTab,
    makeTabPermanent,
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

  // Canvas tab management (extracted to reduce IDELayout complexity)
  const { handleCanvasExit, hasCanvasTabs, canvasCode } = useCanvasTabManager({
    code,
    tabs,
    activeTab,
    activeTabType,
    openCanvasTab,
  })

  // Editor extensions (diagnostics + hover documentation)
  const { handleEditorReady } = useEditorExtensions({
    code,
    fileSystem: compositeFileSystem,
    currentFilePath: activeTab,
  })

  // Initialize the Lua formatter on mount
  useEffect(() => {
    initFormatter().catch(console.error)
  }, [])

  // Refresh all local workspaces when window gains focus
  // This picks up external filesystem changes made outside the browser
  useWindowFocusRefresh(refreshAllLocalWorkspaces, refreshFileTree)

  // Workspace handlers
  const {
    handleAddLocalWorkspace,
    handleReconnectWorkspace,
    handleRemoveWorkspace,
    handleRenameWorkspace,
    handleDisconnectWorkspace,
  } = useWorkspaceHandlers({
    workspaces,
    addLocalWorkspace,
    removeWorkspace,
    refreshFileTree,
    tryReconnectWithStoredHandle,
    reconnectWorkspace,
    disconnectWorkspace,
    renameWorkspace,
  })

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    toggleTerminal,
    toggleSidebar,
    saveFile,
  })

  // Canvas tab request management for shell-based canvas.start()
  // Stores pending resolvers for canvas requests (canvasId -> resolver)
  const pendingCanvasRequestsRef = useRef<Map<string, (canvas: HTMLCanvasElement) => void>>(new Map())

  // Handle canvas tab request from shell (canvas.start())
  const handleRequestCanvasTab = useCallback(async (canvasId: string): Promise<HTMLCanvasElement> => {
    // Tab path format: canvas://{canvasId}
    const tabPath = `canvas://${canvasId}`

    // Open a canvas tab using the existing tab management
    // Pass canvasId as the name so it shows in the tab
    openCanvasTab(canvasId, canvasId)

    // Return a Promise that will be resolved when the canvas element is ready
    return new Promise<HTMLCanvasElement>((resolve) => {
      pendingCanvasRequestsRef.current.set(tabPath, resolve)
    })
  }, [openCanvasTab])

  // Handle canvas tab close from shell (canvas.stop() or Ctrl+C)
  const handleCloseCanvasTab = useCallback((canvasId: string) => {
    // Tab path format: canvas://{canvasId}
    const tabPath = `canvas://${canvasId}`

    // Remove any pending resolver
    pendingCanvasRequestsRef.current.delete(tabPath)

    // Close the canvas tab
    closeTab(tabPath)
  }, [closeTab])

  // Callback when canvas element is ready (passed to CanvasTabContent)
  const handleCanvasReady = useCallback((canvasId: string, canvas: HTMLCanvasElement) => {
    const resolver = pendingCanvasRequestsRef.current.get(canvasId)
    if (resolver) {
      resolver(canvas)
      pendingCanvasRequestsRef.current.delete(canvasId)
    }
  }, [])

  // Canvas callbacks to pass to shell
  const canvasCallbacks = useMemo(() => ({
    onRequestCanvasTab: handleRequestCanvasTab,
    onCloseCanvasTab: handleCloseCanvasTab,
  }), [handleRequestCanvasTab, handleCloseCanvasTab])

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
  const explorerProps = createExplorerProps({
    fileTree, activeTab, pendingNewFilePath, pendingNewFolderPath,
    handleCreateFile, handleCreateFolder, renameFile, renameFolder,
    deleteFile, deleteFolder, openFile, openPreviewFile, moveFile, copyFile,
    clearPendingNewFile, clearPendingNewFolder, openMarkdownPreview, openMarkdownEdit: openFile,
    makeTabPermanent, openBinaryViewer, workspaces, isFileSystemAccessSupported: isFileSystemAccessSupported(),
    addVirtualWorkspace, handleAddLocalWorkspace, handleRemoveWorkspace, refreshWorkspace,
    refreshFileTree, supportsRefresh, handleReconnectWorkspace, handleDisconnectWorkspace,
    handleRenameWorkspace, isFolderAlreadyMounted, getUniqueWorkspaceName,
  })

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
                    <>
                      {/* Canvas content - always mounted when canvas tabs exist to keep running in background */}
                      {hasCanvasTabs && (
                        <div style={{ display: activeTabType === 'canvas' ? 'contents' : 'none' }}>
                          <CanvasTabContent
                            tabs={tabs}
                            activeTab={activeTab}
                            canvasCode={canvasCode}
                            onSelectTab={selectTab}
                            onCloseTab={handleCloseTab}
                            onExit={handleCanvasExit}
                            onCanvasReady={handleCanvasReady}
                          />
                        </div>
                      )}
                      {/* Markdown preview - shown when markdown tab is active */}
                      {activeTabType === 'markdown' && (
                        <MarkdownTabContent code={code} tabBarProps={tabBarProps} currentFilePath={activeTab} onOpenMarkdown={openMarkdownPreview} />
                      )}
                      {/* Binary file viewer - shown when binary tab is active */}
                      {activeTabType === 'binary' && activeTab && (
                        <BinaryTabContent filePath={activeTab} fileSystem={compositeFileSystem} tabBarProps={tabBarProps} />
                      )}
                      {/* Editor panel - hidden when canvas, markdown, or binary tab is active */}
                      {/* Note: also show if hasCanvasTabs is false to handle race condition during canvas tab close */}
                      {activeTabType !== 'canvas' && activeTabType !== 'markdown' && activeTabType !== 'binary' && (
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
                    </>
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
                  <BottomPanel
                  fileSystem={compositeFileSystem}
                  onFileSystemChange={refreshFileTree}
                  canvasCallbacks={canvasCallbacks}
                  onFileMove={handleShellFileMove}
                />
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
    isPathReadOnly,
  } = useWorkspaceManager()

  // Create adapted filesystem for IDEContext
  // Pass workspaces so the adapter can include disconnected workspaces in the tree
  const adaptedFileSystem = useMemo(
    () => createFileSystemAdapter(compositeFileSystem, workspaces),
    [compositeFileSystem, workspaces]
  )

  return (
    <IDEContextProvider initialCode={initialCode} fileSystem={adaptedFileSystem} isPathReadOnly={isPathReadOnly}>
      <IDELayoutInner
        className={className}
        compositeFileSystem={compositeFileSystem}
        workspaces={workspaces}
        addVirtualWorkspace={addVirtualWorkspace}
        addLocalWorkspace={addLocalWorkspace}
        removeWorkspace={removeWorkspace}
        isFileSystemAccessSupported={isFileSystemAccessSupported}
        refreshWorkspace={refreshWorkspace}
        refreshAllLocalWorkspaces={refreshAllLocalWorkspaces}
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
