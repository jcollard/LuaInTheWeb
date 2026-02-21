import { useCallback, useMemo, useRef, useState } from 'react'
import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { ConfirmDialog } from '../ConfirmDialog'
import { useIDE } from '../IDEContext/useIDE'
import { AnsiEditorToolbar } from './AnsiEditorToolbar'
import { ColorPanel } from './ColorPanel'
import { FramesPanel } from './FramesPanel'
import { LayersPanel } from './LayersPanel'
import { SaveAsDialog } from './SaveAsDialog'
import { ToastContainer } from './ToastContainer'
import { useAnsiEditor } from './useAnsiEditor'
import { useToast } from './useToast'
import { exportAnsFile } from './ansExport'
import { exportShFile, exportAnimatedShFile } from './shExport'
import { serializeLayers, deserializeLayers } from './serialization'
import { compositeGrid, visibleDrawableLayers } from './layerUtils'
import type { AnsiGrid, Layer, LayerState } from './types'
import styles from './AnsiGraphicsEditor.module.css'

/** Find the maximum frame count across all visible drawn layers. */
function getMaxFrameCount(layers: Layer[]): number {
  const drawable = visibleDrawableLayers(layers)
  let max = 1
  for (const layer of drawable) {
    if (layer.type === 'drawn' && layer.frames.length > max) {
      max = layer.frames.length
    }
  }
  return max
}

/** Composite each frame index across all layers, clamping single-frame layers to frame 0. */
function allFrameComposites(layers: Layer[], frameCount: number): AnsiGrid[] {
  const frames: AnsiGrid[] = []
  for (let f = 0; f < frameCount; f++) {
    const snapshotLayers = layers.map(layer => {
      if (layer.type !== 'drawn') return layer
      const frameIdx = Math.min(f, layer.frames.length - 1)
      return { ...layer, grid: layer.frames[frameIdx] }
    })
    frames.push(compositeGrid(snapshotLayers))
  }
  return frames
}

/** Derive an export filename from the editor's filePath, replacing the extension. */
function deriveExportFilename(filePath: string | undefined, ext: string): string {
  if (!filePath || filePath.startsWith('ansi-editor://')) return `untitled.${ext}`
  const base = filePath.split('/').pop() ?? 'untitled'
  const replaced = base.replace(/\.ansi\.lua$/, `.${ext}`)
  return replaced.endsWith(`.${ext}`) ? replaced : `${base}.${ext}`
}

