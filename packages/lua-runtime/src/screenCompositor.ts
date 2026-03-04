/**
 * Layer compositing logic for ANSI screen rendering.
 *
 * Uses the shared compositing engine from @lua-learning/ansi-shared,
 * bound to the runtime's LayerData type guards.
 */

import type { AnsiCell, AnsiGrid, DrawableLayerData, LayerData } from './screenTypes'
import {
  ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG,
  isGroupLayer, isDrawableLayer, isClipLayer, isReferenceLayer, rgbEqual,
  createEmptyGrid,
} from './screenTypes'
import {
  createCompositeEngine,
  compositeCellCore,
  type CompositeEntry,
} from '@lua-learning/ansi-shared'

function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

/**
 * Build a map from group ID to the clip mask grid for that group.
 * Iterates bottom-to-top; topmost visible clip layer per group wins.
 * Paired with clipMaskUtils.ts:buildClipMaskMap
 */
export function buildClipMaskMap(layers: LayerData[]): Map<string, AnsiGrid> {
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
 * Paired with clipMaskUtils.ts:isCellClipped
 */
export function isCellClipped(
  layer: { parentId?: string }, row: number, col: number,
  clipMap: Map<string, AnsiGrid>, layerMap: Map<string, LayerData>,
): boolean {
  let parentId = layer.parentId
  let depth = 0
  while (parentId && depth < 10) {
    depth++
    const mask = clipMap.get(parentId)
    if (mask && isDefaultCell(mask[row][col])) return true
    const parent = layerMap.get(parentId)
    parentId = parent?.parentId
  }
  return false
}

// --- Engine instance (bound to runtime type guards) ---

const engine = createCompositeEngine<LayerData>({
  isGroupLayer,
  isDrawableLayer,
  isReferenceLayer,
  isClipLayer,
  createEmptyGrid,
  buildClipMaskMap,
  isCellClipped,
})

/** Returns IDs of groups that are effectively hidden (own visible=false or any ancestor hidden). */
export function hiddenGroupIds(layers: LayerData[]): Set<string> {
  return engine.hiddenGroupIds(layers)
}

/** Filters to only DrawableLayerData entries, skipping groups and children of hidden groups. */
export function visibleDrawableLayers(layers: LayerData[]): DrawableLayerData[] {
  const hidden = engine.hiddenGroupIds(layers)
  const result: DrawableLayerData[] = []
  for (const layer of layers) {
    if (!isDrawableLayer(layer)) continue
    if (layer.parentId && hidden.has(layer.parentId)) continue
    result.push(layer)
  }
  return result
}

export { compositeCellCore }

/** Composite all visible layers into a pre-allocated target grid (zero allocation). */
export function compositeGridInto(target: AnsiGrid, layers: LayerData[], groupGridCache?: Map<string, AnsiGrid>): void {
  const layerMap = new Map(layers.map(l => [l.id, l]))
  const entries = engine.buildCompositeEntries(layers, layerMap, groupGridCache)
  const clipMap = buildClipMaskMap(layers)
  // Hoisted closure: one closure per grid composite instead of 2000
  let curR = 0, curC = 0
  const getCell = (entry: CompositeEntry) => {
    if (isCellClipped(entry, curR, curC, clipMap, layerMap)) return null
    return engine.getEntryCell(entry, curR, curC)
  }
  for (let r = 0; r < ANSI_ROWS; r++) {
    curR = r
    for (let c = 0; c < ANSI_COLS; c++) {
      curC = c
      const result = compositeCellCore(entries, getCell)
      const cell = target[r][c]
      cell.char = result.char
      cell.fg[0] = result.fg[0]; cell.fg[1] = result.fg[1]; cell.fg[2] = result.fg[2]
      cell.bg[0] = result.bg[0]; cell.bg[1] = result.bg[1]; cell.bg[2] = result.bg[2]
    }
  }
}

/** Composite all visible layers into a single AnsiGrid. */
export function compositeGrid(layers: LayerData[], groupGridCache?: Map<string, AnsiGrid>): AnsiGrid {
  const layerMap = new Map(layers.map(l => [l.id, l]))
  const entries = engine.buildCompositeEntries(layers, layerMap, groupGridCache)
  const clipMap = buildClipMaskMap(layers)
  // Hoisted closure: one closure per grid composite instead of 2000
  let curR = 0, curC = 0
  const getCell = (entry: CompositeEntry) => {
    if (isCellClipped(entry, curR, curC, clipMap, layerMap)) return null
    return engine.getEntryCell(entry, curR, curC)
  }
  return Array.from({ length: ANSI_ROWS }, (_, r) => {
    curR = r
    return Array.from({ length: ANSI_COLS }, (_, c) => {
      curC = c
      return compositeCellCore(entries, getCell)
    })
  })
}
