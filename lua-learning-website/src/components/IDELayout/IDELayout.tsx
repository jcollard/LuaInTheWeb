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
import { useWorkspaceManager } from '../../hooks/useWorkspaceManager'
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
    activePanel,
    setActivePanel,
    sidebarVisible,
    toggleSidebar,
    terminalVisible,
    toggleTerminal,
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

  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [pendingCloseTabPath, setPendingCloseTabPath] = useState<string | null>(null)

  // Workspace management
  const {
    workspaces,
    addVirtualWorkspace,
    addLocalWorkspace,
    removeWorkspace,
    isFileSystemAccessSupported,
  } = useWorkspaceManager()

  // Handle adding a local workspace (triggers directory picker)
  const handleAddLocalWorkspace = useCallback(
    async (name: string) => {
      try {
        const handle = await window.showDirectoryPicker({
          mode: 'readwrite',
        })
        await addLocalWorkspace(name, handle)
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to open directory:', err)
        }
      }
    },
    [addLocalWorkspace]
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
    // Workspace management props
    workspaceProps: {
      workspaces,
      isFileSystemAccessSupported: isFileSystemAccessSupported(),
      onAddVirtualWorkspace: addVirtualWorkspace,
      onAddLocalWorkspace: handleAddLocalWorkspace,
      onRemoveWorkspace: removeWorkspace,
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
                  <BottomPanel fileSystem={fileSystem} />
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
  return (
    <IDEContextProvider initialCode={initialCode}>
      <IDELayoutInner className={className} />
    </IDEContextProvider>
  )
}
