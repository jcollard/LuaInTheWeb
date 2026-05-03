/* eslint-disable max-lines */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { useDprChange } from '../AnsiTerminalPanel/panelHelpers'
import {
  loadStoredEyedropperModifier,
  saveStoredEyedropperModifier,
  type EyedropperModifier,
} from './eyedropperModifierPersistence'
import { ConfirmDialog } from '../ConfirmDialog'
import { useIDE } from '../IDEContext/useIDE'
import { AnsiEditorToolbar } from './AnsiEditorToolbar'
import { CharacterPanel } from './CharacterPanel'
import { ColorPanel } from './ColorPanel'
import { FramesPanel } from './FramesPanel'
import { LayersPanel } from './LayersPanel'
import { ExportLayersDialog } from './ExportLayersDialog'
import { ImportLayersDialog } from './ImportLayersDialog'
import { SaveAsDialog } from './SaveAsDialog'
import { ToastContainer } from './ToastContainer'
import { useAnsiEditor } from './useAnsiEditor'
import { useAnsiEditorFile, deriveExportFilename } from './useAnsiEditorFile'
import { PngExportDialog } from './PngExportDialog'
import type { PngExportScale } from './pngExport'
import { fitZoom, useViewport } from './useViewport'
import { useCanvasPan, useCtrlWheelZoom } from './useViewportInputs'
import { getFontById } from '@lua-learning/lua-runtime'
import { useExportLayers } from './useExportLayers'
import { useImportLayers } from './useImportLayers'
import { useRecentChars } from './useRecentChars'
import { useToast } from './useToast'
import type { GroupLayer } from './types'
import { isGroupLayer } from './types'
import { ProjectConfigParser } from '@lua-learning/export'
import { CRT_DEFAULTS, DEFAULT_FONT_ID } from '@lua-learning/lua-runtime'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiGraphicsEditorProps {
  filePath?: string
  onDirtyChange?: (isDirty: boolean) => void
  isActive?: boolean
}

function deriveSaveAsFolderPath(filePath: string | undefined): string {
  if (!filePath || filePath.startsWith('ansi-editor://')) return '/home'
  const lastSlash = filePath.lastIndexOf('/')
  if (lastSlash <= 0) return '/home'
  return filePath.substring(0, lastSlash)
}

