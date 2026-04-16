/**
 * Canvas resize utilities: crop/pad grids to new dimensions and resize an
 * entire LayerState (all drawn frames + clip layers + text layer bounds).
 *
 * Anchors control how existing content is placed inside the new canvas:
 *   - 'top-left' keeps (0,0) aligned with (0,0)
 *   - 'center'   centers the old content within the new canvas
 */

import type { AnsiGrid, Layer, LayerState, Rect } from './types'
import { DEFAULT_CELL } from './types'
import { cloneCell } from './gridUtils'

export type ResizeAnchor = 'top-left' | 'center'

/**
 * Resize an AnsiGrid to (newCols × newRows). Crops rows/columns that fall
 * outside the new bounds, and pads missing ones with `fill` (default cell).
 */
export function resizeGrid(
  grid: AnsiGrid,
  newCols: number,
  newRows: number,
  anchor: ResizeAnchor = 'top-left',
): AnsiGrid {
  const oldRows = grid.length
  const oldCols = grid[0]?.length ?? 0

  const rowOffset = anchor === 'center' ? Math.floor((newRows - oldRows) / 2) : 0
  const colOffset = anchor === 'center' ? Math.floor((newCols - oldCols) / 2) : 0

  const result: AnsiGrid = Array.from({ length: newRows }, (_, r) =>
    Array.from({ length: newCols }, (_, c) => {
      const srcR = r - rowOffset
      const srcC = c - colOffset
      if (srcR >= 0 && srcR < oldRows && srcC >= 0 && srcC < oldCols) {
        return cloneCell(grid[srcR][srcC])
      }
      return { ...DEFAULT_CELL, fg: [...DEFAULT_CELL.fg] as [number, number, number], bg: [...DEFAULT_CELL.bg] as [number, number, number] }
    })
  )
  return result
}

function shiftRect(bounds: Rect, rowOffset: number, colOffset: number): Rect {
  return {
    r0: bounds.r0 + rowOffset,
    c0: bounds.c0 + colOffset,
    r1: bounds.r1 + rowOffset,
    c1: bounds.c1 + colOffset,
  }
}

/**
 * Resize every drawable, clip, and text layer in a `LayerState` to the new
 * dimensions. Group and reference layers are structural and unaffected.
 */
export function resizeProject(
  state: LayerState,
  newCols: number,
  newRows: number,
  anchor: ResizeAnchor = 'top-left',
): LayerState {
  const oldCols = state.cols ?? (state.layers.find(l => 'grid' in l)?.grid[0]?.length ?? 80)
  const oldRows = state.rows ?? (state.layers.find(l => 'grid' in l)?.grid.length ?? 25)
  const rowOffset = anchor === 'center' ? Math.floor((newRows - oldRows) / 2) : 0
  const colOffset = anchor === 'center' ? Math.floor((newCols - oldCols) / 2) : 0

  const layers: Layer[] = state.layers.map(layer => {
    if (layer.type === 'drawn') {
      const frames = layer.frames.map(f => resizeGrid(f, newCols, newRows, anchor))
      const grid = frames[layer.currentFrameIndex] ?? frames[0]
      return { ...layer, grid, frames }
    }
    if (layer.type === 'clip') {
      return { ...layer, grid: resizeGrid(layer.grid, newCols, newRows, anchor) }
    }
    if (layer.type === 'text') {
      return {
        ...layer,
        bounds: shiftRect(layer.bounds, rowOffset, colOffset),
        grid: resizeGrid(layer.grid, newCols, newRows, anchor),
      }
    }
    return layer
  })

  return { ...state, layers, cols: newCols, rows: newRows }
}
