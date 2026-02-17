import { useCallback, useMemo, useState } from 'react'
import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { ConfirmDialog } from '../ConfirmDialog'
import { useIDE } from '../IDEContext/useIDE'
import { AnsiEditorToolbar } from './AnsiEditorToolbar'
import { SaveAsDialog } from './SaveAsDialog'
import { useAnsiEditor } from './useAnsiEditor'
import { serializeGrid, deserializeGrid } from './serialization'
import type { AnsiGrid } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiGraphicsEditorProps {
  filePath?: string
}

export function AnsiGraphicsEditor({ filePath }: AnsiGraphicsEditorProps) {
  const { fileSystem, fileTree, refreshFileTree, updateAnsiEditorTabPath } = useIDE()
  const [pendingSave, setPendingSave] = useState<{ path: string; content: string } | null>(null)

  const initialGrid = useMemo((): AnsiGrid | undefined => {
    if (!filePath || filePath.startsWith('ansi-editor://')) return undefined
    const content = fileSystem.readFile(filePath)
    if (content === null) return undefined
    try {
      return deserializeGrid(content)
    } catch {
      return undefined
    }
  }, [filePath, fileSystem])

  const {
    grid,
    brush,
    setBrushFg,
    setBrushBg,
    setBrushChar,
    clearGrid,
    markClean,
    onTerminalReady,
    cursorRef,
    isSaveDialogOpen,
    openSaveDialog,
    closeSaveDialog,
  } = useAnsiEditor({ initialGrid })

  const finishSaveAs = useCallback(async (savedPath: string) => {
    await fileSystem.flush()
    refreshFileTree()
    closeSaveDialog()
    if (filePath) {
      updateAnsiEditorTabPath(filePath, savedPath)
    }
  }, [fileSystem, refreshFileTree, closeSaveDialog, filePath, updateAnsiEditorTabPath])

  const handleSaveAs = useCallback(async (folderPath: string, fileName: string) => {
    const fullPath = folderPath === '/' ? `/${fileName}` : `${folderPath}/${fileName}`
    const content = serializeGrid(grid)
    if (fileSystem.exists(fullPath)) {
      setPendingSave({ path: fullPath, content })
      return
    }
    fileSystem.createFile(fullPath, content)
    await finishSaveAs(fullPath)
  }, [grid, fileSystem, finishSaveAs])

  const handleConfirmOverwrite = useCallback(async () => {
    if (!pendingSave) return
    fileSystem.writeFile(pendingSave.path, pendingSave.content)
    await finishSaveAs(pendingSave.path)
    setPendingSave(null)
  }, [pendingSave, fileSystem, finishSaveAs])

  const handleCancelOverwrite = useCallback(() => {
    setPendingSave(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (filePath && !filePath.startsWith('ansi-editor://')) {
      const content = serializeGrid(grid)
      fileSystem.writeFile(filePath, content)
      await fileSystem.flush()
      markClean()
    } else {
      openSaveDialog()
    }
  }, [filePath, grid, fileSystem, markClean, openSaveDialog])

  return (
    <div className={styles.editor} data-testid="ansi-graphics-editor">
      <AnsiEditorToolbar
        brush={brush}
        onSetFg={setBrushFg}
        onSetBg={setBrushBg}
        onSetChar={setBrushChar}
        onClear={clearGrid}
        onSave={handleSave}
        onSaveAs={openSaveDialog}
      />
      <div className={styles.canvas}>
        <AnsiTerminalPanel
          isActive={true}
          onTerminalReady={onTerminalReady}
        />
      </div>
      <div ref={cursorRef} className={styles.cellCursor} />
      <SaveAsDialog
        isOpen={isSaveDialogOpen}
        tree={fileTree}
        onSave={handleSaveAs}
        onCancel={closeSaveDialog}
      />
      <ConfirmDialog
        isOpen={pendingSave !== null}
        title="Overwrite File"
        message={`The file "${pendingSave?.path ?? ''}" already exists. Do you want to overwrite it?`}
        confirmLabel="Overwrite"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmOverwrite}
        onCancel={handleCancelOverwrite}
      />
    </div>
  )
}
