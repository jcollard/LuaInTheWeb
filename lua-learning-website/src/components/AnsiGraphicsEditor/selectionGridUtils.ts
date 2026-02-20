import type { AnsiCell, AnsiGrid } from './types'
import { cloneCell, cloneDefaultCell, parseCellKey } from './gridUtils'

export function extractRegionCells(
  grid: AnsiGrid, r0: number, c0: number, r1: number, c1: number,
): Map<string, AnsiCell> {
  const cells = new Map<string, AnsiCell>()
  const rows = grid.length
  const cols = rows > 0 ? grid[0].length : 0
  const minR = Math.max(0, Math.min(r0, r1))
  const maxR = Math.min(rows - 1, Math.max(r0, r1))
  const minC = Math.max(0, Math.min(c0, c1))
  const maxC = Math.min(cols - 1, Math.max(c0, c1))
  if (r0 > r1 || c0 > c1) return cells
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      cells.set(`${r},${c}`, cloneCell(grid[r][c]))
    }
  }
  return cells
}

export function computeSelectionMoveCells(
  captured: Map<string, AnsiCell>,
  srcR0: number, srcC0: number,
  dstR0: number, dstC0: number,
  gridRows: number, gridCols: number,
): Map<string, AnsiCell> {
  const result = new Map<string, AnsiCell>()
  const dr = dstR0 - srcR0
  const dc = dstC0 - srcC0

  // If no movement, just return the captured cells at their original positions
  if (dr === 0 && dc === 0) {
    for (const [key, cell] of captured) {
      result.set(key, cloneCell(cell))
    }
    return result
  }

  // Clear source positions
  for (const key of captured.keys()) {
    result.set(key, cloneDefaultCell())
  }

  // Write destination positions (overwrites source if overlapping)
  for (const [key, cell] of captured) {
    const [r, c] = parseCellKey(key)
    const newR = r + dr
    const newC = c + dc
    if (newR < 0 || newR >= gridRows || newC < 0 || newC >= gridCols) continue
    result.set(`${newR},${newC}`, cloneCell(cell))
  }

  return result
}

function remapKeys(cells: Map<string, AnsiCell>, dr: number, dc: number): Map<string, AnsiCell> {
  const result = new Map<string, AnsiCell>()
  for (const [key, cell] of cells) {
    const [r, c] = parseCellKey(key)
    result.set(`${r + dr},${c + dc}`, cloneCell(cell))
  }
  return result
}

export function toRelativeKeys(cells: Map<string, AnsiCell>, originR: number, originC: number): Map<string, AnsiCell> {
  return remapKeys(cells, -originR, -originC)
}

export function toAbsoluteKeys(cells: Map<string, AnsiCell>, originR: number, originC: number): Map<string, AnsiCell> {
  return remapKeys(cells, originR, originC)
}
