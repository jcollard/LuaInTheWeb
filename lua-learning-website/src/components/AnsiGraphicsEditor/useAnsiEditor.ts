import { useState, useCallback, useRef, useMemo } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, BrushMode, DrawTool, BrushSettings, RGBColor, LayerState, UseAnsiEditorReturn, UseAnsiEditorOptions } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import {
  createEmptyGrid, writeCellToTerminal, renderFullGrid,
  isInBounds, getCellHalfFromMouse, computePixelCell, computeErasePixelCell, computeLineCells, computeRectCells, computeFloodFillCells, parseCellKey,
} from './gridUtils'
import type { CellHalf } from './gridUtils'
import { compositeCell, compositeGrid, compositeCellWithOverride, cloneLayerState } from './layerUtils'
import { useLayerState } from './useLayerState'
import { loadPngPixels, rgbaToAnsiGrid } from './pngImport'
import { createSelectionHandlers } from './selectionTool'

export { computePixelCell, computeLineCells } from './gridUtils'

const MAX_HISTORY = 50

export function useAnsiEditor(options?: UseAnsiEditorOptions): UseAnsiEditorReturn {
  const initialState = useMemo((): LayerState | undefined => {
    if (options?.initialLayerState) return options.initialLayerState
    if (options?.initialGrid) {
      const id = 'initial-bg'
      return {
        layers: [{ id, name: 'Background', visible: true, grid: options.initialGrid }],
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
  } = layerState

  const grid = useMemo(() => compositeGrid(layerState.layers), [layerState.layers])

  const [brush, setBrush] = useState<BrushSettings>({
    char: '#', fg: DEFAULT_FG, bg: DEFAULT_BG, mode: 'brush', tool: 'pencil',
  })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const undoStackRef = useRef<LayerState[]>([])
  const redoStackRef = useRef<LayerState[]>([])
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const brushRef = useRef(brush)
  brushRef.current = brush
  const paintingRef = useRef(false)
  const lastCellRef = useRef<{ row: number; col: number; isTopHalf?: boolean } | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const dimensionRef = useRef<HTMLDivElement | null>(null)
  const lineStartRef = useRef<CellHalf | null>(null)
  const previewCellsRef = useRef<Map<string, AnsiCell>>(new Map())
  const cleanupRef = useRef<(() => void) | null>(null)
  const selectionRef = useRef<HTMLDivElement | null>(null)
  const commitPendingSelectionRef = useRef<(() => void) | null>(null)

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
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
    if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(snapshot.layers))
  }, [layersRef, activeLayerIdRef, restoreLayerState])

  const undo = useCallback(() => restoreSnapshot(undoStackRef.current, redoStackRef.current), [restoreSnapshot])
  const redo = useCallback(() => restoreSnapshot(redoStackRef.current, undoStackRef.current), [restoreSnapshot])

  const setBrushFg = useCallback((color: RGBColor) => setBrush(p => ({ ...p, fg: color })), [])
  const setBrushBg = useCallback((color: RGBColor) => setBrush(p => ({ ...p, bg: color })), [])
  const setBrushChar = useCallback((c: string) => { if (c.length === 1) setBrush(p => ({ ...p, char: c })) }, [])
  const setBrushMode = useCallback((mode: BrushMode) => setBrush(p => ({ ...p, mode })), [])
  const setTool = useCallback((tool: DrawTool) => {
    commitPendingSelectionRef.current?.()
    setBrush(p => ({ ...p, tool }))
  }, [])

  const applyCell = useCallback((row: number, col: number, cell: AnsiCell) => {
    applyToActiveLayer(row, col, cell)
    setIsDirty(true)
    // layersRef is already updated synchronously by applyToActiveLayer
    if (handleRef.current) writeCellToTerminal(handleRef.current, row, col, compositeCell(layersRef.current, row, col))
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
    restoreLayerState({ layers: [{ id, name: 'Background', visible: true, grid: emptyGrid }], activeLayerId: id })
    setIsDirty(false)
    if (handleRef.current) renderFullGrid(handleRef.current, emptyGrid)
  }, [pushSnapshot, restoreLayerState])

  // Helper: wrap a layer mutation with undo snapshot + deferred re-render
  const withLayerUndo = useCallback((action: () => void, needsRerender = true) => {
    pushSnapshot()
    action()
    if (needsRerender) {
      setIsDirty(true)
      if (handleRef.current) {
        setTimeout(() => {
          if (handleRef.current) renderFullGrid(handleRef.current, compositeGrid(layersRef.current))
        }, 0)
      }
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

  const simplifyColors = useCallback((mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => withLayerUndo(() => rawReplaceColors(mapping, scope)), [withLayerUndo, rawReplaceColors])

  const attachMouseListeners = useCallback((container: HTMLElement) => {
    function positionCursor(row: number, col: number, isTopHalf?: boolean): void {
      const el = cursorRef.current
      if (!el) return
      const rect = container.getBoundingClientRect()
      const cellW = rect.width / ANSI_COLS
      const cellH = rect.height / ANSI_ROWS
      const isHalf = isTopHalf !== undefined
      const cursorH = isHalf ? cellH / 2 : cellH
      const offsetY = isHalf && !isTopHalf ? cellH / 2 : 0
      el.style.display = 'block'
      el.style.left = `${rect.left + col * cellW}px`
      el.style.top = `${rect.top + row * cellH + offsetY}px`
      el.style.width = `${cellW}px`
      el.style.height = `${cursorH}px`
    }

    function hideCursor(): void { if (cursorRef.current) cursorRef.current.style.display = 'none' }

    function showDimension(start: CellHalf, end: CellHalf): void {
      const el = dimensionRef.current
      if (!el) return
      const rect = container.getBoundingClientRect()
      const cellW = rect.width / ANSI_COLS
      const cellH = rect.height / ANSI_ROWS
      const minCol = Math.min(start.col, end.col)
      const maxCol = Math.max(start.col, end.col)
      const minRow = Math.min(start.row, end.row)
      const maxRow = Math.max(start.row, end.row)
      let w: number, h: number
      if (brushRef.current.mode !== 'brush') {
        const py0 = start.row * 2 + (start.isTopHalf ? 0 : 1)
        const py1 = end.row * 2 + (end.isTopHalf ? 0 : 1)
        w = maxCol - minCol + 1
        h = Math.abs(py1 - py0) + 1
      } else {
        w = maxCol - minCol + 1
        h = (maxRow - minRow + 1) * 2
      }
      el.textContent = `${w}\u00D7${h}`
      const cx = rect.left + (minCol + maxCol + 1) * cellW / 2
      const cy = rect.top + (minRow + maxRow + 1) * cellH / 2
      el.style.display = 'block'
      el.style.left = `${cx}px`
      el.style.top = `${cy}px`
    }

    function hideDimension(): void { if (dimensionRef.current) dimensionRef.current.style.display = 'none' }

    type CellPos = { row: number; col: number; isTopHalf?: boolean }
    function isSameCell(a: CellPos, b: CellPos) { return a.row === b.row && a.col === b.col && a.isTopHalf === b.isTopHalf }
    function cursorHalf(cell: { isTopHalf: boolean }) { return brushRef.current.mode !== 'brush' ? cell.isTopHalf : undefined }

    function paintAt(row: number, col: number, isTopHalf: boolean): void {
      const mode = brushRef.current.mode
      if (mode === 'eraser') { if (isInBounds(row, col)) applyCell(row, col, computeErasePixelCell(getActiveGrid()[row][col], isTopHalf)) }
      else if (mode === 'pixel') paintPixel(row, col, isTopHalf)
      else paintCell(row, col)
    }

    function restorePreview(): void {
      const handle = handleRef.current
      if (!handle) return
      for (const [key, cell] of previewCellsRef.current) {
        const [r, c] = parseCellKey(key)
        writeCellToTerminal(handle, r, c, cell)
      }
      previewCellsRef.current.clear()
    }

    function writePreviewCells(cells: Map<string, AnsiCell>): void {
      const handle = handleRef.current
      if (!handle) return
      const layers = layersRef.current, activeId = activeLayerIdRef.current
      for (const [key, cell] of cells) {
        const [r, c] = parseCellKey(key)
        if (!previewCellsRef.current.has(key)) {
          previewCellsRef.current.set(key, compositeCell(layers, r, c))
        }
        writeCellToTerminal(handle, r, c, compositeCellWithOverride(layers, r, c, activeId, cell))
      }
    }

    function commitCells(cells: Map<string, AnsiCell>): void {
      const affectedKeys = new Set(previewCellsRef.current.keys())
      previewCellsRef.current.clear()
      for (const [key, cell] of cells) {
        const [r, c] = parseCellKey(key)
        applyCell(r, c, cell)
        affectedKeys.add(key)
      }
      const handle = handleRef.current, layers = layersRef.current
      if (handle) for (const key of affectedKeys) {
        const [r, c] = parseCellKey(key)
        writeCellToTerminal(handle, r, c, compositeCell(layers, r, c))
      }
    }

    function lineCells(end: CellHalf) { return computeLineCells(lineStartRef.current!, end, brushRef.current, getActiveGrid()) }
    function rectCells(end: CellHalf) { return computeRectCells(lineStartRef.current!, end, brushRef.current, getActiveGrid(), brushRef.current.tool === 'rect-filled') }

    function renderLinePreview(end: CellHalf): void {
      if (!lineStartRef.current) return
      restorePreview()
      writePreviewCells(lineCells(end))
    }
    function commitLine(end: CellHalf): void {
      if (!lineStartRef.current) return
      commitCells(lineCells(end))
      lineStartRef.current = null
    }
    function renderRectPreview(end: CellHalf): void {
      if (!lineStartRef.current) return
      restorePreview()
      writePreviewCells(rectCells(end))
      showDimension(lineStartRef.current!, end)
    }
    function commitRect(end: CellHalf): void {
      if (!lineStartRef.current) return
      commitCells(rectCells(end))
      lineStartRef.current = null
      hideDimension()
    }

    const sel = createSelectionHandlers({
      container, selectionRef, commitPendingRef: commitPendingSelectionRef,
      restorePreview, writePreviewCells, commitCells, pushSnapshot, getActiveGrid, hideDimension,
    })

    function sampleCell(e: MouseEvent, cell: CellHalf): boolean {
      const s = compositeCell(layersRef.current, cell.row, cell.col)
      if (brushRef.current.tool === 'eyedropper' || e.ctrlKey) {
        setBrush(p => e.button === 2 ? ({ ...p, bg: [...s.bg] as RGBColor }) : ({ ...p, fg: [...s.fg] as RGBColor }))
        return true
      }
      if (e.button === 2) { setBrush(p => ({ ...p, char: s.char })); return true }
      return false
    }

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      const cell = getCellHalfFromMouse(e, container)
      if (cell && sampleCell(e, cell)) { positionCursor(cell.row, cell.col, cursorHalf(cell)); return }
      switch (brushRef.current.tool) {
        case 'pencil': {
          pushSnapshot()
          paintingRef.current = true
          lastCellRef.current = null
          if (!cell) return
          lastCellRef.current = cell
          paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line': {
          if (!cell) return
          pushSnapshot()
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          renderLinePreview(cell)
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (!cell) return
          pushSnapshot()
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          renderRectPreview(cell)
          break
        }
        case 'flood-fill': {
          if (!cell) return
          const fills = computeFloodFillCells(
            cell.row, cell.col, brushRef.current, getActiveGrid(), cell.isTopHalf,
          )
          if (fills.size === 0) return
          pushSnapshot()
          commitCells(fills)
          break
        }
        case 'select': {
          if (!cell) return
          sel.onMouseDown(cell.row, cell.col)
          break
        }
      }
      if (cell) positionCursor(cell.row, cell.col, cursorHalf(cell))
      document.addEventListener('mouseup', onDocumentMouseUp)
    }

    function onMouseMove(e: MouseEvent): void {
      const cell = getCellHalfFromMouse(e, container)
      if (cell) positionCursor(cell.row, cell.col, cursorHalf(cell))
      else hideCursor()
      if (!cell) return
      switch (brushRef.current.tool) {
        case 'pencil': {
          if (!paintingRef.current) return
          const last = lastCellRef.current
          const current = brushRef.current.mode !== 'brush' ? cell : { row: cell.row, col: cell.col }
          if (last && isSameCell(last, current)) return
          lastCellRef.current = current
          paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line': {
          if (lineStartRef.current) renderLinePreview(cell)
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (lineStartRef.current) renderRectPreview(cell)
          break
        }
        case 'select': {
          sel.onMouseMove(cell.row, cell.col)
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
          if (cell) commitLine(cell)
          else { restorePreview(); lineStartRef.current = null }
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (!lineStartRef.current) break
          const cell = getCellHalfFromMouse(e, container)
          if (cell) commitRect(cell)
          else { restorePreview(); lineStartRef.current = null; hideDimension() }
          break
        }
        case 'select': {
          sel.onMouseUp()
          break
        }
      }
    }

    function onMouseLeave(): void { hideCursor() }

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
    }
  }, [paintCell, paintPixel, applyCell, pushSnapshot, layersRef, activeLayerIdRef, getActiveGrid])

  const markClean = useCallback(() => setIsDirty(false), []), openSaveDialog = useCallback(() => setIsSaveDialogOpen(true), []), closeSaveDialog = useCallback(() => setIsSaveDialogOpen(false), [])

  const onTerminalReady = useCallback((handle: AnsiTerminalHandle | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    handleRef.current = handle
    if (handle) {
      renderFullGrid(handle, compositeGrid(layersRef.current))
      cleanupRef.current = attachMouseListeners(handle.container)
    }
  }, [attachMouseListeners, layersRef])

  return {
    grid, brush, setBrushFg, setBrushBg, setBrushChar, setBrushMode, setTool, clearGrid,
    isDirty, markClean, onTerminalReady, cursorRef, dimensionRef, selectionRef,
    isSaveDialogOpen, openSaveDialog, closeSaveDialog, undo, redo, canUndo, canRedo,
    layers: layerState.layers, activeLayerId: layerState.activeLayerId,
    addLayer: addLayerWithUndo, removeLayer: removeLayerWithUndo,
    renameLayer: layerState.renameLayer, setActiveLayer: layerState.setActiveLayer,
    moveLayerUp: moveLayerUpWithUndo, moveLayerDown: moveLayerDownWithUndo,
    toggleVisibility: toggleVisibilityWithUndo, importPngAsLayer, simplifyColors,
  }
}
