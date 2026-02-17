import { useState, useCallback, useRef } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, AnsiGrid, BrushMode, DrawTool, BrushSettings, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK } from './types'
import { bresenhamLine } from './lineAlgorithm'

function createEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
}

function writeCellToTerminal(
  handle: AnsiTerminalHandle,
  row: number,
  col: number,
  cell: { char: string; fg: RGBColor; bg: RGBColor },
): void {
  const posSeq = `\x1b[${row + 1};${col + 1}H`
  const fgSeq = `\x1b[38;2;${cell.fg[0]};${cell.fg[1]};${cell.fg[2]}m`
  const bgSeq = `\x1b[48;2;${cell.bg[0]};${cell.bg[1]};${cell.bg[2]}m`
  handle.write(`${posSeq}${fgSeq}${bgSeq}${cell.char}\x1b[0m`)
}

function renderFullGrid(handle: AnsiTerminalHandle, grid: AnsiGrid): void {
  handle.write('\x1b[2J\x1b[?25l')
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      writeCellToTerminal(handle, r, c, grid[r][c])
    }
  }
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < ANSI_ROWS && col >= 0 && col < ANSI_COLS
}

function getCellHalfFromMouse(e: MouseEvent, container: HTMLElement): { row: number; col: number; isTopHalf: boolean } | null {
  const rect = container.getBoundingClientRect()
  const col = Math.floor((e.clientX - rect.left) * ANSI_COLS / rect.width)
  const fractionalRow = (e.clientY - rect.top) * ANSI_ROWS / rect.height
  const row = Math.floor(fractionalRow)
  if (!isInBounds(row, col)) return null
  const isTopHalf = (fractionalRow - row) < 0.5
  return { row, col, isTopHalf }
}

export function computePixelCell(existingCell: AnsiCell, paintColor: RGBColor, isTopHalf: boolean): AnsiCell {
  const isPixelCell = existingCell.char === HALF_BLOCK
  const existingTop: RGBColor = isPixelCell ? [...existingCell.fg] as RGBColor : [...existingCell.bg] as RGBColor
  const existingBottom: RGBColor = [...existingCell.bg] as RGBColor

  return {
    char: HALF_BLOCK,
    fg: isTopHalf ? [...paintColor] as RGBColor : existingTop,
    bg: isTopHalf ? existingBottom : [...paintColor] as RGBColor,
  }
}

interface LineBrush {
  char: string
  fg: RGBColor
  bg: RGBColor
  mode: BrushMode
}

interface CellHalf {
  row: number
  col: number
  isTopHalf: boolean
}

function parseCellKey(key: string): [number, number] {
  const [r, c] = key.split(',').map(Number)
  return [r, c]
}

export function computeLineCells(
  start: CellHalf,
  end: CellHalf,
  brush: LineBrush,
  baseGrid: AnsiGrid,
): Map<string, AnsiCell> {
  const cells = new Map<string, AnsiCell>()

  if (brush.mode === 'pixel') {
    const py0 = start.row * 2 + (start.isTopHalf ? 0 : 1)
    const py1 = end.row * 2 + (end.isTopHalf ? 0 : 1)
    const points = bresenhamLine(start.col, py0, end.col, py1)

    for (const { x: col, y: pixelY } of points) {
      const row = Math.floor(pixelY / 2)
      if (!isInBounds(row, col)) continue
      const isTop = pixelY % 2 === 0
      const key = `${row},${col}`
      const existing = cells.get(key) ?? baseGrid[row][col]
      cells.set(key, computePixelCell(existing, brush.fg, isTop))
    }
  } else {
    const points = bresenhamLine(start.col, start.row, end.col, end.row)

    for (const { x: col, y: row } of points) {
      if (!isInBounds(row, col)) continue
      const key = `${row},${col}`
      cells.set(key, { char: brush.char, fg: [...brush.fg] as RGBColor, bg: [...brush.bg] as RGBColor })
    }
  }

  return cells
}

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
}

export interface UseAnsiEditorOptions {
  initialGrid?: AnsiGrid
}

