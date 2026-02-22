import type { AnsiCell, AnsiGrid } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_CELL } from './types'
import { isInBounds } from './gridUtils'
import { isDefaultCell } from './layerUtils'

/** Scan a grid and return a map of "row,col" -> cell for all non-default cells. */
export function captureNonDefaultCells(grid: AnsiGrid): Map<string, AnsiCell> {
  const captured = new Map<string, AnsiCell>()
  for (let r = 0; r < ANSI_ROWS; r++)
    for (let c = 0; c < ANSI_COLS; c++) {
      const cell = grid[r][c]
      if (!isDefaultCell(cell)) captured.set(`${r},${c}`, cell)
    }
  return captured
}

/**
 * For each layer, shift captured cells by (dr, dc) across ALL frames.
 * Reuses pre-allocated blank grids for performance during RAF dragging.
 */
export function buildAllShiftedFrames(
  capturedFrames: Map<string, Map<string, AnsiCell>[]>,
  blankFrames: Map<string, AnsiGrid[]>,
  dr: number,
  dc: number,
): Map<string, AnsiGrid[]> {
  const result = new Map<string, AnsiGrid[]>()
  for (const [layerId, frameCaps] of capturedFrames) {
    const blanks = blankFrames.get(layerId)
    if (!blanks) continue
    const shifted: AnsiGrid[] = []
    for (let f = 0; f < frameCaps.length; f++) {
      const grid = blanks[f]
      if (!grid) continue
      for (let r = 0; r < ANSI_ROWS; r++)
        for (let c = 0; c < ANSI_COLS; c++)
          grid[r][c] = DEFAULT_CELL
      for (const [key, cell] of frameCaps[f]) {
        const [rStr, cStr] = key.split(',')
        const nr = parseInt(rStr, 10) + dr
        const nc = parseInt(cStr, 10) + dc
        if (isInBounds(nr, nc)) grid[nr][nc] = cell
      }
      shifted.push(grid)
    }
    result.set(layerId, shifted)
  }
  return result
}
