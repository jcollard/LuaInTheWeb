import type { AnsiCell } from './types'
import { HALF_BLOCK } from './types'
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
