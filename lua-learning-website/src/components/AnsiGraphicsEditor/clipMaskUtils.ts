import type { AnsiCell, AnsiGrid, ClipLayer, Layer, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, isClipLayer, getParentId } from './types'

function rgbEq(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

function isDefault(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEq(cell.fg, DEFAULT_FG) && rgbEq(cell.bg, DEFAULT_BG)
}

export function createClipLayer(name: string, parentId: string, id?: string): ClipLayer {
  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
  return {
    type: 'clip',
    id: id ?? crypto.randomUUID(),
    name,
    visible: true,
    grid,
    parentId,
  }
}

/**
 * Build a map from group ID to the clip mask grid for that group.
 * Iterates bottom-to-top; topmost visible clip layer per group wins.
 * Paired with screenCompositor.ts:buildClipMaskMap
 */
export function buildClipMaskMap(layers: Layer[]): Map<string, AnsiGrid> {
  const map = new Map<string, AnsiGrid>()
  for (const layer of layers) {
    if (!isClipLayer(layer) || !layer.visible || !layer.parentId) continue
    map.set(layer.parentId, layer.grid)
  }
  return map
}

/**
 * Check if a cell is clipped by any ancestor's clip mask.
 * Walks the ancestor chain; if ANY ancestor's mask has a default cell at (row, col), returns true.
 * Paired with screenCompositor.ts:isCellClipped
 */
export function isCellClipped(
  layer: Layer, row: number, col: number,
  clipMap: Map<string, AnsiGrid>, layerMap: Map<string, Layer>,
): boolean {
  const visited = new Set<string>()
  let parentId = getParentId(layer)
  while (parentId) {
    if (visited.has(parentId)) break
    visited.add(parentId)
    const mask = clipMap.get(parentId)
    if (mask && isDefault(mask[row][col])) return true
    const parent = layerMap.get(parentId)
    parentId = parent ? getParentId(parent) : undefined
  }
  return false
}
