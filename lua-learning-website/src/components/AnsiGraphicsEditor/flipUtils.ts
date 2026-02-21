import type { AnsiCell, AnsiGrid, DrawnLayer, RGBColor, TextLayer } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_CELL, HALF_BLOCK } from './types'
import { cloneCell, parseCellKey } from './gridUtils'

export function flipCellsHorizontal(cells: Map<string, AnsiCell>): Map<string, AnsiCell> {
  if (cells.size === 0) return new Map()
  let minC = Infinity
  let maxC = -Infinity
  for (const key of cells.keys()) {
    const [, c] = parseCellKey(key)
    if (c < minC) minC = c
    if (c > maxC) maxC = c
  }
  const result = new Map<string, AnsiCell>()
  for (const [key, cell] of cells) {
    const [r, c] = parseCellKey(key)
    result.set(`${r},${minC + maxC - c}`, cloneCell(cell))
  }
  return result
}

export function flipCellsVertical(cells: Map<string, AnsiCell>): Map<string, AnsiCell> {
  if (cells.size === 0) return new Map()
  let minR = Infinity
  let maxR = -Infinity
  for (const key of cells.keys()) {
    const [r] = parseCellKey(key)
    if (r < minR) minR = r
    if (r > maxR) maxR = r
  }
  const result = new Map<string, AnsiCell>()
  for (const [key, cell] of cells) {
    const [r, c] = parseCellKey(key)
    const cloned = cloneCell(cell)
    // For half-block cells, swap fg (top half) and bg (bottom half)
    if (cloned.char === HALF_BLOCK) {
      ;[cloned.fg, cloned.bg] = [cloned.bg, cloned.fg]
    }
    result.set(`${minR + maxR - r},${c}`, cloned)
  }
  return result
}

function cloneDefaultCell(): AnsiCell {
  return { char: DEFAULT_CELL.char, fg: [...DEFAULT_CELL.fg] as RGBColor, bg: [...DEFAULT_CELL.bg] as RGBColor }
}

export function flipGridHorizontal(grid: AnsiGrid, originCol: number): AnsiGrid {
  const result: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, cloneDefaultCell),
  )
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const nc = 2 * originCol - c
      if (nc < 0 || nc >= ANSI_COLS) continue
      result[r][nc] = cloneCell(grid[r][c])
    }
  }
  return result
}

export function flipGridVertical(grid: AnsiGrid, originRow: number): AnsiGrid {
  const result: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, cloneDefaultCell),
  )
  for (let r = 0; r < ANSI_ROWS; r++) {
    const nr = 2 * originRow - r
    if (nr < 0 || nr >= ANSI_ROWS) continue
    for (let c = 0; c < ANSI_COLS; c++) {
      const cloned = cloneCell(grid[r][c])
      if (cloned.char === HALF_BLOCK) {
        ;[cloned.fg, cloned.bg] = [cloned.bg, cloned.fg]
      }
      result[nr][c] = cloned
    }
  }
  return result
}

export function flipDrawnLayerHorizontal(layer: DrawnLayer, originCol: number): DrawnLayer {
  const newFrames = layer.frames.map(frame => flipGridHorizontal(frame, originCol))
  return { ...layer, frames: newFrames, grid: newFrames[layer.currentFrameIndex] }
}

export function flipDrawnLayerVertical(layer: DrawnLayer, originRow: number): DrawnLayer {
  const newFrames = layer.frames.map(frame => flipGridVertical(frame, originRow))
  return { ...layer, frames: newFrames, grid: newFrames[layer.currentFrameIndex] }
}

export function flipTextLayerHorizontal(layer: TextLayer, originCol: number): TextLayer {
  const nc0 = 2 * originCol - layer.bounds.c0
  const nc1 = 2 * originCol - layer.bounds.c1
  return {
    ...layer,
    bounds: { ...layer.bounds, c0: Math.min(nc0, nc1), c1: Math.max(nc0, nc1) },
  }
}

export function flipTextLayerVertical(layer: TextLayer, originRow: number): TextLayer {
  const nr0 = 2 * originRow - layer.bounds.r0
  const nr1 = 2 * originRow - layer.bounds.r1
  return {
    ...layer,
    bounds: { ...layer.bounds, r0: Math.min(nr0, nr1), r1: Math.max(nr0, nr1) },
  }
}
