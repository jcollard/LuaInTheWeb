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
  isGroupLayer, isDrawableLayer, rgbEqual,
} from './screenTypes'

function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

function isTransparentBg(color: RGBColor): boolean {
  return rgbEqual(color, TRANSPARENT_BG)
}

/** Returns IDs of groups that are effectively hidden (own visible=false or any ancestor hidden). */
export function hiddenGroupIds(layers: LayerData[]): Set<string> {
  const ids = new Set<string>()
  // First pass: collect directly hidden groups
  for (const layer of layers) {
    if (isGroupLayer(layer) && !layer.visible) ids.add(layer.id)
  }
  // Iterative fixpoint: propagate hidden status to nested sub-groups
  let changed = true
  while (changed) {
    changed = false
    for (const layer of layers) {
      if (isGroupLayer(layer) && !ids.has(layer.id) && layer.parentId && ids.has(layer.parentId)) {
        ids.add(layer.id)
        changed = true
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

/**
 * Core compositing: merge a stack of drawable layers into a single cell.
 * Layers are ordered bottom-to-top (index 0 = bottom).
 * Iterates from top to bottom, resolving transparency.
 */
export function compositeCellCore(layers: DrawableLayerData[], getCell: (layer: DrawableLayerData) => AnsiCell | null): AnsiCell {
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

/** Composite all visible layers into a single AnsiGrid. */
export function compositeGrid(layers: LayerData[]): AnsiGrid {
  const drawable = visibleDrawableLayers(layers)
  return Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) =>
      compositeCellCore(drawable, (layer) => layer.visible ? layer.grid[r][c] : null)
    )
  )
}
