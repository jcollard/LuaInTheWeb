import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, AnsiGrid, BrushMode, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, HALF_BLOCK } from './types'
import { bresenhamLine } from './lineAlgorithm'

export function cloneGrid(grid: AnsiGrid): AnsiGrid {
  return grid.map(row => row.map(cell => ({ ...cell, fg: [...cell.fg] as RGBColor, bg: [...cell.bg] as RGBColor })))
}

export function createEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
}

export function writeCellToTerminal(
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

export function renderFullGrid(handle: AnsiTerminalHandle, grid: AnsiGrid): void {
  handle.write('\x1b[2J\x1b[?25l')
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      writeCellToTerminal(handle, r, c, grid[r][c])
    }
  }
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < ANSI_ROWS && col >= 0 && col < ANSI_COLS
}

export function getCellHalfFromMouse(e: MouseEvent, container: HTMLElement): { row: number; col: number; isTopHalf: boolean } | null {
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

export interface LineBrush {
  char: string
  fg: RGBColor
  bg: RGBColor
  mode: BrushMode
}

export interface CellHalf {
  row: number
  col: number
  isTopHalf: boolean
}

export function parseCellKey(key: string): [number, number] {
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
