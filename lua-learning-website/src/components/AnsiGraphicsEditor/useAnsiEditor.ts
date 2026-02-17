import { useState, useCallback, useRef } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiGrid, BrushSettings, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG } from './types'

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

function getCellFromMouse(e: MouseEvent, container: HTMLElement): { row: number; col: number } | null {
  const rect = container.getBoundingClientRect()
  const col = Math.floor((e.clientX - rect.left) * ANSI_COLS / rect.width)
  const row = Math.floor((e.clientY - rect.top) * ANSI_ROWS / rect.height)
  if (row < 0 || row >= ANSI_ROWS || col < 0 || col >= ANSI_COLS) return null
  return { row, col }
}

export interface UseAnsiEditorReturn {
  grid: AnsiGrid
  brush: BrushSettings
  setBrushFg: (color: RGBColor) => void
  setBrushBg: (color: RGBColor) => void
  setBrushChar: (char: string) => void
  clearGrid: () => void
  isDirty: boolean
  onTerminalReady: (handle: AnsiTerminalHandle | null) => void
  cursorRef: React.RefObject<HTMLDivElement | null>
}

export function useAnsiEditor(): UseAnsiEditorReturn {
  const [grid, setGrid] = useState<AnsiGrid>(createEmptyGrid)
  const [brush, setBrush] = useState<BrushSettings>({
    char: '#',
    fg: DEFAULT_FG,
    bg: DEFAULT_BG,
  })
  const [isDirty, setIsDirty] = useState(false)

  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const gridRef = useRef(grid)
  gridRef.current = grid
  const brushRef = useRef(brush)
  brushRef.current = brush
  const paintingRef = useRef(false)
  const lastCellRef = useRef<{ row: number; col: number } | null>(null)
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

  const paintCell = useCallback((row: number, col: number) => {
    if (row < 0 || row >= ANSI_ROWS || col < 0 || col >= ANSI_COLS) return

    const currentBrush = brushRef.current
    const newCell = { char: currentBrush.char, fg: [...currentBrush.fg] as RGBColor, bg: [...currentBrush.bg] as RGBColor }

    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      newGrid[row][col] = newCell
      return newGrid
    })
    setIsDirty(true)

    if (handleRef.current) {
      writeCellToTerminal(handleRef.current, row, col, newCell)
    }
  }, [])

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
    function positionCursor(row: number, col: number): void {
      const el = cursorRef.current
      if (!el) return
      const rect = container.getBoundingClientRect()
      const cellW = rect.width / ANSI_COLS
      const cellH = rect.height / ANSI_ROWS
      el.style.display = 'block'
      el.style.left = `${rect.left + col * cellW}px`
      el.style.top = `${rect.top + row * cellH}px`
      el.style.width = `${cellW}px`
      el.style.height = `${cellH}px`
    }

    function hideCursor(): void {
      const el = cursorRef.current
      if (el) el.style.display = 'none'
    }

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      paintingRef.current = true
      lastCellRef.current = null
      const cell = getCellFromMouse(e, container)
      if (cell) {
        lastCellRef.current = cell
        paintCell(cell.row, cell.col)
        positionCursor(cell.row, cell.col)
      }
    }

    function onMouseMove(e: MouseEvent): void {
      const cell = getCellFromMouse(e, container)
      if (cell) {
        positionCursor(cell.row, cell.col)
      } else {
        hideCursor()
      }

      if (!paintingRef.current || !cell) return
      const last = lastCellRef.current
      if (last && last.row === cell.row && last.col === cell.col) return
      lastCellRef.current = cell
      paintCell(cell.row, cell.col)
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
  }, [paintCell])

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
    clearGrid,
    isDirty,
    onTerminalReady,
    cursorRef,
  }
}
