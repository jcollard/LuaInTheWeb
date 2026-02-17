import { useState, useCallback, useRef } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, AnsiGrid, BrushMode, BrushSettings, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK } from './types'

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

function getCellHalfFromMouse(e: MouseEvent, container: HTMLElement): { row: number; col: number; isTopHalf: boolean } | null {
  const rect = container.getBoundingClientRect()
  const col = Math.floor((e.clientX - rect.left) * ANSI_COLS / rect.width)
  const fractionalRow = (e.clientY - rect.top) * ANSI_ROWS / rect.height
  const row = Math.floor(fractionalRow)
  if (row < 0 || row >= ANSI_ROWS || col < 0 || col >= ANSI_COLS) return null
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

export interface UseAnsiEditorReturn {
  grid: AnsiGrid
  brush: BrushSettings
  setBrushFg: (color: RGBColor) => void
  setBrushBg: (color: RGBColor) => void
  setBrushChar: (char: string) => void
  setBrushMode: (mode: BrushMode) => void
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

  const applyCell = useCallback((row: number, col: number, cell: AnsiCell) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      newGrid[row][col] = cell
      return newGrid
    })
    setIsDirty(true)
    if (handleRef.current) {
      writeCellToTerminal(handleRef.current, row, col, cell)
    }
  }, [])

  const paintPixel = useCallback((row: number, col: number, isTopHalf: boolean) => {
    if (row < 0 || row >= ANSI_ROWS || col < 0 || col >= ANSI_COLS) return
    const newCell = computePixelCell(gridRef.current[row][col], brushRef.current.fg, isTopHalf)
    applyCell(row, col, newCell)
  }, [applyCell])

  const paintCell = useCallback((row: number, col: number) => {
    if (row < 0 || row >= ANSI_ROWS || col < 0 || col >= ANSI_COLS) return
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

    function paintAt(row: number, col: number, isTopHalf: boolean): void {
      if (brushRef.current.mode === 'pixel') {
        paintPixel(row, col, isTopHalf)
      } else {
        paintCell(row, col)
      }
    }

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      paintingRef.current = true
      lastCellRef.current = null

      const cell = getCellHalfFromMouse(e, container)
      if (!cell) return
      lastCellRef.current = cell
      paintAt(cell.row, cell.col, cell.isTopHalf)
      positionCursor(cell.row, cell.col, brushRef.current.mode === 'pixel' ? cell.isTopHalf : undefined)
    }

    function onMouseMove(e: MouseEvent): void {
      const cell = getCellHalfFromMouse(e, container)
      if (cell) {
        positionCursor(cell.row, cell.col, brushRef.current.mode === 'pixel' ? cell.isTopHalf : undefined)
      } else {
        hideCursor()
      }

      if (!paintingRef.current || !cell) return
      const last = lastCellRef.current
      const current = brushRef.current.mode === 'pixel' ? cell : { row: cell.row, col: cell.col }
      if (last && isSameCell(last, current)) return
      lastCellRef.current = current
      paintAt(cell.row, cell.col, cell.isTopHalf)
    }

    function onMouseUp(): void {
      paintingRef.current = false
      lastCellRef.current = null
    }

    function onMouseLeave(): void {
      paintingRef.current = false
      lastCellRef.current = null
      hideCursor()
    }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseup', onMouseUp)
    container.addEventListener('mouseleave', onMouseLeave)

    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [paintCell, paintPixel])

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