export function useAnsiEditor(options?: UseAnsiEditorOptions): UseAnsiEditorReturn {
  const [grid, setGrid] = useState<AnsiGrid>(() => options?.initialGrid ?? createEmptyGrid())
  const [brush, setBrush] = useState<BrushSettings>({
    char: '#',
    fg: DEFAULT_FG,
    bg: DEFAULT_BG,
    mode: 'brush',
    tool: 'pencil',
  })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)

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

  const setBrushFg = useCallback((color: RGBColor) => {
    setBrush(prev => ({ ...prev, fg: color }))
  }, [])

  const setBrushBg = useCallback((color: RGBColor) => {
    setBrush(prev => ({ ...prev, bg: color }))
  }, [])

  const setBrushChar = useCallback((char: string) => {
    if (char.length === 1) {
      setBrush(prev => ({ ...prev, char }))
    }
  }, [])

  const setBrushMode = useCallback((mode: BrushMode) => {
    setBrush(prev => ({ ...prev, mode }))
  }, [])

  const setTool = useCallback((tool: DrawTool) => {
    setBrush(prev => ({ ...prev, tool }))
  }, [])

  const applyCell = useCallback((row: number, col: number, cell: AnsiCell) => {
    const newRow = [...gridRef.current[row]]
    newRow[col] = cell
    const newGrid = [...gridRef.current] as AnsiGrid
    newGrid[row] = newRow
    gridRef.current = newGrid
    setGrid(newGrid)
    setIsDirty(true)
    if (handleRef.current) {
      writeCellToTerminal(handleRef.current, row, col, cell)
    }
  }, [])

  const paintPixel = useCallback((row: number, col: number, isTopHalf: boolean) => {
    if (!isInBounds(row, col)) return
    const newCell = computePixelCell(gridRef.current[row][col], brushRef.current.fg, isTopHalf)
    applyCell(row, col, newCell)
  }, [applyCell])

  const paintCell = useCallback((row: number, col: number) => {
    if (!isInBounds(row, col)) return
    const { char, fg, bg } = brushRef.current
    applyCell(row, col, { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor })
  }, [applyCell])

  const clearGrid = useCallback(() => {
    const newGrid = createEmptyGrid()
    setGrid(newGrid)
    setIsDirty(false)
    if (handleRef.current) {
      renderFullGrid(handleRef.current, newGrid)
    }
  }, [])

  // Attach mouse listeners directly when terminal handle arrives, avoiding
  // the extra state flag + useEffect indirection.
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

    function isSameCell(a: { row: number; col: number; isTopHalf?: boolean }, b: { row: number; col: number; isTopHalf?: boolean }): boolean {
      return a.row === b.row && a.col === b.col && a.isTopHalf === b.isTopHalf
    }

    function cursorHalf(cell: { isTopHalf: boolean }): boolean | undefined {
      return brushRef.current.mode === 'pixel' ? cell.isTopHalf : undefined
    }

    function paintAt(row: number, col: number, isTopHalf: boolean): void {
      if (brushRef.current.mode === 'pixel') {
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
      // Collect all cells visually affected by the preview
      const affectedKeys = new Set(previewCellsRef.current.keys())
      previewCellsRef.current.clear()
      // Compute and commit line cells to grid
      const lineCells = computeLineCells(start, end, brushRef.current, gridRef.current)
      for (const [key, cell] of lineCells) {
        const [r, c] = parseCellKey(key)
        applyCell(r, c, cell)
        affectedKeys.add(key)
      }
      // Redraw all affected cells from the authoritative grid state
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

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      const cell = getCellHalfFromMouse(e, container)
      switch (brushRef.current.tool) {
        case 'pencil': {
          paintingRef.current = true
          lastCellRef.current = null
          if (!cell) return
          lastCellRef.current = cell
          paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line': {
          if (!cell) return
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          renderLinePreview(cell)
          break
        }
      }
      if (cell) {
        positionCursor(cell.row, cell.col, cursorHalf(cell))
      }
      document.addEventListener('mouseup', onDocumentMouseUp)
    }

    function onMouseMove(e: MouseEvent): void {
      const cell = getCellHalfFromMouse(e, container)
      if (cell) {
        positionCursor(cell.row, cell.col, cursorHalf(cell))
      } else {
        hideCursor()
      }

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
          if (lineStartRef.current) {
            renderLinePreview(cell)
          }
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
            commitLine(cell)
          } else {
            cancelLine()
          }
          break
        }
      }
    }

    function onMouseLeave(): void {
      hideCursor()
    }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)

    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseup', onDocumentMouseUp)
    }
  }, [paintCell, paintPixel, applyCell])

  const markClean = useCallback(() => setIsDirty(false), [])

  const openSaveDialog = useCallback(() => setIsSaveDialogOpen(true), [])
  const closeSaveDialog = useCallback(() => setIsSaveDialogOpen(false), [])

  const onTerminalReady = useCallback((handle: AnsiTerminalHandle | null) => {
    // Clean up previous listeners before attaching new ones
    cleanupRef.current?.()
    cleanupRef.current = null

    handleRef.current = handle
    if (handle) {
      renderFullGrid(handle, gridRef.current)
      cleanupRef.current = attachMouseListeners(handle.container)
    }
  }, [attachMouseListeners])

  return {
    grid,
    brush,
    setBrushFg,
    setBrushBg,
    setBrushChar,
    setBrushMode,
    setTool,
    clearGrid,
    isDirty,
    markClean,
    onTerminalReady,
    cursorRef,
    isSaveDialogOpen,
    openSaveDialog,
    closeSaveDialog,
  }
}