export function AnsiGraphicsEditor({ filePath, onDirtyChange, isActive }: AnsiGraphicsEditorProps) {
  const { fileSystem, fileTree, refreshFileTree, updateAnsiEditorTabPath } = useIDE()
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [dpr, setDpr] = useState<number>(() => (typeof window !== 'undefined' ? window.devicePixelRatio : 1))
  // Guard against no-op updates: if matchMedia ever fires when the
  // value hasn't actually changed, the functional setter returns the
  // same reference and React skips the re-render.
  useDprChange(() => setDpr(prev => prev === window.devicePixelRatio ? prev : window.devicePixelRatio))
  const [eyedropperModifier, setEyedropperModifierRaw] = useState<EyedropperModifier>(() => loadStoredEyedropperModifier())
  const setEyedropperModifier = useCallback((modifier: EyedropperModifier) => {
    setEyedropperModifierRaw(modifier)
    saveStoredEyedropperModifier(modifier)
  }, [])

  const { toasts, showToast } = useToast()
  const { recent: recentChars, pushRecent: pushRecentChar } = useRecentChars()
  const viewport = useViewport(1)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const [scrollContainerEl, setScrollContainerEl] = useState<HTMLElement | null>(null)
  useCtrlWheelZoom({ scrollEl: scrollContainerEl, zoom: viewport.zoom, setZoom: viewport.setZoom })
  const { isPanning, spaceHeld } = useCanvasPan({ scrollEl: scrollContainerEl })
  const handleSaveRef = useRef<() => void>(() => {})
  const handleOpenFileMenuRef = useRef<() => void>(() => {})
  const handleOpenSaveDialogRef = useRef<() => void>(() => {})

  // closeSaveDialog is defined after useAnsiEditor, so use a ref to break the cycle
  const closeSaveDialogRef = useRef<() => void>(() => {})

  const {
    initialLayerState,
    loadError,
    pendingSave,
    handleSave: fileHandleSave,
    handleSaveAs: fileHandleSaveAs,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleExportAns: fileHandleExportAns,
    handleExportDosAns: fileHandleExportDosAns,
    handleExportSh: fileHandleExportSh,
    handleExportBat: fileHandleExportBat,
    handleExportPng: fileHandleExportPng,
  } = useAnsiEditorFile({
    filePath,
    fileSystem,
    refreshFileTree,
    updateAnsiEditorTabPath,
    closeSaveDialog: useCallback(() => closeSaveDialogRef.current(), []),
  })

  const {
    cols: projectCols,
    rows: projectRows,
    resizeCanvas,
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
    crtConfig,
    setCrtConfig,
    font,
    setFont,
    useFontBlocks,
    setUseFontBlocks,
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
    reorderFrame,
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
    eyedropperModifier,
  })

  closeSaveDialogRef.current = closeSaveDialog

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Load CRT config from sibling project.lua when filePath changes
  const appliedProjectLuaRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (appliedProjectLuaRef.current === filePath) return
    appliedProjectLuaRef.current = filePath

    if (!filePath) {
      setCrtConfig(null)
      return
    }

    const parentDir = filePath.replace(/\/[^/]+$/, '')
    const projectLuaPath = `${parentDir}/project.lua`

    if (!fileSystem.exists(projectLuaPath)) {
      setCrtConfig(null)
      return
    }

    try {
      const content = fileSystem.readFile(projectLuaPath)
      if (!content) {
        setCrtConfig(null)
        return
      }
      const result = ProjectConfigParser.parseContent(content)
      if (result.success && result.config.ansi?.crt === true) {
        const a = result.config.ansi
        const d = CRT_DEFAULTS
        setCrtConfig({
          smoothing: a.crt_smoothing ?? d.smoothing, scanlineIntensity: a.crt_scanlineIntensity ?? d.scanlineIntensity,
          scanlineCount: a.crt_scanlineCount ?? d.scanlineCount, adaptiveIntensity: a.crt_adaptiveIntensity ?? d.adaptiveIntensity,
          brightness: a.crt_brightness ?? d.brightness, contrast: a.crt_contrast ?? d.contrast,
          saturation: a.crt_saturation ?? d.saturation, bloomIntensity: a.crt_bloomIntensity ?? d.bloomIntensity,
          bloomThreshold: a.crt_bloomThreshold ?? d.bloomThreshold, rgbShift: a.crt_rgbShift ?? d.rgbShift,
          vignetteStrength: a.crt_vignetteStrength ?? d.vignetteStrength, curvature: a.crt_curvature ?? d.curvature,
          flickerStrength: a.crt_flickerStrength ?? d.flickerStrength, phosphor: a.crt_phosphor ?? d.phosphor,
        })
      } else {
        setCrtConfig(null)
      }
    } catch {
      setCrtConfig(null)
    }
  }, [filePath, fileSystem, setCrtConfig])

  const handleToggleCgaPreview = useCallback(() => setCgaPreview(!cgaPreview), [cgaPreview, setCgaPreview])

  const wrappedOnTerminalReady = useCallback((handle: Parameters<typeof onTerminalReady>[0]) => {
    setScrollContainerEl(handle?.scrollContainer ?? null)
    onTerminalReady(handle)
  }, [onTerminalReady])

  const handleFitZoom = useCallback(() => {
    const el = scrollContainerEl ?? canvasWrapperRef.current
    if (!el) return
    const fontEntry = getFontById(font ?? DEFAULT_FONT_ID)
    if (!fontEntry) return
    const baseW = projectCols * fontEntry.cellW
    const baseH = projectRows * fontEntry.cellH
    const z = fitZoom({ w: baseW, h: baseH }, { w: el.clientWidth, h: el.clientHeight })
    viewport.setZoom(z)
  }, [scrollContainerEl, font, projectCols, projectRows, viewport])

  // Apply Fit once on initial mount (when the panel first reports its
  // scroll container). Matches the prior `Integer Auto` default. The
  // user's subsequent zoom changes are not re-overridden by this — the
  // ref guard ensures it runs at most once per editor instance.
  const initialFitAppliedRef = useRef(false)
  useEffect(() => {
    if (initialFitAppliedRef.current) return
    if (!scrollContainerEl) return
    initialFitAppliedRef.current = true
    handleFitZoom()
  }, [scrollContainerEl, handleFitZoom])

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const activeTextAlign = activeLayer?.type === 'text' ? activeLayer.textAlign : undefined
  const activeLayerIsDrawn = activeLayer?.type === 'drawn'

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportPngClick = useCallback(() => fileInputRef.current?.click(), [])
  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importPngAsLayer(file)
    e.target.value = ''
  }, [importPngAsLayer])

  const {
    layerFileInputRef,
    importDialogState,
    handleImportLayersClick,
    handleLayerFileSelected,
    handleImportConfirm,
    handleImportCancel,
  } = useImportLayers({ layers, parseAnsiFile, importLayersWithUndo })

  const exportLayers = useExportLayers({ layers, availableTags, fileSystem, refreshFileTree, filePath })

  const existingGroups = useMemo(() => layers.filter(isGroupLayer) as GroupLayer[], [layers])

  const selectBrushChar = useCallback((char: string) => {
    setBrushChar(char)
    pushRecentChar(char)
  }, [setBrushChar, pushRecentChar])

  const handleSaveAs = useCallback(
    (f: string, n: string) => fileHandleSaveAs(f, n, layers, activeLayerId, availableTags, projectCols, projectRows, { font, useFontBlocks }),
    [fileHandleSaveAs, layers, activeLayerId, availableTags, projectCols, projectRows, font, useFontBlocks],
  )
  const handleSave = useCallback(
    () => fileHandleSave(layers, activeLayerId, availableTags, projectCols, projectRows, { font, useFontBlocks }, markClean, openSaveDialog),
    [fileHandleSave, layers, activeLayerId, availableTags, projectCols, projectRows, font, useFontBlocks, markClean, openSaveDialog],
  )

  handleSaveRef.current = handleSave
  handleOpenSaveDialogRef.current = openSaveDialog
  handleOpenFileMenuRef.current = useCallback(() => setFileMenuOpen(true), [])

  const handleExportAns = useCallback(() => fileHandleExportAns(layers), [fileHandleExportAns, layers])
  const handleExportDosAns = useCallback(() => fileHandleExportDosAns(layers), [fileHandleExportDosAns, layers])
  const handleExportSh = useCallback(() => fileHandleExportSh(layers), [fileHandleExportSh, layers])
  const handleExportBat = useCallback(() => fileHandleExportBat(layers), [fileHandleExportBat, layers])

  const [pngExportDialogOpen, setPngExportDialogOpen] = useState(false)
  const handleExportPng = useCallback(() => setPngExportDialogOpen(true), [])
  const handlePngExportCancel = useCallback(() => setPngExportDialogOpen(false), [])
  const pngDefaultFileName = useMemo(() => deriveExportFilename(filePath, 'png'), [filePath])
  const pngDimensionsForScale = useCallback((scale: PngExportScale) => {
    const fontEntry = getFontById(font ?? DEFAULT_FONT_ID)
    const cellW = fontEntry?.cellW ?? 0
    const cellH = fontEntry?.cellH ?? 0
    return { width: projectCols * cellW * scale, height: projectRows * cellH * scale }
  }, [font, projectCols, projectRows])
  const handlePngExportConfirm = useCallback((fileName: string, scale: PngExportScale) => {
    setPngExportDialogOpen(false)
    void fileHandleExportPng(layers, font ?? DEFAULT_FONT_ID, fileName, scale).catch(err => {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`PNG export failed: ${msg}`)
    })
  }, [fileHandleExportPng, layers, font, showToast])

  const [showErrorDetail, setShowErrorDetail] = useState(false)
  const [errorCopied, setErrorCopied] = useState(false)
  const handleCopyError = useCallback(() => {
    if (!loadError) return
    navigator.clipboard.writeText(loadError.detail).then(() => {
      setErrorCopied(true)
      setTimeout(() => setErrorCopied(false), 2000)
    })
  }, [loadError])

  if (loadError) {
    return (
      <div className={styles.editor} data-testid="ansi-graphics-editor">
        <div className={styles.loadErrorBanner}>
          <div className={styles.loadErrorIcon}>!</div>
          <div className={styles.loadErrorContent}>
            <div className={styles.loadErrorTitle}>Failed to open file</div>
            <div className={styles.loadErrorMessage}>{loadError.message}</div>
            {filePath && <div className={styles.loadErrorPath}>{filePath}</div>}
            <div className={styles.loadErrorActions}>
              <button className={styles.loadErrorButton} onClick={() => setShowErrorDetail(v => !v)}>
                {showErrorDetail ? 'Hide Details' : 'Show Details'}
              </button>
              <button className={styles.loadErrorButton} onClick={handleCopyError}>
                {errorCopied ? 'Copied!' : 'Copy Error'}
              </button>
            </div>
            {showErrorDetail && (
              <pre className={styles.loadErrorDetail}>{loadError.detail}</pre>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.editor} data-testid="ansi-graphics-editor" onContextMenu={e => e.preventDefault()}>
      <AnsiEditorToolbar
        brush={brush}
        onSetChar={selectBrushChar}
        onSetMode={setBrushMode}
        onSetTool={setTool}
        onClear={clearGrid}
        onSave={handleSave}
        onSaveAs={openSaveDialog}
        onImportPng={handleImportPngClick}
        onImportLayers={handleImportLayersClick}
        onExportAns={handleExportAns}
        onExportDosAns={handleExportDosAns}
        onExportSh={handleExportSh}
        onExportBat={handleExportBat}
        onExportPng={handleExportPng}
        onExportLayers={exportLayers.handleExportLayersClick}
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
        cols={projectCols}
        rows={projectRows}
        onResizeCanvas={resizeCanvas}
        font={font}
        onSetFont={setFont}
        useFontBlocks={useFontBlocks}
        onSetUseFontBlocks={setUseFontBlocks}
        eyedropperModifier={eyedropperModifier}
        onSetEyedropperModifier={setEyedropperModifier}
        activeLayerIsGroup={activeLayerIsGroup}
        isPlaying={isPlaying}
        fileMenuOpen={fileMenuOpen}
        onSetFileMenuOpen={setFileMenuOpen}
        zoom={viewport.zoom}
        onSetZoom={viewport.setZoom}
        onFitZoom={handleFitZoom}
        dpr={dpr}
      />
      <div className={styles.editorBody}>
        <div className={styles.leftSidebar}>
          <ColorPanel
            selectedFg={brush.fg}
            selectedBg={brush.bg}
            brushMode={brush.mode}
            brushChar={brush.char}
            onSetFg={setBrushFg}
            onSetBg={setBrushBg}
            onSimplifyColors={simplifyColors}
            onShowToast={showToast}
            layers={layers}
            activeLayerId={activeLayerId}
          />
          {brush.mode === 'brush' && !activeLayerIsGroup && (
            <CharacterPanel
              currentChar={brush.char}
              fontId={font ?? DEFAULT_FONT_ID}
              layers={layers}
              activeLayerId={activeLayerId}
              recent={recentChars}
              onSelect={selectBrushChar}
            />
          )}
        </div>
        <div className={styles.canvasAndFrames}>
          <div
            ref={canvasWrapperRef}
            className={[
              styles.canvas,
              brush.tool === 'move' && (isMoveDragging ? styles.canvasMoveDragging : styles.canvasMove),
              brush.tool === 'flip' && styles.canvasFlip,
              isPanning && styles.canvasPanning,
              !isPanning && spaceHeld && styles.canvasPanReady,
            ].filter(Boolean).join(' ')}
          >
            <AnsiTerminalPanel
              isActive={true}
              zoom={viewport.zoom}
              cols={projectCols}
              rows={projectRows}
              fontId={font}
              useFontBlocks={useFontBlocks}
              onTerminalReady={wrappedOnTerminalReady}
              surroundClassName={styles.editorSurround}
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
              onReorderFrame={reorderFrame}
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
          crtConfig={crtConfig}
          onSetCrtConfig={setCrtConfig}
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
        defaultFolderPath={deriveSaveAsFolderPath(filePath)}
        onSave={handleSaveAs}
        onCancel={closeSaveDialog}
      />
      <input ref={fileInputRef} type="file" accept="image/png,image/*"
        style={{ display: 'none' }} onChange={handleFileSelected} data-testid="png-file-input" />
      <input ref={layerFileInputRef} type="file" accept=".lua"
        style={{ display: 'none' }} onChange={handleLayerFileSelected} data-testid="layer-file-input" />
      {importDialogState && (
        <ImportLayersDialog
          entries={importDialogState.entries}
          groups={existingGroups}
          warnings={importDialogState.warnings}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}
      {exportLayers.isExportDialogOpen && (
        <ExportLayersDialog
          entries={exportLayers.exportEntries}
          allLayers={layers}
          tree={fileTree}
          defaultFileName={exportLayers.defaultExportFileName}
          defaultFolderPath={exportLayers.defaultExportFolderPath}
          availableTags={availableTags}
          checkFileExists={exportLayers.checkFileExists}
          onConfirm={exportLayers.handleExportConfirm}
          onCancel={exportLayers.handleExportCancel}
        />
      )}
      <PngExportDialog
        isOpen={pngExportDialogOpen}
        defaultFileName={pngDefaultFileName}
        dimensionsForScale={pngDimensionsForScale}
        onExport={handlePngExportConfirm}
        onCancel={handlePngExportCancel}
      />
      <ConfirmDialog
        isOpen={pendingSave !== null}
        title="Overwrite File"
        message={`The file "${pendingSave?.path ?? ''}" already exists. Do you want to overwrite it?`}
        confirmLabel="Overwrite" cancelLabel="Cancel" variant="danger"
        onConfirm={handleConfirmOverwrite} onCancel={handleCancelOverwrite}
      />
    </div>
  )
}
