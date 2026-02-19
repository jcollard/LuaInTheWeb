import type { AnsiCell, AnsiGrid, BrushSettings, Layer } from './types'
import { ANSI_COLS, ANSI_ROWS } from './types'
import type { CellHalf } from './gridUtils'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import {
  writeCellToTerminal, parseCellKey, isInBounds,
  computeErasePixelCell, computeLineCells, computeRectCells,
} from './gridUtils'
import { compositeCell, compositeCellWithOverride } from './layerUtils'

export interface DrawHelperDeps {
  container: HTMLElement
  cursorRef: React.RefObject<HTMLDivElement | null>
  dimensionRef: React.RefObject<HTMLDivElement | null>
  handleRef: React.RefObject<AnsiTerminalHandle | null>
  brushRef: React.RefObject<BrushSettings>
  layersRef: React.RefObject<Layer[]>
  activeLayerIdRef: React.RefObject<string>
  previewCellsRef: React.MutableRefObject<Map<string, AnsiCell>>
  lineStartRef: React.MutableRefObject<CellHalf | null>
  getActiveGrid: () => AnsiGrid
  applyCell: (row: number, col: number, cell: AnsiCell) => void
  paintPixel: (row: number, col: number, isTopHalf: boolean) => void
  paintCell: (row: number, col: number) => void
}

type CellPos = { row: number; col: number; isTopHalf?: boolean }

export function createDrawHelpers(deps: DrawHelperDeps) {
  const {
    container, cursorRef, dimensionRef, handleRef, brushRef,
    layersRef, activeLayerIdRef, previewCellsRef, lineStartRef,
    getActiveGrid, applyCell, paintPixel, paintCell,
  } = deps

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

  function hideCursor(): void {
    if (cursorRef.current) cursorRef.current.style.display = 'none'
  }

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

  function hideDimension(): void {
    if (dimensionRef.current) dimensionRef.current.style.display = 'none'
  }

  function isSameCell(a: CellPos, b: CellPos): boolean {
    return a.row === b.row && a.col === b.col && a.isTopHalf === b.isTopHalf
  }

  function cursorHalf(cell: { isTopHalf: boolean }): boolean | undefined {
    return brushRef.current.mode !== 'brush' ? cell.isTopHalf : undefined
  }

  function paintAt(row: number, col: number, isTopHalf: boolean): void {
    const mode = brushRef.current.mode
    if (mode === 'eraser') {
      if (isInBounds(row, col)) {
        applyCell(row, col, computeErasePixelCell(getActiveGrid()[row][col], isTopHalf))
      }
    } else if (mode === 'pixel') {
      paintPixel(row, col, isTopHalf)
    } else {
      paintCell(row, col)
    }
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
    const layers = layersRef.current
    const activeId = activeLayerIdRef.current
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
    const handle = handleRef.current
    const layers = layersRef.current
    if (handle) {
      for (const key of affectedKeys) {
        const [r, c] = parseCellKey(key)
        writeCellToTerminal(handle, r, c, compositeCell(layers, r, c))
      }
    }
  }

  function lineCells(end: CellHalf): Map<string, AnsiCell> {
    return computeLineCells(lineStartRef.current!, end, brushRef.current, getActiveGrid())
  }

  function rectCells(end: CellHalf): Map<string, AnsiCell> {
    return computeRectCells(lineStartRef.current!, end, brushRef.current, getActiveGrid(), brushRef.current.tool === 'rect-filled')
  }

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

  return {
    positionCursor, hideCursor, showDimension, hideDimension,
    isSameCell, cursorHalf, paintAt,
    restorePreview, writePreviewCells, commitCells,
    renderLinePreview, commitLine, renderRectPreview, commitRect,
  }
}
