import type { AnsiCell, AnsiGrid, DrawableLayer, Layer } from './types'
import { isGroupLayer, isDrawableLayer, isReferenceLayer } from './types'
import { buildClipMaskMap, isCellClipped } from './clipMaskUtils'
import { createEmptyGrid } from './gridUtils'
import {
  createCompositeEngine,
  compositeCellCore,
  isDefaultCell,
  rgbEqual,
  TRANSPARENT_BG,
  type CompositeEntry as SharedCompositeEntry,
  type DrawableEntry as SharedDrawableEntry,
  type ReferenceEntry as SharedReferenceEntry,
} from '@lua-learning/ansi-shared'

// --- Composite entry types (re-export from shared) ---

export type DrawableEntry = SharedDrawableEntry
export type ReferenceEntry = SharedReferenceEntry
export type CompositeEntry = SharedCompositeEntry

// --- Engine instance (bound to editor type guards) ---

const engine = createCompositeEngine<Layer>({
  isGroupLayer,
  isDrawableLayer,
  isReferenceLayer,
  createEmptyGrid,
  buildClipMaskMap,
  isCellClipped,
})

// --- Re-export shared engine functions with existing public API ---

/** Filters to only DrawableLayer entries, skipping groups and children of hidden groups. */
export function visibleDrawableLayers(layers: Layer[]): DrawableLayer[] {
  const hidden = engine.hiddenGroupIds(layers)
  const result: DrawableLayer[] = []
  for (const layer of layers) {
    if (!isDrawableLayer(layer)) continue
    if (layer.parentId && hidden.has(layer.parentId)) continue
    result.push(layer)
  }
  return result
}

/**
 * Build composite entries from layers: drawable layers become DrawableEntry,
 * reference layers become ReferenceEntry with resolved source grid and accumulated offsets.
 * Skips groups, clips, hidden-group children, and broken/circular references.
 */
export function buildCompositeEntries(
  layers: Layer[], layerMap: Map<string, Layer>, groupGridCache?: Map<string, AnsiGrid>,
): CompositeEntry[] {
  return engine.buildCompositeEntries(layers, layerMap, groupGridCache)
}

/** Pre-computed compositing state for batch operations. */
export interface CompositeState {
  entries: CompositeEntry[]
  clipMap: Map<string, AnsiGrid>
  layerMap: Map<string, Layer>
}

/** Prepare shared compositing state: composite entries, clip mask map, and layer lookup map. */
export function prepareComposite(layers: Layer[], groupGridCache?: Map<string, AnsiGrid>): CompositeState {
  const layerMap = new Map(layers.map(l => [l.id, l]))
  return { entries: engine.buildCompositeEntries(layers, layerMap, groupGridCache), clipMap: buildClipMaskMap(layers), layerMap }
}

/** Composite a single cell using pre-computed state (avoids rebuilding per cell). */
export function compositeCellPrepared(state: CompositeState, row: number, col: number): AnsiCell {
  return compositeCellCore(state.entries, (entry) => {
    if (isCellClipped(entry, row, col, state.clipMap, state.layerMap)) return null
    return engine.getEntryCell(entry, row, col)
  })
}

/** Composite a single cell with an override for the active layer, using pre-computed state. */
export function compositeCellWithOverridePrepared(
  state: CompositeState, row: number, col: number,
  activeLayerId: string, overrideCell: AnsiCell,
): AnsiCell {
  return compositeCellCore(state.entries, (entry) => {
    if (isCellClipped(entry, row, col, state.clipMap, state.layerMap)) return null
    if (entry.id === activeLayerId && entry.kind === 'drawable') return overrideCell
    return engine.getEntryCell(entry, row, col)
  })
}

/**
 * Check whether a layer is hidden or occluded at a given cell position.
 * Returns true if the layer is not in the composite (hidden group), individually
 * hidden (visible=false), or covered by opaque content from layers above it.
 */
export function isLayerOccludedAt(
  layerId: string, row: number, col: number, state: CompositeState,
): boolean {
  const entryIndex = state.entries.findIndex(e => e.id === layerId)
  if (entryIndex === -1) return true
  if (!state.entries[entryIndex].visible) return true

  for (let i = entryIndex + 1; i < state.entries.length; i++) {
    const entry = state.entries[i]
    if (isCellClipped(entry, row, col, state.clipMap, state.layerMap)) continue
    const cell = engine.getEntryCell(entry, row, col)
    if (cell === null || isDefaultCell(cell)) continue
    if (rgbEqual(cell.bg, TRANSPARENT_BG)) {
      if (cell.char !== ' ') return true
      continue
    }
    return true
  }
  return false
}

export function compositeCell(layers: Layer[], row: number, col: number): AnsiCell {
  return compositeCellPrepared(prepareComposite(layers), row, col)
}

/** Composite all visible layers into a single AnsiGrid.
 * When `cols`/`rows` are omitted, derives dimensions from the first drawable
 * or clip layer found, falling back to 80×25. */
export function compositeGrid(layers: Layer[], cols?: number, rows?: number): AnsiGrid {
  if (cols === undefined || rows === undefined) {
    for (const l of layers) {
      if ((isDrawableLayer(l) || l.type === 'clip') && 'grid' in l) {
        cols = cols ?? (l.grid[0]?.length)
        rows = rows ?? l.grid.length
        break
      }
    }
  }
  const target = createEmptyGrid(cols, rows)
  compositeGridInto(target, layers)
  return target
}

/** Composite all visible layers into a pre-allocated target grid (zero allocation). */
export function compositeGridInto(target: AnsiGrid, layers: Layer[], groupGridCache?: Map<string, AnsiGrid>): void {
  const state = prepareComposite(layers, groupGridCache)
  let curR = 0, curC = 0
  const getCell = (entry: CompositeEntry) => {
    if (isCellClipped(entry, curR, curC, state.clipMap, state.layerMap)) return null
    return engine.getEntryCell(entry, curR, curC)
  }
  const rows = target.length
  const cols = target[0]?.length ?? 0
  for (let r = 0; r < rows; r++) {
    curR = r
    for (let c = 0; c < cols; c++) {
      curC = c
      const result = compositeCellCore(state.entries, getCell)
      const cell = target[r][c]
      cell.char = result.char
      cell.fg[0] = result.fg[0]; cell.fg[1] = result.fg[1]; cell.fg[2] = result.fg[2]
      cell.bg[0] = result.bg[0]; cell.bg[1] = result.bg[1]; cell.bg[2] = result.bg[2]
    }
  }
}

export function compositeCellWithOverride(
  layers: Layer[], row: number, col: number,
  activeLayerId: string, overrideCell: AnsiCell,
): AnsiCell {
  return compositeCellWithOverridePrepared(prepareComposite(layers), row, col, activeLayerId, overrideCell)
}