/** Trigger a browser download for the given blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface AnsiGraphicsEditorProps {
  filePath?: string
}

export function AnsiGraphicsEditor({ filePath }: AnsiGraphicsEditorProps) {
  const { fileSystem, fileTree, refreshFileTree, updateAnsiEditorTabPath } = useIDE()
  const [pendingSave, setPendingSave] = useState<{ path: string; content: string } | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)

  const { toasts, showToast } = useToast()
  const handleSaveRef = useRef<() => void>(() => {})
  const handleOpenFileMenuRef = useRef<() => void>(() => {})
  const handleOpenSaveDialogRef = useRef<() => void>(() => {})

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
    setBlendRatio,
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
    reorderLayer,
    toggleVisibility,
    mergeDown,
    wrapInGroup,
    removeFromGroup,
    duplicateLayer,
    toggleGroupCollapsed,
    importPngAsLayer,
    simplifyColors,
    selectionRef,
    textBoundsRef,
    textCursorRef,
    setTextAlign,
    flipSelectionHorizontal,
    flipSelectionVertical,
    cgaPreview,
    setCgaPreview,
    setBorderStyle,
    activeLayerIsGroup,
    isMoveDragging,
    flipOriginOverlayRef,
    flipOrigin,
    flipLayerHorizontal,
    flipLayerVertical,
    addFrame,
    duplicateFrame,
    removeFrame,
    setCurrentFrame,
    setFrameDuration,
    isPlaying,
    togglePlayback,
    activeLayerFrameCount,
    activeLayerCurrentFrame,
    activeLayerFrameDuration,
  } = useAnsiEditor({
    initialLayerState,
    onSave: () => handleSaveRef.current(),
    onSaveAs: () => handleOpenSaveDialogRef.current(),
    onOpenFileMenu: () => handleOpenFileMenuRef.current(),
    onShowToast: showToast,
  })

  const handleToggleCgaPreview = useCallback(() => setCgaPreview(!cgaPreview), [cgaPreview, setCgaPreview])

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const activeTextAlign = activeLayer?.type === 'text' ? activeLayer.textAlign : undefined
  const activeLayerIsDrawn = activeLayer?.type === 'drawn'

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

  handleSaveRef.current = handleSave
  handleOpenSaveDialogRef.current = openSaveDialog
  handleOpenFileMenuRef.current = useCallback(() => setFileMenuOpen(true), [])

  const handleExportAns = useCallback(() => {
    const grid = compositeGrid(layers)
    const filename = deriveExportFilename(filePath, 'ans')
    const title = filename.replace(/\.ans$/, '')
    const data = exportAnsFile(grid, title)
    downloadBlob(new Blob([new Uint8Array(data)], { type: 'application/octet-stream' }), filename)
  }, [layers, filePath])

  const handleExportSh = useCallback(() => {
    const filename = deriveExportFilename(filePath, 'sh')
    const maxFrames = getMaxFrameCount(layers)

    let script: string
    if (maxFrames > 1) {
      const frames = allFrameComposites(layers, maxFrames)
      const drawable = visibleDrawableLayers(layers)
      const drawnLayer = drawable.find(l => l.type === 'drawn' && l.frames.length > 1)
      const durationMs = drawnLayer?.type === 'drawn' ? drawnLayer.frameDurationMs : 100
      script = exportAnimatedShFile(frames, durationMs)
    } else {
      script = exportShFile(compositeGrid(layers))
    }

    downloadBlob(new Blob([script], { type: 'text/x-shellscript' }), filename)
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
        onExportSh={handleExportSh}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        textAlign={activeTextAlign}
        onSetTextAlign={setTextAlign}
        onFlipHorizontal={flipSelectionHorizontal}
        onFlipVertical={flipSelectionVertical}
        onFlipLayerHorizontal={flipLayerHorizontal}
        onFlipLayerVertical={flipLayerVertical}
        flipOrigin={flipOrigin}
        onSetBorderStyle={setBorderStyle}
        onSetBlendRatio={setBlendRatio}
        cgaPreview={cgaPreview}
        onToggleCgaPreview={handleToggleCgaPreview}
        activeLayerIsGroup={activeLayerIsGroup}
        isPlaying={isPlaying}
        fileMenuOpen={fileMenuOpen}
        onSetFileMenuOpen={setFileMenuOpen}
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
        <div className={styles.canvasAndFrames}>
          <div className={[styles.canvas, brush.tool === 'move' && (isMoveDragging ? styles.canvasMoveDragging : styles.canvasMove), brush.tool === 'flip' && styles.canvasFlip].filter(Boolean).join(' ')}>
            <AnsiTerminalPanel
              isActive={true}
              onTerminalReady={onTerminalReady}
            />
          </div>
          {activeLayerIsDrawn && (
            <FramesPanel
              frameCount={activeLayerFrameCount}
              currentFrame={activeLayerCurrentFrame}
              frameDuration={activeLayerFrameDuration}
              isPlaying={isPlaying}
              onSelectFrame={setCurrentFrame}
              onAddFrame={addFrame}
              onDuplicateFrame={duplicateFrame}
              onRemoveFrame={removeFrame}
              onSetDuration={setFrameDuration}
              onTogglePlayback={togglePlayback}
            />
          )}
          <ToastContainer toasts={toasts} />
        </div>
        <LayersPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSetActive={setActiveLayer}
          onToggleVisibility={toggleVisibility}
          onRename={renameLayer}
          onReorder={reorderLayer}
          onAdd={addLayer}
          onRemove={removeLayer}
          onMergeDown={mergeDown}
          onWrapInGroup={wrapInGroup}
          onRemoveFromGroup={removeFromGroup}
          onDuplicate={duplicateLayer}
          onToggleGroupCollapsed={toggleGroupCollapsed}
        />
      </div>
      <div ref={cursorRef} className={styles.cellCursor} />
      <div ref={dimensionRef} className={styles.dimensionLabel} />
      <div ref={selectionRef} className={styles.selectionOverlay} />
      <div ref={textBoundsRef} className={styles.textBoundsOverlay} />
      <div ref={textCursorRef} className={styles.textCursor} />
      <div ref={flipOriginOverlayRef} className={styles.flipOriginOverlay} />
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
