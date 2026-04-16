/**
 * Layer compositing logic for ANSI screen rendering.
 *
 * Uses the shared compositing engine from @lua-learning/ansi-shared,
 * bound to the runtime's LayerData type guards.
 */

import type { AnsiCell, AnsiGrid, DrawableLayerData, LayerData } from './screenTypes'
import {
  DEFAULT_FG, DEFAULT_BG,
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
    if (mask) {
      const maskRows = mask.length
      const maskCols = mask[0]?.length ?? 0
      if (row < 0 || row >= maskRows || col < 0 || col >= maskCols) return true
      if (isDefaultCell(mask[row][col])) return true
    }
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

/**
 * Post-process composite entries to apply runtime offsets from LayerData.
 * Drawable entries with nonzero runtime offsets are promoted to reference entries
 * so the shared engine's offset-aware getEntryCell handles them.
 * Reference entries accumulate runtime offsets onto their existing offsets.
 */
export function applyRuntimeOffsets(
  entries: CompositeEntry[], layerMap: Map<string, LayerData>,
): CompositeEntry[] {
  let changed = false
  const result: CompositeEntry[] = []
  for (const entry of entries) {
    const layer = layerMap.get(entry.id)
    const offRow = layer?.runtimeOffsetRow ?? 0
    const offCol = layer?.runtimeOffsetCol ?? 0
    if (offRow === 0 && offCol === 0) {
      result.push(entry)
      continue
    }
    changed = true
    if (entry.kind === 'drawable') {
      result.push({
        kind: 'reference' as const,
        id: entry.id,
        visible: entry.visible,
        parentId: entry.parentId,
        sourceGrid: entry.grid,
        offsetRow: offRow,
        offsetCol: offCol,
      })
    } else {
      result.push({
        ...entry,
        offsetRow: entry.offsetRow + offRow,
        offsetCol: entry.offsetCol + offCol,
      })
    }
  }
  return changed ? result : entries
}

/** Composite all visible layers into a pre-allocated target grid (zero allocation). */
export function compositeGridInto(
  target: AnsiGrid, layers: LayerData[],
  groupGridCache?: Map<string, AnsiGrid>,
  viewportRow = 0, viewportCol = 0,
): void {
  const layerMap = new Map(layers.map(l => [l.id, l]))
  const rawEntries = engine.buildCompositeEntries(layers, layerMap, groupGridCache)
  const entries = applyRuntimeOffsets(rawEntries, layerMap)
  const clipMap = buildClipMaskMap(layers)
  let curR = 0, curC = 0
  const getCell = (entry: CompositeEntry) => {
    if (isCellClipped(entry, curR, curC, clipMap, layerMap)) return null
    return engine.getEntryCell(entry, curR, curC)
  }
  const targetRows = target.length
  const targetCols = target[0]?.length ?? 0
  for (let r = 0; r < targetRows; r++) {
    for (let c = 0; c < targetCols; c++) {
      curR = r + viewportRow
      curC = c + viewportCol
      const result = compositeCellCore(entries, getCell)
      const cell = target[r][c]
      cell.char = result.char
      cell.fg[0] = result.fg[0]; cell.fg[1] = result.fg[1]; cell.fg[2] = result.fg[2]
      cell.bg[0] = result.bg[0]; cell.bg[1] = result.bg[1]; cell.bg[2] = result.bg[2]
    }
  }
}

/**
 * Composite all visible layers into a single AnsiGrid.
 * When `cols`/`rows` are omitted, uses the default 80×25 canvas.
 */
export function compositeGrid(
  layers: LayerData[],
  groupGridCache?: Map<string, AnsiGrid>,
  cols?: number,
  rows?: number,
): AnsiGrid {
  const target = createEmptyGrid(cols, rows)
  compositeGridInto(target, layers, groupGridCache)
  return target
}
