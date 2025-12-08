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
    createFile,
    createFolder,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    openFile,
    // Tabs
    tabs,
    activeTab,
    selectTab,
    closeTab,
  } = useIDE()

  const [isRunning, setIsRunning] = useState(false)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)

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
  })

  const combinedClassName = className
    ? `${styles.ideLayout} ${className}`
    : styles.ideLayout

  // Generate unique filename for new files
  const generateFileName = useCallback((parentPath?: string, isFolder = false) => {
    const baseName = isFolder ? 'new-folder' : 'new-file.lua'
    const parentDir = parentPath || ''
    const fullPath = parentDir === '/' || parentDir === ''
      ? `/${baseName}`
      : `${parentDir}/${baseName}`
    return fullPath
  }, [])

  // Wrapper for FileExplorer's onCreateFile - generates a unique filename
  const handleCreateFile = useCallback((parentPath?: string) => {
    const newPath = generateFileName(parentPath, false)
    createFile(newPath, '-- New file\n')
    openFile(newPath)
  }, [createFile, generateFileName, openFile])

  // Wrapper for FileExplorer's onCreateFolder - generates a unique folder name
  const handleCreateFolder = useCallback((parentPath?: string) => {
    const newPath = generateFileName(parentPath, true)
    createFolder(newPath)
  }, [createFolder, generateFileName])

  // Explorer props for FileExplorer
  const explorerProps = {
    tree: fileTree,
    selectedPath: activeTab,
    onCreateFile: handleCreateFile,
    onCreateFolder: handleCreateFolder,
    onRenameFile: renameFile,
    onRenameFolder: renameFolder,
    onDeleteFile: deleteFile,
    onDeleteFolder: deleteFolder,
    onSelectFile: openFile,
  }

  // Tab bar props for EditorPanel (only when tabs exist)
  const tabBarProps = tabs.length > 0 ? {
    tabs,
    activeTab,
    onSelect: selectTab,
    onClose: closeTab,
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
    </div>
  )
}

/**
 * Main IDE Layout component
 */
export function IDELayout({
  initialCode = '',
  initialFileName = 'untitled.lua',
  className,
}: IDELayoutProps) {
  return (
    <IDEContextProvider initialCode={initialCode} initialFileName={initialFileName}>
      <IDELayoutInner className={className} />
    </IDEContextProvider>
  )
}
