import { useState, useCallback, useRef } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, AnsiGrid, BrushMode, DrawTool, BrushSettings, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import {
  cloneGrid, createEmptyGrid, writeCellToTerminal, renderFullGrid,
  isInBounds, getCellHalfFromMouse, computePixelCell, computeLineCells, computeRectCells, parseCellKey,
} from './gridUtils'
import type { CellHalf } from './gridUtils'

export { computePixelCell, computeLineCells } from './gridUtils'

const MAX_HISTORY = 50

export interface UseAnsiEditorReturn {
  grid: AnsiGrid
  brush: BrushSettings
  setBrushFg: (color: RGBColor) => void
  setBrushBg: (color: RGBColor) => void
  setBrushChar: (char: string) => void
  setBrushMode: (mode: BrushMode) => void
  setTool: (tool: DrawTool) => void
  clearGrid: () => void
  isDirty: boolean
  markClean: () => void
  onTerminalReady: (handle: AnsiTerminalHandle | null) => void
  cursorRef: React.RefObject<HTMLDivElement | null>
  isSaveDialogOpen: boolean
  openSaveDialog: () => void
  closeSaveDialog: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export interface UseAnsiEditorOptions {
  initialGrid?: AnsiGrid
}

export function useAnsiEditor(options?: UseAnsiEditorOptions): UseAnsiEditorReturn {
  const [grid, setGrid] = useState<AnsiGrid>(() => options?.initialGrid ?? createEmptyGrid())
  const [brush, setBrush] = useState<BrushSettings>({
    char: '#', fg: DEFAULT_FG, bg: DEFAULT_BG, mode: 'brush', tool: 'pencil',
  })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const undoStackRef = useRef<AnsiGrid[]>([])
  const redoStackRef = useRef<AnsiGrid[]>([])
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const gridRef = useRef(grid)
  gridRef.current = grid
  const brushRef = useRef(brush)
  brushRef.current = brush
  const paintingRef = useRef(false)
  const lastCellRef = useRef<{ row: number; col: number; isTopHalf?: boolean } | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const lineStartRef = useRef<CellHalf | null>(null)
  const previewCellsRef = useRef<Map<string, AnsiCell>>(new Map())
  const cleanupRef = useRef<(() => void) | null>(null)

  const pushSnapshot = useCallback(() => {
    const stack = undoStackRef.current
    stack.push(cloneGrid(gridRef.current))
    if (stack.length > MAX_HISTORY) stack.shift()
    redoStackRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const restoreSnapshot = useCallback((from: AnsiGrid[], to: AnsiGrid[]) => {
    if (from.length === 0) return
    to.push(cloneGrid(gridRef.current))
    const snapshot = from.pop()!
    gridRef.current = snapshot
    setGrid(snapshot)
    setIsDirty(true)
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
    if (handleRef.current) renderFullGrid(handleRef.current, snapshot)
  }, [])

  const undo = useCallback(() => restoreSnapshot(undoStackRef.current, redoStackRef.current), [restoreSnapshot])
  const redo = useCallback(() => restoreSnapshot(redoStackRef.current, undoStackRef.current), [restoreSnapshot])

  const setBrushFg = useCallback((color: RGBColor) => setBrush(prev => ({ ...prev, fg: color })), [])
  const setBrushBg = useCallback((color: RGBColor) => setBrush(prev => ({ ...prev, bg: color })), [])
  const setBrushChar = useCallback((char: string) => {
    if (char.length === 1) setBrush(prev => ({ ...prev, char }))
  }, [])
  const setBrushMode = useCallback((mode: BrushMode) => setBrush(prev => ({ ...prev, mode })), [])
  const setTool = useCallback((tool: DrawTool) => setBrush(prev => ({ ...prev, tool })), [])

  const applyCell = useCallback((row: number, col: number, cell: AnsiCell) => {
    const newRow = [...gridRef.current[row]]
    newRow[col] = cell
    const newGrid = [...gridRef.current] as AnsiGrid
    newGrid[row] = newRow
    gridRef.current = newGrid
    setGrid(newGrid)
    setIsDirty(true)
    if (handleRef.current) writeCellToTerminal(handleRef.current, row, col, cell)
  }, [])

  const paintPixel = useCallback((row: number, col: number, isTopHalf: boolean) => {
    if (!isInBounds(row, col)) return
    applyCell(row, col, computePixelCell(gridRef.current[row][col], brushRef.current.fg, isTopHalf))
  }, [applyCell])

  const paintCell = useCallback((row: number, col: number) => {
    if (!isInBounds(row, col)) return
    const { char, fg, bg } = brushRef.current
    applyCell(row, col, { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor })
  }, [applyCell])

  const clearGrid = useCallback(() => {
    pushSnapshot()
    const newGrid = createEmptyGrid()
    gridRef.current = newGrid
    setGrid(newGrid)
    setIsDirty(false)
    if (handleRef.current) renderFullGrid(handleRef.current, newGrid)
  }, [pushSnapshot])

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

    function hideCursor(): void {
      const el = cursorRef.current
      if (el) el.style.display = 'none'
    }

    function isSameCell(
      a: { row: number; col: number; isTopHalf?: boolean },
      b: { row: number; col: number; isTopHalf?: boolean },
    ): boolean {
      return a.row === b.row && a.col === b.col && a.isTopHalf === b.isTopHalf
    }

    function cursorHalf(cell: { isTopHalf: boolean }): boolean | undefined {
      return brushRef.current.mode === 'pixel' ? cell.isTopHalf : undefined
    }

    function paintAt(row: number, col: number, isTopHalf: boolean): void {
      if (brushRef.current.mode === 'pixel') paintPixel(row, col, isTopHalf)
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

    function getLineCells(end: CellHalf): Map<string, AnsiCell> | null {
      const start = lineStartRef.current
      if (!start) return null
      restorePreview()
      return computeLineCells(start, end, brushRef.current, gridRef.current)
    }

    function renderLinePreview(end: CellHalf): void {
      const lineCells = getLineCells(end)
      if (!lineCells) return
      const handle = handleRef.current
      if (!handle) return
      for (const [key, cell] of lineCells) {
        const [r, c] = parseCellKey(key)
        if (!previewCellsRef.current.has(key)) {
          previewCellsRef.current.set(key, gridRef.current[r][c])
        }
        writeCellToTerminal(handle, r, c, cell)
      }
    }

    function commitLine(end: CellHalf): void {
      const start = lineStartRef.current
      if (!start) return
      const affectedKeys = new Set(previewCellsRef.current.keys())
      previewCellsRef.current.clear()
      const lineCells = computeLineCells(start, end, brushRef.current, gridRef.current)
      for (const [key, cell] of lineCells) {
        const [r, c] = parseCellKey(key)
        applyCell(r, c, cell)
        affectedKeys.add(key)
      }
      const handle = handleRef.current
      if (handle) {
        for (const key of affectedKeys) {
          const [r, c] = parseCellKey(key)
          writeCellToTerminal(handle, r, c, gridRef.current[r][c])
        }
      }
      lineStartRef.current = null
    }

    function cancelLine(): void {
      restorePreview()
      lineStartRef.current = null
    }

    function getRectCells(end: CellHalf): Map<string, AnsiCell> | null {
      const start = lineStartRef.current
      if (!start) return null
      restorePreview()
      const filled = brushRef.current.tool === 'rect-filled'
      return computeRectCells(start, end, brushRef.current, gridRef.current, filled)
    }

    function renderRectPreview(end: CellHalf): void {
      const rectCells = getRectCells(end)
      if (!rectCells) return
      const handle = handleRef.current
      if (!handle) return
      for (const [key, cell] of rectCells) {
        const [r, c] = parseCellKey(key)
        if (!previewCellsRef.current.has(key)) {
          previewCellsRef.current.set(key, gridRef.current[r][c])
        }
        writeCellToTerminal(handle, r, c, cell)
      }
    }

    function commitRect(end: CellHalf): void {
      const start = lineStartRef.current
      if (!start) return
      const affectedKeys = new Set(previewCellsRef.current.keys())
      previewCellsRef.current.clear()
      const filled = brushRef.current.tool === 'rect-filled'
      const rectCells = computeRectCells(start, end, brushRef.current, gridRef.current, filled)
      for (const [key, cell] of rectCells) {
        const [r, c] = parseCellKey(key)
        applyCell(r, c, cell)
        affectedKeys.add(key)
      }
      const handle = handleRef.current
      if (handle) {
        for (const key of affectedKeys) {
          const [r, c] = parseCellKey(key)
          writeCellToTerminal(handle, r, c, gridRef.current[r][c])
        }
      }
      lineStartRef.current = null
    }

    function cancelRect(): void {
      restorePreview()
      lineStartRef.current = null
    }

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      const cell = getCellHalfFromMouse(e, container)
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
          const current = brushRef.current.mode === 'pixel' ? cell : { row: cell.row, col: cell.col }
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
          else cancelLine()
          break
        }
        case 'rect-outline':
        case 'rect-filled': {
          if (!lineStartRef.current) break
          const cell = getCellHalfFromMouse(e, container)
          if (cell) commitRect(cell)
          else cancelRect()
          break
        }
      }
    }

    function onMouseLeave(): void { hideCursor() }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseup', onDocumentMouseUp)
    }
  }, [paintCell, paintPixel, applyCell, pushSnapshot])

  const markClean = useCallback(() => setIsDirty(false), [])
  const openSaveDialog = useCallback(() => setIsSaveDialogOpen(true), [])
  const closeSaveDialog = useCallback(() => setIsSaveDialogOpen(false), [])

  const onTerminalReady = useCallback((handle: AnsiTerminalHandle | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    handleRef.current = handle
    if (handle) {
      renderFullGrid(handle, gridRef.current)
      cleanupRef.current = attachMouseListeners(handle.container)
    }
  }, [attachMouseListeners])

  return {
    grid, brush, setBrushFg, setBrushBg, setBrushChar, setBrushMode, setTool,
    clearGrid, isDirty, markClean, onTerminalReady, cursorRef,
    isSaveDialogOpen, openSaveDialog, closeSaveDialog, undo, redo, canUndo, canRedo,
  }
}
