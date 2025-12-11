import { useState, useCallback } from 'react'
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
import styles from './IDELayout.module.css'
import type { IDELayoutProps } from './types'

/**
 * Inner component that uses IDE context
 */
function IDELayoutInner({ className }: { className?: string }) {
  const {
    code,
    setCode,
    fileName,
    isDirty,
    terminalOutput,
    isAwaitingInput,
    submitInput,
    activePanel,
    setActivePanel,
    sidebarVisible,
    toggleSidebar,
    terminalVisible,
    toggleTerminal,
    runCode,
    // Filesystem
    fileTree,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    moveFile,
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
    dismissToast,
    // Recent files
    recentFiles,
    clearRecentFiles,
    // Filesystem (for shell)
    fileSystem,
  } = useIDE()

  const [isRunning, setIsRunning] = useState(false)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [pendingCloseTabPath, setPendingCloseTabPath] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    try {
      await runCode()
    } finally {
      setIsRunning(false)
    }
  }, [runCode])

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    runCode: handleRun,
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

  // Open REPL (show terminal if hidden)
  const handleOpenRepl = useCallback(() => {
    if (!terminalVisible) {
      toggleTerminal()
    }
  }, [terminalVisible, toggleTerminal])

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
    onCancelPendingNewFile: clearPendingNewFile,
    onCancelPendingNewFolder: clearPendingNewFolder,
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
                <IDEPanel defaultSize={terminalVisible ? 70 : 100} minSize={30}>
                  {tabs.length === 0 ? (
                    <WelcomeScreen
                      recentFiles={recentFiles}
                      onCreateFile={() => handleCreateFile()}
                      onOpenFile={openFile}
                      onOpenRepl={handleOpenRepl}
                      onClearRecentFiles={clearRecentFiles}
                    />
                  ) : (
                    <EditorPanel
                      code={code}
                      onChange={setCode}
                      fileName={fileName}
                      isDirty={isDirty}
                      onRun={handleRun}
                      isRunning={isRunning}
                      cursorLine={cursorLine}
                      cursorColumn={cursorColumn}
                      onCursorChange={(line, col) => {
                        setCursorLine(line)
                        setCursorColumn(col)
                      }}
                      tabBarProps={tabBarProps}
                    />
                  )}
                </IDEPanel>
                {terminalVisible && (
                  <>
                    <IDEResizeHandle />
                    <IDEPanel defaultSize={30} minSize={15}>
                      <BottomPanel
                        terminalOutput={terminalOutput}
                        isAwaitingInput={isAwaitingInput}
                        onSubmitInput={submitInput}
                        fileSystem={fileSystem}
                      />
                    </IDEPanel>
                  </>
                )}
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
  return (
    <IDEContextProvider initialCode={initialCode}>
      <IDELayoutInner className={className} />
    </IDEContextProvider>
  )
}
