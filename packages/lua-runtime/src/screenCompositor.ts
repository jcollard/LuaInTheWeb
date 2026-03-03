/**
 * Layer compositing logic for ANSI screen rendering.
 *
 * Ported from lua-learning-website/src/components/AnsiGraphicsEditor/layerUtils.ts.
 * Only includes the subset needed for runtime compositing.
 */

import type { AnsiCell, AnsiGrid, DrawableLayerData, LayerData, RGBColor } from './screenTypes'
import {
  ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_CELL, DEFAULT_FG,
  HALF_BLOCK, TRANSPARENT_BG, TRANSPARENT_HALF,
  isGroupLayer, isDrawableLayer, isClipLayer, isReferenceLayer, rgbEqual,
} from './screenTypes'

function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

function isTransparentBg(color: RGBColor): boolean {
  return rgbEqual(color, TRANSPARENT_BG)
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

/** Returns IDs of groups that are effectively hidden (own visible=false or any ancestor hidden). */
export function hiddenGroupIds(layers: LayerData[]): Set<string> {
  const ids = new Set<string>()
  // Build parent → children map for single-pass BFS
  const children = new Map<string, string[]>()
  for (const layer of layers) {
    if (isGroupLayer(layer) && layer.parentId) {
      const siblings = children.get(layer.parentId)
      if (siblings) siblings.push(layer.id)
      else children.set(layer.parentId, [layer.id])
    }
  }
  // Seed with directly hidden groups, then BFS to propagate
  const queue: string[] = []
  for (const layer of layers) {
    if (isGroupLayer(layer) && !layer.visible) {
      ids.add(layer.id)
      queue.push(layer.id)
    }
  }
  while (queue.length > 0) {
    const parentId = queue.pop()!
    const kids = children.get(parentId)
    if (!kids) continue
    for (const kid of kids) {
      if (!ids.has(kid)) {
        ids.add(kid)
        queue.push(kid)
      }
    }
  }
  return ids
}

/** Filters to only DrawableLayerData entries, skipping groups and children of hidden groups. */
export function visibleDrawableLayers(layers: LayerData[]): DrawableLayerData[] {
  const hidden = hiddenGroupIds(layers)
  const result: DrawableLayerData[] = []
  for (const layer of layers) {
    if (!isDrawableLayer(layer)) continue
    if (layer.parentId && hidden.has(layer.parentId)) continue
    result.push(layer)
  }
  return result
}

// --- Composite entry types ---

interface DrawableEntry {
  kind: 'drawable'
  id: string
  visible: boolean
  parentId?: string
  grid: AnsiGrid
}

interface ReferenceEntry {
  kind: 'reference'
  id: string
  visible: boolean
  parentId?: string
  sourceGrid: AnsiGrid
  offsetRow: number
  offsetCol: number
}

type CompositeEntry = DrawableEntry | ReferenceEntry

/**
 * Resolve a reference layer's source, following chained references.
 * Returns the ultimate drawable layer's grid and accumulated offsets,
 * or null if the chain is broken or circular.
 */
function resolveReference(
  sourceLayerId: string,
  offsetRow: number,
  offsetCol: number,
  layerMap: Map<string, LayerData>,
): { grid: AnsiGrid; offsetRow: number; offsetCol: number } | null {
  const visited = new Set<string>()
  let currentId = sourceLayerId
  let accRow = offsetRow
  let accCol = offsetCol

  while (currentId && visited.size < 10) {
    if (visited.has(currentId)) return null // cycle
    visited.add(currentId)
    const source = layerMap.get(currentId)
    if (!source) return null // missing source
    if (isDrawableLayer(source)) {
      return { grid: source.grid, offsetRow: accRow, offsetCol: accCol }
    }
    if (isReferenceLayer(source)) {
      accRow += source.offsetRow
      accCol += source.offsetCol
      currentId = source.sourceLayerId
      continue
    }
    return null // groups/clips can't be referenced
  }
  return null // max depth exceeded
}

/**
 * Build composite entries from layers: drawable layers become DrawableEntry,
 * reference layers become ReferenceEntry with resolved source grid and accumulated offsets.
 */
function buildCompositeEntries(layers: LayerData[], layerMap: Map<string, LayerData>): CompositeEntry[] {
  const hidden = hiddenGroupIds(layers)
  const entries: CompositeEntry[] = []

  for (const layer of layers) {
    if (layer.parentId && hidden.has(layer.parentId)) continue

    if (isDrawableLayer(layer)) {
      entries.push({
        kind: 'drawable',
        id: layer.id,
        visible: layer.visible,
        parentId: layer.parentId,
        grid: layer.grid,
      })
    } else if (isReferenceLayer(layer)) {
      const resolved = resolveReference(layer.sourceLayerId, layer.offsetRow, layer.offsetCol, layerMap)
      if (resolved) {
        entries.push({
          kind: 'reference',
          id: layer.id,
          visible: layer.visible,
          parentId: layer.parentId,
          sourceGrid: resolved.grid,
          offsetRow: resolved.offsetRow,
          offsetCol: resolved.offsetCol,
        })
      }
    }
  }
  return entries
}

function getEntryCell(entry: CompositeEntry, row: number, col: number): AnsiCell | null {
  if (!entry.visible) return null
  if (entry.kind === 'reference') {
    const srcRow = row - entry.offsetRow
    const srcCol = col - entry.offsetCol
    if (srcRow < 0 || srcRow >= ANSI_ROWS || srcCol < 0 || srcCol >= ANSI_COLS) return null
    return entry.sourceGrid[srcRow][srcCol]
  }
  return entry.grid[row][col]
}

/**
 * Core compositing: merge a stack of entries into a single cell.
 * Entries are ordered bottom-to-top (index 0 = bottom).
 * Iterates from top to bottom, resolving transparency.
 */
export function compositeCellCore<T>(layers: T[], getCell: (layer: T) => AnsiCell | null): AnsiCell {
  let topColor: RGBColor | null = null
  let bottomColor: RGBColor | null = null
  let pendingChar: string | null = null
  let pendingFg: RGBColor | null = null

  for (let i = layers.length - 1; i >= 0; i--) {
    const cell = getCell(layers[i])
    if (cell === null || isDefaultCell(cell)) continue

    // TRANSPARENT_BG cells: space = fully transparent (skip), non-space = pending text
    if (isTransparentBg(cell.bg)) {
      if (cell.char === ' ') continue
      if (pendingChar === null) {
        pendingChar = cell.char
        pendingFg = cell.fg
      }
      continue
    }

    if (cell.char === HALF_BLOCK) {
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      if (topColor === null && !rgbEqual(cell.fg, TRANSPARENT_HALF)) topColor = cell.fg
      if (bottomColor === null && !rgbEqual(cell.bg, TRANSPARENT_HALF)) bottomColor = cell.bg
    } else {
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      if (topColor === null && bottomColor === null) return cell
      if (topColor === null) topColor = cell.bg
      if (bottomColor === null) bottomColor = cell.bg
    }

    if (topColor !== null && bottomColor !== null) break
  }

  if (pendingChar !== null) {
    return { char: pendingChar, fg: pendingFg!, bg: [...DEFAULT_BG] as RGBColor }
  }

  if (topColor === null && bottomColor === null) return DEFAULT_CELL
  return {
    char: HALF_BLOCK,
    fg: topColor ?? [...DEFAULT_BG] as RGBColor,
    bg: bottomColor ?? [...DEFAULT_BG] as RGBColor,
  }
}

/** Composite all visible layers into a pre-allocated target grid (zero allocation). */
export function compositeGridInto(target: AnsiGrid, layers: LayerData[]): void {
  const layerMap = new Map(layers.map(l => [l.id, l]))
  const entries = buildCompositeEntries(layers, layerMap)
  const clipMap = buildClipMaskMap(layers)
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const result = compositeCellCore(entries, (entry) => {
        if (isCellClipped(entry, r, c, clipMap, layerMap)) return null
        return getEntryCell(entry, r, c)
      })
      const cell = target[r][c]
      cell.char = result.char
      cell.fg[0] = result.fg[0]; cell.fg[1] = result.fg[1]; cell.fg[2] = result.fg[2]
      cell.bg[0] = result.bg[0]; cell.bg[1] = result.bg[1]; cell.bg[2] = result.bg[2]
    }
  }
}

/** Composite all visible layers into a single AnsiGrid. */
export function compositeGrid(layers: LayerData[]): AnsiGrid {
  const layerMap = new Map(layers.map(l => [l.id, l]))
  const entries = buildCompositeEntries(layers, layerMap)
  const clipMap = buildClipMaskMap(layers)
  return Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) =>
      compositeCellCore(entries, (entry) => {
        if (isCellClipped(entry, r, c, clipMap, layerMap)) return null
        return getEntryCell(entry, r, c)
      })
    )
  )
}
