/* eslint-disable max-lines */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { IDEContextProvider, useIDE } from '../IDEContext'
import { ActivityBar } from '../ActivityBar'
import { StatusBar } from '../StatusBar'
import { SidebarPanel } from '../SidebarPanel'
import { VirtualizedEditorPanel } from '../EditorPanel'
import { BottomPanel, type ShellTerminalHandle } from '../BottomPanel'
import { IDEPanelGroup, type IDEPanelGroupHandle } from '../IDEPanelGroup'
import { IDEPanel } from '../IDEPanel'
import { IDEResizeHandle } from '../IDEResizeHandle'
import { ConfirmDialog } from '../ConfirmDialog'
import { ToastContainer } from '../Toast'
import { WelcomeScreen } from '../WelcomeScreen'
import { CanvasTabContent } from './CanvasTabContent'
import { MarkdownTabContent } from './MarkdownTabContent'
import { BinaryTabContent } from './BinaryTabContent'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useBeforeUnloadWarning } from '../../hooks/useBeforeUnloadWarning'
import { useCanvasTabManager } from '../../hooks/useCanvasTabManager'
import { useCanvasWindowManager } from '../../hooks/useCanvasWindowManager'
import { useWindowFocusRefresh } from '../../hooks/useWindowFocusRefresh'
import { useWorkspaceManager } from '../../hooks/useWorkspaceManager'
import { useEditorExtensions } from '../../hooks/useEditorExtensions'
import { createFileSystemAdapter } from '../../hooks/compositeFileSystemAdapter'
import { initFormatter, formatLuaCode } from '../../utils/luaFormatter'
import type { Workspace } from '../../hooks/workspaceTypes'
import type { IFileSystem, ScreenMode } from '@lua-learning/shell-core'
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
  pendingWorkspaces: Set<string>
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
  pendingWorkspaces,
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
    pinTab,
    unpinTab,
    reorderTab,
    closeToRight,
    closeOthers,
    // Toasts
    toasts,
    showError,
    dismissToast,
    // Recent files
    recentFiles,
    clearRecentFiles,
    // Auto-save
    autoSaveEnabled,
    toggleAutoSave,
    saveAllFiles,
    // File upload
    uploadFiles,
    uploadFolder,
    // Tab editor manager
    tabEditorManager,
  } = useIDE()

  // Cursor position - TODO: expose from VirtualizedEditorPanel when needed
  const cursorLine = 1
  const cursorColumn = 1
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
  const { handleEditorReady: handleEditorReadyWithPath } = useEditorExtensions({
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
    saveAllFiles,
  })

  // Always warn users before leaving the page (browser will show generic "Leave site?" dialog)
  useBeforeUnloadWarning()

  // Shell terminal ref for command injection (cd to location, etc.)
  const shellRef = useRef<ShellTerminalHandle>(null)

  // Vertical panel group ref for programmatic layout control (terminal collapse/expand)
  const verticalPanelGroupRef = useRef<IDEPanelGroupHandle>(null)
  // Store layout before terminal collapse to restore on expand
  const savedTerminalLayoutRef = useRef<number[] | null>(null)
  // Track previous terminal visibility to detect actual changes (not initial mount)
  const prevTerminalVisibleRef = useRef<boolean | null>(null)

  // Handle terminal visibility changes - expand editor to 100% when terminal is hidden
  useEffect(() => {
    const panelGroup = verticalPanelGroupRef.current
    if (!panelGroup) return

    // Skip initial mount - only act on actual visibility changes
    if (prevTerminalVisibleRef.current === null) {
      prevTerminalVisibleRef.current = terminalVisible
      return
    }

    // Skip if visibility hasn't actually changed
    if (prevTerminalVisibleRef.current === terminalVisible) return
    prevTerminalVisibleRef.current = terminalVisible

    // Verify panel group has panels registered before modifying layout
    const currentLayout = panelGroup.getLayout()
    if (currentLayout.length !== 2) return

    if (!terminalVisible) {
      // Terminal is being hidden - save current layout and expand editor to 100%
      if (currentLayout[1] > 0) {
        savedTerminalLayoutRef.current = currentLayout
      }
      panelGroup.setLayout([100, 0])
    } else {
      // Terminal is being shown - restore previous layout or use default
      const savedLayout = savedTerminalLayoutRef.current
      if (savedLayout && savedLayout.length === 2) {
        panelGroup.setLayout(savedLayout)
      } else {
        // Default: 70% editor, 30% terminal
        panelGroup.setLayout([70, 30])
      }
    }
  }, [terminalVisible])

  // Canvas tab request management for shell-based canvas.start()
  // Stores pending resolvers for canvas requests (canvasId -> resolver)
  const pendingCanvasRequestsRef = useRef<Map<string, (canvas: HTMLCanvasElement) => void>>(new Map())

  // Canvas close handler management for UI-initiated tab close
  // Stores handlers to call when a canvas tab is closed from UI (canvasId -> stopHandler)
  const canvasCloseHandlersRef = useRef<Map<string, () => void>>(new Map())

  // Canvas reload handler management for UI-triggered hot reload
  // Stores handlers to call when reload is requested from UI (canvasId -> reloadHandler)
  const canvasReloadHandlersRef = useRef<Map<string, () => void>>(new Map())

  // Canvas tab execution control handlers (pause/play/stop/step)
  const canvasExecutionHandlersRef = useRef<Map<string, {
    pause?: () => void
    play?: () => void
    stop?: () => void
    step?: () => void
  }>>(new Map())

  // Canvas tab control state (isRunning, isPaused) for UI updates
  const [canvasControlStates, setCanvasControlStates] = useState<Map<string, { isRunning: boolean; isPaused: boolean }>>(new Map())

  // Canvas tab error state (canvasId -> error message)
  const [canvasErrorStates, setCanvasErrorStates] = useState<Map<string, string>>(new Map())

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

  // Register a handler to be called when a canvas tab is closed from the UI
  const registerCanvasCloseHandler = useCallback((canvasId: string, handler: () => void) => {
    canvasCloseHandlersRef.current.set(canvasId, handler)
  }, [])

  // Unregister a canvas close handler (called when canvas stops normally)
  const unregisterCanvasCloseHandler = useCallback((canvasId: string) => {
    canvasCloseHandlersRef.current.delete(canvasId)
  }, [])

  // Canvas window management for shell-based canvas.start() with --canvas=window
  const {
    openCanvasWindow,
    disconnectCanvasWindow,
    registerWindowCloseHandler,
    unregisterWindowCloseHandler,
    registerWindowReloadHandler,
    unregisterWindowReloadHandler,
    triggerAutoReload,
    registerWindowPauseHandler,
    registerWindowPlayHandler,
    registerWindowStopHandler,
    registerWindowStepHandler,
    unregisterWindowExecutionHandlers,
    updateWindowControlState,
    showErrorOverlay,
    clearErrorOverlay,
  } = useCanvasWindowManager()

  // Listen for Lua file save events to trigger auto-reload on canvas windows
  // This is dispatched by IDEContext.saveFile when a .lua file is saved
  useEffect(() => {
    const handleLuaFileSaved = () => {
      triggerAutoReload()
    }
    window.addEventListener('lua-file-saved', handleLuaFileSaved)
    return () => {
      window.removeEventListener('lua-file-saved', handleLuaFileSaved)
    }
  }, [triggerAutoReload])

  // Handle canvas window request from shell (lua --canvas=window)
  const handleRequestCanvasWindow = useCallback(
    async (
      canvasId: string,
      screenMode?: ScreenMode,
      noToolbar?: boolean
    ): Promise<HTMLCanvasElement> => {
      // Register the close handler before opening the window
      // The window manager will call this when user closes the popup
      return openCanvasWindow(canvasId, screenMode, noToolbar)
    },
    [openCanvasWindow]
  )

  // Handle canvas window disconnect from shell (canvas.stop() or Ctrl+C)
  // This keeps the window open with "No canvas connected" overlay for reuse
  const handleCloseCanvasWindow = useCallback((canvasId: string) => {
    disconnectCanvasWindow(canvasId)
  }, [disconnectCanvasWindow])

  // Register a handler to be called when reload is requested from the UI
  const registerCanvasReloadHandler = useCallback((canvasId: string, handler: () => void) => {
    canvasReloadHandlersRef.current.set(canvasId, handler)
  }, [])

  // Unregister a canvas reload handler (called when canvas stops)
  const unregisterCanvasReloadHandler = useCallback((canvasId: string) => {
    canvasReloadHandlersRef.current.delete(canvasId)
  }, [])

  // Show error overlay for canvas tab
  const showCanvasTabError = useCallback((canvasId: string, error: string) => {
    setCanvasErrorStates(prev => {
      const next = new Map(prev)
      next.set(canvasId, error)
      return next
    })
  }, [])

  // Clear error overlay for canvas tab
  const clearCanvasTabError = useCallback((canvasId: string) => {
    setCanvasErrorStates(prev => {
      const next = new Map(prev)
      next.delete(canvasId)
      return next
    })
  }, [])

  // Handle canvas reload request from UI (calls the registered reload handler)
  const handleCanvasReload = useCallback((canvasId: string) => {
    const reloadHandler = canvasReloadHandlersRef.current.get(canvasId)
    if (reloadHandler) {
      reloadHandler()
    }
    // Clear error when reloading
    clearCanvasTabError(canvasId)
  }, [clearCanvasTabError])

  // Register canvas tab execution handlers
  const registerCanvasPauseHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = canvasExecutionHandlersRef.current.get(canvasId) ?? {}
    canvasExecutionHandlersRef.current.set(canvasId, { ...existing, pause: handler })
  }, [])

  const registerCanvasPlayHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = canvasExecutionHandlersRef.current.get(canvasId) ?? {}
    canvasExecutionHandlersRef.current.set(canvasId, { ...existing, play: handler })
  }, [])

  const registerCanvasStopHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = canvasExecutionHandlersRef.current.get(canvasId) ?? {}
    canvasExecutionHandlersRef.current.set(canvasId, { ...existing, stop: handler })
  }, [])

  const registerCanvasStepHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = canvasExecutionHandlersRef.current.get(canvasId) ?? {}
    canvasExecutionHandlersRef.current.set(canvasId, { ...existing, step: handler })
  }, [])

  const unregisterCanvasExecutionHandlers = useCallback((canvasId: string) => {
    canvasExecutionHandlersRef.current.delete(canvasId)
    setCanvasControlStates(prev => {
      const next = new Map(prev)
      next.delete(canvasId)
      return next
    })
  }, [])

  const updateCanvasControlState = useCallback((canvasId: string, state: { isRunning: boolean; isPaused: boolean }) => {
    setCanvasControlStates(prev => {
      const next = new Map(prev)
      next.set(canvasId, state)
      return next
    })
  }, [])

  // Handle canvas tab execution control from UI
  const handleCanvasPause = useCallback((canvasId: string) => {
    const handlers = canvasExecutionHandlersRef.current.get(canvasId)
    if (handlers?.pause) {
      handlers.pause()
    }
  }, [])

  const handleCanvasPlay = useCallback((canvasId: string) => {
    const handlers = canvasExecutionHandlersRef.current.get(canvasId)
    if (handlers?.play) {
      handlers.play()
    }
    // Clear error when resuming
    clearCanvasTabError(canvasId)
  }, [clearCanvasTabError])

  const handleCanvasStop = useCallback((canvasId: string) => {
    const handlers = canvasExecutionHandlersRef.current.get(canvasId)
    if (handlers?.stop) {
      handlers.stop()
    }
  }, [])

  const handleCanvasStep = useCallback((canvasId: string) => {
    const handlers = canvasExecutionHandlersRef.current.get(canvasId)
    if (handlers?.step) {
      handlers.step()
    }
  }, [])

  // Canvas callbacks to pass to shell
  const canvasCallbacks = useMemo(() => ({
    onRequestCanvasTab: handleRequestCanvasTab,
    onCloseCanvasTab: handleCloseCanvasTab,
    onRequestCanvasWindow: handleRequestCanvasWindow,
    onCloseCanvasWindow: handleCloseCanvasWindow,
    registerCanvasCloseHandler,
    unregisterCanvasCloseHandler,
    registerWindowCloseHandler,
    unregisterWindowCloseHandler,
    registerCanvasReloadHandler,
    unregisterCanvasReloadHandler,
    registerWindowReloadHandler,
    unregisterWindowReloadHandler,
    registerWindowPauseHandler,
    registerWindowPlayHandler,
    registerWindowStopHandler,
    registerWindowStepHandler,
    unregisterWindowExecutionHandlers,
    updateWindowControlState,
    showErrorOverlay: (canvasId: string, error: string) => {
      // Route to both window and tab modes
      showErrorOverlay(canvasId, error)
      showCanvasTabError(canvasId, error)
    },
    clearErrorOverlay: (canvasId: string) => {
      // Route to both window and tab modes
      clearErrorOverlay(canvasId)
      clearCanvasTabError(canvasId)
    },
    // Canvas tab execution control handlers
    registerCanvasPauseHandler,
    registerCanvasPlayHandler,
    registerCanvasStopHandler,
    registerCanvasStepHandler,
    unregisterCanvasExecutionHandlers,
    updateCanvasControlState,
  }), [
    handleRequestCanvasTab,
    handleCloseCanvasTab,
    handleRequestCanvasWindow,
    handleCloseCanvasWindow,
    registerCanvasCloseHandler,
    unregisterCanvasCloseHandler,
    registerWindowCloseHandler,
    unregisterWindowCloseHandler,
    registerCanvasReloadHandler,
    unregisterCanvasReloadHandler,
    registerWindowReloadHandler,
    unregisterWindowReloadHandler,
    registerWindowPauseHandler,
    registerWindowPlayHandler,
    registerWindowStopHandler,
    registerWindowStepHandler,
    unregisterWindowExecutionHandlers,
    updateWindowControlState,
    showErrorOverlay,
    clearErrorOverlay,
    showCanvasTabError,
    clearCanvasTabError,
    registerCanvasPauseHandler,
    registerCanvasPlayHandler,
    registerCanvasStopHandler,
    registerCanvasStepHandler,
    unregisterCanvasExecutionHandlers,
    updateCanvasControlState,
  ])

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
      // If this is a canvas tab, invoke the close handler to stop the canvas process
      if (path.startsWith('canvas://')) {
        const canvasId = path.replace('canvas://', '')
        const closeHandler = canvasCloseHandlersRef.current.get(canvasId)
        if (closeHandler) {
          closeHandler()
          // Handler will clean itself up via unregisterCanvasCloseHandler
        }
      }
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

  // Handle "cd to location" from file explorer context menu
  const handleCdToLocation = useCallback((path: string) => {
    // Show terminal if hidden
    if (!terminalVisible) {
      toggleTerminal()
    }
    // Execute cd command in shell
    shellRef.current?.executeCommand(`cd "${path}"`)
  }, [terminalVisible, toggleTerminal])

  // Handle file open request from shell's 'open' command
  // Routes to appropriate viewer based on file type
  const handleRequestOpenFile = useCallback((filePath: string) => {
    const lowerPath = filePath.toLowerCase()
    if (lowerPath.endsWith('.md')) {
      openMarkdownPreview(filePath)
    } else if (
      lowerPath.endsWith('.png') || lowerPath.endsWith('.jpg') ||
      lowerPath.endsWith('.jpeg') || lowerPath.endsWith('.gif') ||
      lowerPath.endsWith('.bmp') || lowerPath.endsWith('.webp') ||
      lowerPath.endsWith('.ico') || lowerPath.endsWith('.svg') ||
      lowerPath.endsWith('.mp3') || lowerPath.endsWith('.wav') ||
      lowerPath.endsWith('.ogg') || lowerPath.endsWith('.mp4') ||
      lowerPath.endsWith('.webm') || lowerPath.endsWith('.pdf') ||
      lowerPath.endsWith('.zip') || lowerPath.endsWith('.tar') ||
      lowerPath.endsWith('.gz') || lowerPath.endsWith('.bin') ||
      lowerPath.endsWith('.exe') || lowerPath.endsWith('.dll') ||
      lowerPath.endsWith('.so') || lowerPath.endsWith('.dylib')
    ) {
      openBinaryViewer(filePath)
    } else {
      openFile(filePath)
    }
  }, [openFile, openMarkdownPreview, openBinaryViewer])

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
    makeTabPermanent, openBinaryViewer, handleCdToLocation, uploadFiles, uploadFolder, workspaces, pendingWorkspaces, isFileSystemAccessSupported: isFileSystemAccessSupported(),
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
    onPinTab: pinTab,
    onUnpinTab: unpinTab,
    onReorder: reorderTab,
    onCloseToRight: closeToRight,
    onCloseOthers: closeOthers,
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
              <IDEPanelGroup ref={verticalPanelGroupRef} direction="vertical" persistId="ide-editor">
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
                            onReload={handleCanvasReload}
                            isActive={activeTabType === 'canvas'}
                            canvasControlStates={canvasControlStates}
                            canvasErrorStates={canvasErrorStates}
                            onPause={handleCanvasPause}
                            onPlay={handleCanvasPlay}
                            onStop={handleCanvasStop}
                            onStep={handleCanvasStep}
                          />
                        </div>
                      )}
                      {/* Markdown preview - shown when markdown tab is active */}
                      {/* Note: Read directly from filesystem since tabEditorManager only tracks file tabs */}
                      {activeTabType === 'markdown' && activeTab && (
                        <MarkdownTabContent
                          code={
                            compositeFileSystem.exists(activeTab)
                              ? compositeFileSystem.readFile(activeTab)
                              : ''
                          }
                          tabBarProps={tabBarProps}
                          currentFilePath={activeTab}
                          onOpenMarkdown={openMarkdownPreview}
                        />
                      )}
                      {/* Binary file viewer - shown when binary tab is active */}
                      {activeTabType === 'binary' && activeTab && compositeFileSystem.exists(activeTab) && (
                        <BinaryTabContent filePath={activeTab} fileSystem={compositeFileSystem} tabBarProps={tabBarProps} />
                      )}
                      {/* Editor panel - hidden (not unmounted) when canvas, markdown, or binary tab is active */}
                      {/* Uses display:none to preserve editor state including scroll position */}
                      <div style={{ display: (activeTabType === 'file' || activeTabType === undefined || (activeTabType === 'canvas' && !hasCanvasTabs)) ? 'contents' : 'none' }}>
                        <VirtualizedEditorPanel
                          tabEditorManager={tabEditorManager}
                          activeTab={activeTab}
                          tabBarProps={tabBarProps}
                          onFormat={handleFormat}
                          isFormatting={isFormatting}
                          onEditorReady={handleEditorReadyWithPath}
                          autoSaveEnabled={autoSaveEnabled}
                          onToggleAutoSave={toggleAutoSave}
                          onSaveAllFiles={saveAllFiles}
                        />
                      </div>
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
                    ref={shellRef}
                    fileSystem={compositeFileSystem}
                    onFileSystemChange={refreshFileTree}
                    canvasCallbacks={canvasCallbacks}
                    onFileMove={handleShellFileMove}
                    onRequestOpenFile={handleRequestOpenFile}
                    visible={terminalVisible}
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
    pendingWorkspaces,
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
        pendingWorkspaces={pendingWorkspaces}
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
