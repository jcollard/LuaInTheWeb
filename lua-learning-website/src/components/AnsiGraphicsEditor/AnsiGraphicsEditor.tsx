import { useCallback, useEffect, useRef, useState } from 'react'
import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { ConfirmDialog } from '../ConfirmDialog'
import { useIDE } from '../IDEContext/useIDE'
import { AnsiEditorToolbar } from './AnsiEditorToolbar'
import { ColorPanel } from './ColorPanel'
import { FramesPanel } from './FramesPanel'
import { LayersPanel } from './LayersPanel'
import { ImportLayersDialog } from './ImportLayersDialog'
import { SaveAsDialog } from './SaveAsDialog'
import { ToastContainer } from './ToastContainer'
import { useAnsiEditor } from './useAnsiEditor'
import { useAnsiEditorFile } from './useAnsiEditorFile'
import { useToast } from './useToast'
import { buildImportEntries, remapLayers } from './layerImport'
import type { ImportEntry } from './layerImport'
import type { ScaleMode, GroupLayer, LayerState } from './types'
import { isGroupLayer } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiGraphicsEditorProps {
  filePath?: string
  onDirtyChange?: (isDirty: boolean) => void
  isActive?: boolean
}

export function AnsiGraphicsEditor({ filePath, onDirtyChange, isActive }: AnsiGraphicsEditorProps) {
  const { fileSystem, fileTree, refreshFileTree, updateAnsiEditorTabPath } = useIDE()
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [scaleMode, setScaleMode] = useState<ScaleMode>('fit')

  const { toasts, showToast } = useToast()
  const handleSaveRef = useRef<() => void>(() => {})
  const handleOpenFileMenuRef = useRef<() => void>(() => {})
  const handleOpenSaveDialogRef = useRef<() => void>(() => {})

  // closeSaveDialog is defined after useAnsiEditor, so use a ref to break the cycle
  const closeSaveDialogRef = useRef<() => void>(() => {})

  const {
    initialLayerState,
    pendingSave,
    handleSave: fileHandleSave,
    handleSaveAs: fileHandleSaveAs,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleExportAns: fileHandleExportAns,
    handleExportSh: fileHandleExportSh,
  } = useAnsiEditorFile({
    filePath,
    fileSystem,
    refreshFileTree,
    updateAnsiEditorTabPath,
    closeSaveDialog: useCallback(() => closeSaveDialogRef.current(), []),
  })

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
    addClipLayer,
    addReferenceLayer,
    removeLayer,
    renameLayer,
    changeLayerId,
    setActiveLayer,
    reorderLayer,
    toggleVisibility,
    setLayerVisibility,
    mergeDown,
    wrapInGroup,
    removeFromGroup,
    duplicateLayer,
    toggleGroupCollapsed,
    importPngAsLayer,
    parseAnsiFile,
    importLayersWithUndo,
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
    availableTags,
    addTagToLayer,
    removeTagFromLayer,
    createTag,
    deleteTag,
    renameTag,
    isDirty,
  } = useAnsiEditor({
    initialLayerState,
    onSave: () => handleSaveRef.current(),
    onSaveAs: () => handleOpenSaveDialogRef.current(),
    onOpenFileMenu: () => handleOpenFileMenuRef.current(),
    onShowToast: showToast,
    isActive,
  })

  closeSaveDialogRef.current = closeSaveDialog

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

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

  // Import Layers state and handlers
  const layerFileInputRef = useRef<HTMLInputElement>(null)
  const [importDialogState, setImportDialogState] = useState<{
    entries: ImportEntry[]
    sourceLayers: LayerState
    warnings: string[]
  } | null>(null)

  const handleImportLayersClick = useCallback(() => {
    layerFileInputRef.current?.click()
  }, [])

  const handleLayerFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const parsed = await parseAnsiFile(file)
    if (!parsed) return

    const entries = buildImportEntries(parsed.layers)
    const existingIds = new Set(layers.map(l => l.id))
    const warnings: string[] = []

    for (const { layer } of entries) {
      if (layer.type === 'reference') {
        const sourceId = layer.sourceLayerId
        const sourceInFile = parsed.layers.some(l => l.id === sourceId)
        if (!sourceInFile && !existingIds.has(sourceId)) {
          warnings.push(`Ref "${layer.name}" source missing`)
        }
      }
    }

    setImportDialogState({ entries, sourceLayers: parsed, warnings })
  }, [parseAnsiFile, layers])

  const handleImportConfirm = useCallback((selectedIds: Set<string>, targetParentId: string | undefined) => {
    if (!importDialogState) return
    const selected = importDialogState.sourceLayers.layers.filter(l => selectedIds.has(l.id))
    const existingIds = new Set(layers.map(l => l.id))
    const remapped = remapLayers(selected, targetParentId, existingIds)
    if (remapped.length > 0) {
      importLayersWithUndo(remapped)
    }
    setImportDialogState(null)
  }, [importDialogState, layers, importLayersWithUndo])

  const handleImportCancel = useCallback(() => {
    setImportDialogState(null)
  }, [])

  const existingGroups = layers.filter(isGroupLayer) as GroupLayer[]

  const handleSaveAs = useCallback(async (folderPath: string, fileName: string) => {
    await fileHandleSaveAs(folderPath, fileName, layers, activeLayerId, availableTags)
  }, [fileHandleSaveAs, layers, activeLayerId, availableTags])

  const handleSave = useCallback(async () => {
    await fileHandleSave(layers, activeLayerId, availableTags, markClean, openSaveDialog)
  }, [fileHandleSave, layers, activeLayerId, availableTags, markClean, openSaveDialog])

  handleSaveRef.current = handleSave
  handleOpenSaveDialogRef.current = openSaveDialog
  handleOpenFileMenuRef.current = useCallback(() => setFileMenuOpen(true), [])

  const handleExportAns = useCallback(() => fileHandleExportAns(layers), [fileHandleExportAns, layers])
  const handleExportSh = useCallback(() => fileHandleExportSh(layers), [fileHandleExportSh, layers])

  return (
    <div className={styles.editor} data-testid="ansi-graphics-editor" onContextMenu={e => e.preventDefault()}>
      <AnsiEditorToolbar
        brush={brush}
        onSetChar={setBrushChar}
        onSetMode={setBrushMode}
        onSetTool={setTool}
        onClear={clearGrid}
        onSave={handleSave}
        onSaveAs={openSaveDialog}
        onImportPng={handleImportPngClick}
        onImportLayers={handleImportLayersClick}
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
        scaleMode={scaleMode}
        onSetScaleMode={setScaleMode}
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
              scaleMode={scaleMode}
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
          filePath={filePath}
          layers={layers}
          activeLayerId={activeLayerId}
          onSetActive={setActiveLayer}
          onToggleVisibility={toggleVisibility}
          onSetLayerVisibility={setLayerVisibility}
          onRename={renameLayer}
          onChangeLayerId={changeLayerId}
          onReorder={reorderLayer}
          onAdd={addLayer}
          onRemove={removeLayer}
          onMergeDown={mergeDown}
          onWrapInGroup={wrapInGroup}
          onRemoveFromGroup={removeFromGroup}
          onDuplicate={duplicateLayer}
          onAddClipLayer={addClipLayer}
          onAddReferenceLayer={addReferenceLayer}
          onToggleGroupCollapsed={toggleGroupCollapsed}
          availableTags={availableTags}
          onAddTagToLayer={addTagToLayer}
          onRemoveTagFromLayer={removeTagFromLayer}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
          onRenameTag={renameTag}
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
      <input
        ref={layerFileInputRef}
        type="file"
        accept=".lua"
        style={{ display: 'none' }}
        onChange={handleLayerFileSelected}
        data-testid="layer-file-input"
      />
      {importDialogState && (
        <ImportLayersDialog
          entries={importDialogState.entries}
          groups={existingGroups}
          warnings={importDialogState.warnings}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}
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
