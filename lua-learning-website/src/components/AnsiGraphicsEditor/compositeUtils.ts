import type { AnsiCell, AnsiGrid, DrawableLayer, Layer, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_BG, HALF_BLOCK, TRANSPARENT_HALF, TRANSPARENT_BG, isGroupLayer, isDrawableLayer } from './types'
import { buildClipMaskMap, isCellClipped } from './clipMaskUtils'
import { rgbEqual, isDefaultCell } from './layerUtils'

/** Returns IDs of groups that are effectively hidden (own visible=false or any ancestor hidden). */
function hiddenGroupIds(layers: Layer[]): Set<string> {
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

/** Filters to only DrawableLayer entries, skipping groups and children of hidden groups. */
export function visibleDrawableLayers(layers: Layer[]): DrawableLayer[] {
  const hidden = hiddenGroupIds(layers)
  const result: DrawableLayer[] = []
  for (const layer of layers) {
    if (!isDrawableLayer(layer)) continue
    if (layer.parentId && hidden.has(layer.parentId)) continue
    result.push(layer)
  }
  return result
}

function isTransparentBg(color: RGBColor): boolean {
  return rgbEqual(color, TRANSPARENT_BG)
}

function compositeCellCore(layers: DrawableLayer[], getCell: (layer: DrawableLayer) => AnsiCell | null): AnsiCell {
  let topColor: RGBColor | null = null
  let bottomColor: RGBColor | null = null
  // Pending text cell: char+fg from a TRANSPARENT_BG cell waiting for a bg source
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
      // Pending text cell can use the half-block's bg as its background
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      if (topColor === null && !rgbEqual(cell.fg, TRANSPARENT_HALF)) topColor = cell.fg
      if (bottomColor === null && !rgbEqual(cell.bg, TRANSPARENT_HALF)) bottomColor = cell.bg
    } else {
      // Pending text cell uses this opaque cell's bg
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      // Non-HALF_BLOCK cell is fully opaque
      if (topColor === null && bottomColor === null) return cell
      if (topColor === null) topColor = cell.bg
      if (bottomColor === null) bottomColor = cell.bg
    }

    if (topColor !== null && bottomColor !== null) break
  }

  // If we have a pending text cell but no bg source, use DEFAULT_BG
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

/** Pre-computed compositing state for batch operations. */
export interface CompositeState {
  drawable: DrawableLayer[]
  clipMap: Map<string, AnsiGrid>
  layerMap: Map<string, Layer>
}

/** Prepare shared compositing state: visible drawable layers, clip mask map, and layer lookup map. */
export function prepareComposite(layers: Layer[]): CompositeState {
  return { drawable: visibleDrawableLayers(layers), clipMap: buildClipMaskMap(layers), layerMap: new Map(layers.map(l => [l.id, l])) }
}

/** Composite a single cell using pre-computed state (avoids rebuilding per cell). */
export function compositeCellPrepared(state: CompositeState, row: number, col: number): AnsiCell {
  return compositeCellCore(state.drawable, (layer) => {
    if (!layer.visible) return null
    if (isCellClipped(layer, row, col, state.clipMap, state.layerMap)) return null
    return layer.grid[row][col]
  })
}

/** Composite a single cell with an override for the active layer, using pre-computed state. */
export function compositeCellWithOverridePrepared(
  state: CompositeState, row: number, col: number,
  activeLayerId: string, overrideCell: AnsiCell,
): AnsiCell {
  return compositeCellCore(state.drawable, (layer) => {
    if (!layer.visible) return null
    if (isCellClipped(layer, row, col, state.clipMap, state.layerMap)) return null
    return layer.id === activeLayerId ? overrideCell : layer.grid[row][col]
  })
}

export function compositeCell(layers: Layer[], row: number, col: number): AnsiCell {
  return compositeCellPrepared(prepareComposite(layers), row, col)
}

export function compositeGrid(layers: Layer[]): AnsiGrid {
  const state = prepareComposite(layers)
  return Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) => compositeCellPrepared(state, r, c))
  )
}

/** Composite all visible layers into a pre-allocated target grid (zero allocation). */
export function compositeGridInto(target: AnsiGrid, layers: Layer[]): void {
  const state = prepareComposite(layers)
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const result = compositeCellPrepared(state, r, c)
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
