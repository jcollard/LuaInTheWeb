import { useCallback, useMemo, useRef, useState } from 'react'
import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { ConfirmDialog } from '../ConfirmDialog'
import { useIDE } from '../IDEContext/useIDE'
import { AnsiEditorToolbar } from './AnsiEditorToolbar'
import { ColorPanel } from './ColorPanel'
import { LayersPanel } from './LayersPanel'
import { SaveAsDialog } from './SaveAsDialog'
import { useAnsiEditor } from './useAnsiEditor'
import { exportAnsFile } from './ansExport'
import { serializeLayers, deserializeLayers } from './serialization'
import { compositeGrid } from './layerUtils'
import type { LayerState } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiGraphicsEditorProps {
  filePath?: string
}

export function AnsiGraphicsEditor({ filePath }: AnsiGraphicsEditorProps) {
  const { fileSystem, fileTree, refreshFileTree, updateAnsiEditorTabPath } = useIDE()
  const [pendingSave, setPendingSave] = useState<{ path: string; content: string } | null>(null)

  const initialLayerState = useMemo((): LayerState | undefined => {
    if (!filePath || filePath.startsWith('ansi-editor://')) return undefined
    const content = fileSystem.readFile(filePath)
    if (content === null) return undefined
    try {
      return deserializeLayers(content)
    } catch {
      return undefined
    }
  }, [filePath, fileSystem])

  const {
    brush,
    setBrushFg,
    setBrushBg,
    setBrushChar,
    setBrushMode,
    setTool,
    clearGrid,
    markClean,
    onTerminalReady,
    cursorRef,
    dimensionRef,
    isSaveDialogOpen,
    openSaveDialog,
    closeSaveDialog,
    undo,
    redo,
    canUndo,
    canRedo,
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    renameLayer,
    setActiveLayer,
    moveLayerUp,
    moveLayerDown,
    toggleVisibility,
    importPngAsLayer,
    simplifyColors,
    selectionRef,
    textBoundsRef,
    textCursorRef,
    setTextAlign,
    cgaPreview,
    setCgaPreview,
  } = useAnsiEditor({ initialLayerState })

  const handleToggleCgaPreview = useCallback(() => setCgaPreview(!cgaPreview), [cgaPreview, setCgaPreview])

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const activeTextAlign = activeLayer?.type === 'text' ? activeLayer.textAlign : undefined

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportPngClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importPngAsLayer(file)
    }
    e.target.value = ''
  }, [importPngAsLayer])

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
    const content = serializeLayers({ layers, activeLayerId })
    if (fileSystem.exists(fullPath)) {
      setPendingSave({ path: fullPath, content })
      return
    }
    fileSystem.createFile(fullPath, content)
    await finishSaveAs(fullPath)
  }, [layers, activeLayerId, fileSystem, finishSaveAs])

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
      const content = serializeLayers({ layers, activeLayerId })
      fileSystem.writeFile(filePath, content)
      await fileSystem.flush()
      markClean()
    } else {
      openSaveDialog()
    }
  }, [filePath, layers, activeLayerId, fileSystem, markClean, openSaveDialog])

  const handleExportAns = useCallback(() => {
    const grid = compositeGrid(layers)
    let filename = 'untitled.ans'
    if (filePath && !filePath.startsWith('ansi-editor://')) {
      const base = filePath.split('/').pop() ?? 'untitled'
      filename = base.replace(/\.ansi\.lua$/, '.ans')
      if (!filename.endsWith('.ans')) filename = base + '.ans'
    }
    const title = filename.replace(/\.ans$/, '')
    const data = exportAnsFile(grid, title)
    const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [layers, filePath])

  return (
    <div className={styles.editor} data-testid="ansi-graphics-editor">
      <AnsiEditorToolbar
        brush={brush}
        onSetChar={setBrushChar}
        onSetMode={setBrushMode}
        onSetTool={setTool}
        onClear={clearGrid}
        onSave={handleSave}
        onSaveAs={openSaveDialog}
        onImportPng={handleImportPngClick}
        onExportAns={handleExportAns}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        textAlign={activeTextAlign}
        onSetTextAlign={setTextAlign}
        cgaPreview={cgaPreview}
        onToggleCgaPreview={handleToggleCgaPreview}
      />
      <div className={styles.editorBody}>
        <ColorPanel
          selectedFg={brush.fg}
          selectedBg={brush.bg}
          onSetFg={setBrushFg}
          onSetBg={setBrushBg}
          onSimplifyColors={simplifyColors}
          layers={layers}
          activeLayerId={activeLayerId}
        />
        <div className={styles.canvas}>
          <AnsiTerminalPanel
            isActive={true}
            onTerminalReady={onTerminalReady}
          />
        </div>
        <LayersPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSetActive={setActiveLayer}
          onToggleVisibility={toggleVisibility}
          onRename={renameLayer}
          onMoveUp={moveLayerUp}
          onMoveDown={moveLayerDown}
          onAdd={addLayer}
          onRemove={removeLayer}
        />
      </div>
      <div ref={cursorRef} className={styles.cellCursor} />
      <div ref={dimensionRef} className={styles.dimensionLabel} />
      <div ref={selectionRef} className={styles.selectionOverlay} />
      <div ref={textBoundsRef} className={styles.textBoundsOverlay} />
      <div ref={textCursorRef} className={styles.textCursor} />
      <SaveAsDialog
        isOpen={isSaveDialogOpen}
        tree={fileTree}
        onSave={handleSaveAs}
        onCancel={closeSaveDialog}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        data-testid="png-file-input"
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
