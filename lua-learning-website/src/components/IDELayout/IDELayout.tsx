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
    activePanel,
    setActivePanel,
    sidebarVisible,
    runCode,
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

  const combinedClassName = className
    ? `${styles.ideLayout} ${className}`
    : styles.ideLayout

  return (
    <div className={combinedClassName} data-testid="ide-layout">
      <div className={styles.mainContainer}>
        <ActivityBar
          activeItem={activePanel}
          onItemClick={setActivePanel}
        />
        <div className={styles.workArea}>
          <IDEPanelGroup direction="horizontal" persistId="ide-main">
            {sidebarVisible && (
              <>
                <IDEPanel defaultSize={20} minSize={15} maxSize={40}>
                  <SidebarPanel activePanel={activePanel} />
                </IDEPanel>
                <IDEResizeHandle />
              </>
            )}
            <IDEPanel defaultSize={sidebarVisible ? 80 : 100} minSize={40}>
              <IDEPanelGroup direction="vertical" persistId="ide-editor">
                <IDEPanel defaultSize={70} minSize={30}>
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
                  />
                </IDEPanel>
                <IDEResizeHandle />
                <IDEPanel defaultSize={30} minSize={15}>
                  <BottomPanel terminalOutput={terminalOutput} />
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
