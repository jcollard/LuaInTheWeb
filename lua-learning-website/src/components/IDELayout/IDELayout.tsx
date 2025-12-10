import { useState, useCallback, useMemo } from 'react'
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
import { MenuBar } from '../MenuBar'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useFileExport } from '../../hooks/useFileExport'
import { useTheme } from '../../contexts/useTheme'
import styles from './IDELayout.module.css'
import type { IDELayoutProps } from './types'
import type { MenuDefinition } from '../MenuBar'

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
    createFolder,
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
  } = useIDE()

  const [isRunning, setIsRunning] = useState(false)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)
  const [pendingCloseTabPath, setPendingCloseTabPath] = useState<string | null>(null)

  // Theme support for Settings menu
  const { theme, toggleTheme } = useTheme()

  // File export functionality
  const { exportFile, canExport } = useFileExport()

  const handleExport = useCallback(() => {
    if (fileName && code) {
      exportFile(code, fileName)
    }
  }, [code, fileName, exportFile])

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    try {
      await runCode()
    } finally {
      setIsRunning(false)
    }
  }, [runCode])

  // Menu bar definitions
  const menus: MenuDefinition[] = useMemo(
    () => [
      {
        id: 'file',
        label: 'File',
        items: [
          { id: 'new-file', label: 'New File', action: () => createFileWithRename() },
          { id: 'open-file', label: 'Open File...', disabled: true },
          { type: 'divider' },
          { id: 'save', label: 'Save', shortcut: 'Ctrl+S', action: saveFile, disabled: !isDirty },
          { type: 'divider' },
          { id: 'export', label: 'Export As...', action: handleExport, disabled: !canExport(code) },
        ],
      },
      {
        id: 'edit',
        label: 'Edit',
        items: [
          { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
          { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: true },
          { type: 'divider' },
          { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
          { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
          { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
        ],
      },
      {
        id: 'view',
        label: 'View',
        items: [
          { id: 'toggle-sidebar', label: sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
          { id: 'toggle-terminal', label: terminalVisible ? 'Hide Terminal' : 'Show Terminal', shortcut: 'Ctrl+`', action: toggleTerminal },
        ],
      },
      {
        id: 'run',
        label: 'Run',
        items: [
          { id: 'run-code', label: 'Run Code', shortcut: 'Ctrl+Enter', action: handleRun, disabled: isRunning },
        ],
      },
      {
        id: 'settings',
        label: 'Settings',
        items: [
          { id: 'toggle-theme', label: theme === 'dark' ? 'Light Theme' : 'Dark Theme', action: toggleTheme },
        ],
      },
    ],
    [createFileWithRename, saveFile, isDirty, sidebarVisible, toggleSidebar, terminalVisible, toggleTerminal, handleRun, isRunning, theme, toggleTheme, handleExport, canExport, code]
  )

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

  // Wrapper for FileExplorer's onCreateFolder - generates a unique folder name
  const handleCreateFolder = useCallback((parentPath?: string) => {
    const baseName = 'new-folder'
    const parentDir = parentPath || ''
    const fullPath = parentDir === '/' || parentDir === ''
      ? `/${baseName}`
      : `${parentDir}/${baseName}`
    createFolder(fullPath)
  }, [createFolder])

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
    onCreateFile: handleCreateFile,
    onCreateFolder: handleCreateFolder,
    onRenameFile: renameFile,
    onRenameFolder: renameFolder,
    onDeleteFile: deleteFile,
    onDeleteFolder: deleteFolder,
    onSelectFile: openFile,
    onMoveFile: moveFile,
    onCancelPendingNewFile: clearPendingNewFile,
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
      <MenuBar menus={menus} />
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
