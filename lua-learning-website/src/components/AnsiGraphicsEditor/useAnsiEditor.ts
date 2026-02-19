import { useState, useCallback, useRef, useMemo } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, BrushMode, DrawTool, BrushSettings, RGBColor, LayerState, TextAlign, UseAnsiEditorReturn, UseAnsiEditorOptions } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import type { ColorTransform, CellHalf } from './gridUtils'
import { createEmptyGrid, writeCellToTerminal, renderFullGrid, isInBounds, getCellHalfFromMouse, computePixelCell, computeFloodFillCells } from './gridUtils'
import { cgaQuantize } from './ansExport'
import { compositeCell, compositeGrid, cloneLayerState } from './layerUtils'
import { useLayerState } from './useLayerState'
import { loadPngPixels, rgbaToAnsiGrid } from './pngImport'
import { createDrawHelpers } from './drawHelpers'
import { createSelectionHandlers } from './selectionTool'
import { createTextToolHandlers, type TextToolHandlers } from './textTool'

export { computePixelCell, computeLineCells } from './gridUtils'

const MAX_HISTORY = 50

export function useAnsiEditor(options?: UseAnsiEditorOptions): UseAnsiEditorReturn {
  const initialState = useMemo((): LayerState | undefined => {
    if (options?.initialLayerState) return options.initialLayerState
    if (options?.initialGrid) {
      const id = 'initial-bg'
      return {
        layers: [{ type: 'drawn' as const, id, name: 'Background', visible: true, grid: options.initialGrid }],
        activeLayerId: id,
      }
    }
    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const layerState = useLayerState(initialState)
  // Destructure identity-stable refs/callbacks for use in dependency arrays.
  // Layer mutation functions are aliased with "raw" prefix because we wrap them
  // with undo snapshots below before exposing them as addLayer, removeLayer, etc.
  const {
    layersRef, activeLayerIdRef, applyToActiveLayer, getActiveGrid, restoreLayerState,
    addLayer: rawAddLayer, addLayerWithGrid: rawAddLayerWithGrid, removeLayer: rawRemoveLayer,
    moveLayerUp: rawMoveLayerUp, moveLayerDown: rawMoveLayerDown,
    toggleVisibility: rawToggleVisibility,
    replaceColors: rawReplaceColors,
    addTextLayer: rawAddTextLayer,
    updateTextLayer: rawUpdateTextLayer,
  } = layerState

  const grid = useMemo(() => compositeGrid(layerState.layers), [layerState.layers])

  const [brush, setBrush] = useState<BrushSettings>({
    char: '#', fg: DEFAULT_FG, bg: DEFAULT_BG, mode: 'brush', tool: 'pencil',
  })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const undoStackRef = useRef<LayerState[]>([]), redoStackRef = useRef<LayerState[]>([])
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const brushRef = useRef(brush); brushRef.current = brush
  const paintingRef = useRef(false)
  const lastCellRef = useRef<{ row: number; col: number; isTopHalf?: boolean } | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null), dimensionRef = useRef<HTMLDivElement | null>(null)
  const lineStartRef = useRef<CellHalf | null>(null)
  const previewCellsRef = useRef<Map<string, AnsiCell>>(new Map())
  const cleanupRef = useRef<(() => void) | null>(null)
  const selectionRef = useRef<HTMLDivElement | null>(null), textBoundsRef = useRef<HTMLDivElement | null>(null)
  const textCursorRef = useRef<HTMLDivElement | null>(null)
  const commitPendingSelectionRef = useRef<(() => void) | null>(null), commitPendingTextRef = useRef<(() => void) | null>(null)
  const containerRef = useRef<HTMLElement | null>(null), textToolRef = useRef<TextToolHandlers | null>(null)
  const updateTextBoundsDisplayRef = useRef<(() => void) | null>(null)
  const [cgaPreview, setCgaPreviewRaw] = useState(false)
  const colorTransformRef = useRef<ColorTransform | undefined>(undefined); colorTransformRef.current = cgaPreview ? cgaQuantize : undefined

  const pushSnapshot = useCallback(() => {
    const stack = undoStackRef.current
    stack.push(cloneLayerState({ layers: layersRef.current, activeLayerId: activeLayerIdRef.current }))
    if (stack.length > MAX_HISTORY) stack.shift()
    redoStackRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [layersRef, activeLayerIdRef])

  const restoreSnapshot = useCallback((from: LayerState[], to: LayerState[]) => {
    if (from.length === 0) return
    to.push(cloneLayerState({ layers: layersRef.current, activeLayerId: activeLayerIdRef.current }))
    const snapshot = from.pop()!
    restoreLayerState(snapshot)
    setIsDirty(true)
    setCanUndo(undoStackRef.current.length > 0); setCanRedo(redoStackRef.current.length > 0)
    if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(snapshot.layers), colorTransformRef.current)
  }, [layersRef, activeLayerIdRef, restoreLayerState])

  const undo = useCallback(() => restoreSnapshot(undoStackRef.current, redoStackRef.current), [restoreSnapshot])
  const redo = useCallback(() => restoreSnapshot(redoStackRef.current, undoStackRef.current), [restoreSnapshot])
  const setBrushFg = useCallback((color: RGBColor) => setBrush(p => ({ ...p, fg: color })), [])
  const setBrushBg = useCallback((color: RGBColor) => setBrush(p => ({ ...p, bg: color })), [])
  const setBrushChar = useCallback((c: string) => { if (c.length === 1) setBrush(p => ({ ...p, char: c })) }, [])
  const setBrushMode = useCallback((mode: BrushMode) => setBrush(p => ({ ...p, mode })), [])
  const setTool = useCallback((tool: DrawTool) => {
    commitPendingSelectionRef.current?.(); commitPendingTextRef.current?.(); setBrush(p => ({ ...p, tool }))
  }, [])

  const applyCell = useCallback((row: number, col: number, cell: AnsiCell) => {
    applyToActiveLayer(row, col, cell); setIsDirty(true)
    if (handleRef.current) writeCellToTerminal(handleRef.current, row, col, compositeCell(layersRef.current, row, col), colorTransformRef.current)
  }, [applyToActiveLayer, layersRef])

  const paintPixel = useCallback((row: number, col: number, isTopHalf: boolean) => {
    if (!isInBounds(row, col)) return
    applyCell(row, col, computePixelCell(getActiveGrid()[row][col], brushRef.current.fg, isTopHalf))
  }, [applyCell, getActiveGrid])

  const paintCell = useCallback((row: number, col: number) => {
    if (!isInBounds(row, col)) return
    const { char, fg, bg } = brushRef.current
    applyCell(row, col, { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor })
  }, [applyCell])

  const clearGrid = useCallback(() => {
    pushSnapshot()
    const emptyGrid = createEmptyGrid()
    const id = 'clear-bg-' + Date.now()
    restoreLayerState({ layers: [{ type: 'drawn', id, name: 'Background', visible: true, grid: emptyGrid }], activeLayerId: id })
    setIsDirty(false)
    if (handleRef.current) renderFullGrid(handleRef.current, emptyGrid, colorTransformRef.current)
  }, [pushSnapshot, restoreLayerState])

  const withLayerUndo = useCallback((action: () => void, needsRerender = true) => {
    pushSnapshot()
    action()
    if (needsRerender) {
      setIsDirty(true)
      if (handleRef.current) setTimeout(() => {
        if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(layersRef.current), colorTransformRef.current)
      }, 0)
    }
  }, [pushSnapshot, layersRef])

  const addLayerWithUndo = useCallback(() => withLayerUndo(rawAddLayer, false), [withLayerUndo, rawAddLayer])
  const removeLayerWithUndo = useCallback((id: string) => withLayerUndo(() => rawRemoveLayer(id)), [withLayerUndo, rawRemoveLayer])
  const moveLayerUpWithUndo = useCallback((id: string) => withLayerUndo(() => rawMoveLayerUp(id)), [withLayerUndo, rawMoveLayerUp])
  const moveLayerDownWithUndo = useCallback((id: string) => withLayerUndo(() => rawMoveLayerDown(id)), [withLayerUndo, rawMoveLayerDown])
  const toggleVisibilityWithUndo = useCallback((id: string) => withLayerUndo(() => rawToggleVisibility(id)), [withLayerUndo, rawToggleVisibility])

  const importPngAsLayer = useCallback(async (file: File) => {
    const px = await loadPngPixels(file)
    const name = file.name.replace(/\.\w+$/, '')
    withLayerUndo(() => rawAddLayerWithGrid(name, rgbaToAnsiGrid(px.rgba, px.width, px.height)))
  }, [withLayerUndo, rawAddLayerWithGrid])

  const simplifyColors = useCallback(
    (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => withLayerUndo(() => rawReplaceColors(mapping, scope)),
    [withLayerUndo, rawReplaceColors],
  )

  const attachMouseListeners = useCallback((container: HTMLElement) => {
    const draw = createDrawHelpers({
      container, cursorRef, dimensionRef, handleRef, brushRef,
      layersRef, activeLayerIdRef, previewCellsRef, lineStartRef,
      colorTransformRef, getActiveGrid, applyCell, paintPixel, paintCell,
    })

    const sel = createSelectionHandlers({
      container, selectionRef, commitPendingRef: commitPendingSelectionRef,
      restorePreview: draw.restorePreview, writePreviewCells: draw.writePreviewCells,
      commitCells: draw.commitCells, pushSnapshot, getActiveGrid, hideDimension: draw.hideDimension,
    })

    containerRef.current = container

    function updateTextBoundsDisplay(): void {
      if (textToolRef.current && textToolRef.current.getPhase() !== 'idle') return
      const activeLayer = layersRef.current.find(l => l.id === activeLayerIdRef.current)
      if (activeLayer?.type === 'text') {
        const el = textBoundsRef.current
        if (!el) return
        const { bounds } = activeLayer
        const rect = container.getBoundingClientRect()
        const cellW = rect.width / ANSI_COLS
        const cellH = rect.height / ANSI_ROWS
        el.style.display = 'block'
        el.style.left = `${rect.left + bounds.c0 * cellW}px`
        el.style.top = `${rect.top + bounds.r0 * cellH}px`
        el.style.width = `${(bounds.c1 - bounds.c0 + 1) * cellW}px`
        el.style.height = `${(bounds.r1 - bounds.r0 + 1) * cellH}px`
      } else if (textBoundsRef.current) {
        textBoundsRef.current.style.display = 'none'
      }
    }
    updateTextBoundsDisplayRef.current = updateTextBoundsDisplay

    const textTool = createTextToolHandlers({
      layersRef, activeLayerIdRef, brushRef,
      addTextLayer: rawAddTextLayer,
      updateTextLayer: rawUpdateTextLayer,
      pushSnapshot,
      rerenderGrid: () => {
        if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(layersRef.current), colorTransformRef.current)
      },
      textBoundsRef, textCursorRef, containerRef,
      onExitEditing: updateTextBoundsDisplay,
    })
    textToolRef.current = textTool
    commitPendingTextRef.current = () => textTool.commitIfEditing()

    function onKeyDown(e: KeyboardEvent): void {
      if (brushRef.current.tool === 'text') textTool.onKeyDown(e)
      else if (brushRef.current.tool === 'select') sel.onKeyDown(e)
    }
    document.addEventListener('keydown', onKeyDown)

    function pixelColor(c: AnsiCell, isTopHalf: boolean): RGBColor {
      if (c.char === ' ') return c.bg
      return isTopHalf ? c.fg : c.bg
    }

    function sampleCell(e: MouseEvent, cell: CellHalf): boolean {
      const s = compositeCell(layersRef.current, cell.row, cell.col)
      const isRight = e.button === 2
      if (brushRef.current.tool === 'eyedropper') {
        const c = pixelColor(s, cell.isTopHalf)
        setBrush(p => isRight ? { ...p, bg: [...c] as RGBColor } : { ...p, fg: [...c] as RGBColor })
        return true
      }
      if (e.ctrlKey) {
        setBrush(p => isRight ? { ...p, bg: [...s.bg] as RGBColor } : { ...p, fg: [...s.fg] as RGBColor })
        return true
      }
      if (isRight) { setBrush(p => ({ ...p, char: s.char })); return true }
      return false
    }

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      const cell = getCellHalfFromMouse(e, container)
      if (cell && sampleCell(e, cell)) {
        draw.positionCursor(cell.row, cell.col, draw.cursorHalf(cell))
        return
      }
      switch (brushRef.current.tool) {
        case 'pencil': {
          pushSnapshot()
          paintingRef.current = true
          lastCellRef.current = null
          if (!cell) return
          lastCellRef.current = cell
          draw.paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line': {
          if (!cell) return
          pushSnapshot()
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          draw.renderLinePreview(cell)
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (!cell) return
          pushSnapshot()
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          draw.renderRectPreview(cell)
          break
        }
        case 'flood-fill': {
          if (!cell) return
          const fills = computeFloodFillCells(
            cell.row, cell.col, brushRef.current, getActiveGrid(), cell.isTopHalf,
          )
          if (fills.size === 0) return
          pushSnapshot()
          draw.commitCells(fills)
          break
        }
        case 'select': {
          if (!cell) return
          sel.onMouseDown(cell.row, cell.col)
          break
        }
        case 'text': {
          if (!cell) return
          textTool.onMouseDown(cell.row, cell.col)
          break
        }
      }
      if (cell) draw.positionCursor(cell.row, cell.col, draw.cursorHalf(cell))
      document.addEventListener('mouseup', onDocumentMouseUp)
    }

    function onMouseMove(e: MouseEvent): void {
      const cell = getCellHalfFromMouse(e, container)
      if (cell) draw.positionCursor(cell.row, cell.col, draw.cursorHalf(cell))
      else draw.hideCursor()
      if (!cell) return
      switch (brushRef.current.tool) {
        case 'pencil': {
          if (!paintingRef.current) return
          const last = lastCellRef.current
          const current = brushRef.current.mode !== 'brush' ? cell : { row: cell.row, col: cell.col }
          if (last && draw.isSameCell(last, current)) return
          lastCellRef.current = current
          draw.paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line': {
          if (lineStartRef.current) draw.renderLinePreview(cell)
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (lineStartRef.current) draw.renderRectPreview(cell)
          break
        }
        case 'select': {
          sel.onMouseMove(cell.row, cell.col)
          break
        }
        case 'text': {
          textTool.onMouseMove(cell.row, cell.col)
          break
        }
      }
    }

    function onDocumentMouseUp(e: MouseEvent): void {
      document.removeEventListener('mouseup', onDocumentMouseUp)
      switch (brushRef.current.tool) {
        case 'pencil':
          paintingRef.current = false
          lastCellRef.current = null
          break
        case 'line': {
          if (!lineStartRef.current) break
          const cell = getCellHalfFromMouse(e, container)
          if (cell) {
            draw.commitLine(cell)
          } else {
            draw.restorePreview()
            lineStartRef.current = null
          }
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (!lineStartRef.current) break
          const cell = getCellHalfFromMouse(e, container)
          if (cell) {
            draw.commitRect(cell)
          } else {
            draw.restorePreview()
            lineStartRef.current = null
            draw.hideDimension()
          }
          break
        }
        case 'select': {
          sel.onMouseUp()
          break
        }
        case 'text': {
          textTool.onMouseUp()
          break
        }
      }
    }

    function onMouseLeave(): void { draw.hideCursor() }
    function onContextMenu(e: MouseEvent): void { e.preventDefault() }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)
    container.addEventListener('contextmenu', onContextMenu)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      container.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('mouseup', onDocumentMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      textTool.commitIfEditing()
    }
  }, [paintCell, paintPixel, applyCell, pushSnapshot, layersRef, activeLayerIdRef, getActiveGrid, rawAddTextLayer, rawUpdateTextLayer])

  const setActiveLayerWithBounds = useCallback((id: string) => {
    commitPendingTextRef.current?.()
    layerState.setActiveLayer(id)
    const layer = layersRef.current.find(l => l.id === id)
    if (layer?.type === 'text') {
      setBrush(p => p.tool === 'text' ? p : ({ ...p, tool: 'text' }))
    } else if (brushRef.current.tool === 'text') {
      setBrush(p => ({ ...p, tool: 'pencil' }))
    }
    updateTextBoundsDisplayRef.current?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerState.setActiveLayer, layersRef])

  const setTextAlign = useCallback((align: TextAlign) => {
    const activeId = activeLayerIdRef.current
    const active = layersRef.current.find(l => l.id === activeId)
    if (!active || active.type !== 'text') return
    pushSnapshot()
    rawUpdateTextLayer(activeId, { textAlign: align })
    setIsDirty(true)
    if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(layersRef.current), colorTransformRef.current)
    textToolRef.current?.refreshOverlays()
  }, [pushSnapshot, rawUpdateTextLayer, layersRef, activeLayerIdRef])

  const setCgaPreview = useCallback((on: boolean) => {
    setCgaPreviewRaw(on)
    colorTransformRef.current = on ? cgaQuantize : undefined
    if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(layersRef.current), colorTransformRef.current)
  }, [layersRef])
  const markClean = useCallback(() => setIsDirty(false), [])
  const openSaveDialog = useCallback(() => setIsSaveDialogOpen(true), []), closeSaveDialog = useCallback(() => setIsSaveDialogOpen(false), [])

  const onTerminalReady = useCallback((handle: AnsiTerminalHandle | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    handleRef.current = handle
    if (handle) {
      renderFullGrid(handle, compositeGrid(layersRef.current), colorTransformRef.current)
      cleanupRef.current = attachMouseListeners(handle.container)
      updateTextBoundsDisplayRef.current?.()
    }
  }, [attachMouseListeners, layersRef])

  return {
    grid, brush, setBrushFg, setBrushBg, setBrushChar, setBrushMode, setTool, clearGrid,
    isDirty, markClean, onTerminalReady, cursorRef, dimensionRef, selectionRef, textBoundsRef, textCursorRef,
    isSaveDialogOpen, openSaveDialog, closeSaveDialog, undo, redo, canUndo, canRedo,
    layers: layerState.layers, activeLayerId: layerState.activeLayerId,
    addLayer: addLayerWithUndo, removeLayer: removeLayerWithUndo,
    renameLayer: layerState.renameLayer, setActiveLayer: setActiveLayerWithBounds,
    moveLayerUp: moveLayerUpWithUndo, moveLayerDown: moveLayerDownWithUndo,
    toggleVisibility: toggleVisibilityWithUndo, importPngAsLayer, simplifyColors, setTextAlign,
    cgaPreview, setCgaPreview,
  }
}
