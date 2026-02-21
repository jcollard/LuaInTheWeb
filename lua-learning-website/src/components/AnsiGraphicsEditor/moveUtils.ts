import type { AnsiCell, AnsiGrid } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_CELL } from './types'

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
      // Reset blank grid
      for (let r = 0; r < ANSI_ROWS; r++)
        for (let c = 0; c < ANSI_COLS; c++)
          grid[r][c] = DEFAULT_CELL
      // Place shifted cells
      for (const [key, cell] of frameCaps[f]) {
        const [rStr, cStr] = key.split(',')
        const nr = parseInt(rStr, 10) + dr
        const nc = parseInt(cStr, 10) + dc
        if (nr >= 0 && nr < ANSI_ROWS && nc >= 0 && nc < ANSI_COLS)
          grid[nr][nc] = cell
      }
      shifted.push(grid)
    }
    result.set(layerId, shifted)
  }
  return result
}
