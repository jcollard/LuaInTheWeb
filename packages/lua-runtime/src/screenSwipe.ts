/**
 * Swipe transition state and logic, extracted from AnsiController
 * to keep file size under the max-lines lint limit.
 */

import type { AnsiGrid, LayerData, RGBColor } from './screenTypes'
import { createEmptyGrid, createFillGrid, ANSI_COLS } from './screenTypes'
import { compositeGridInto } from './screenCompositor'
import { buildSwipeGrid, renderSwipeDiff, updateShadow, createSentinelGrid } from './swipeRenderer'

/** Validate and start a swipe-out. */
export function startSwipeOut(
  state: ScreenStateForSwipe,
  duration: number, color: RGBColor, char: string,
  groupGridCache: Map<string, AnsiGrid>,
): void {
  if (duration <= 0) throw new Error('Swipe duration must be a positive number.')
  state.swipe = createSwipeOut(state, duration, color, char, groupGridCache)
}

/** Validate and start a swipe-in with layer preview. */
export function startSwipeIn(
  state: ScreenStateForSwipe, layers: LayerData[],
  matched: LayerData[], duration: number,
  groupGridCache: Map<string, AnsiGrid>,
): void {
  if (duration <= 0) throw new Error('Swipe duration must be a positive number.')
  state.swipe = createSwipeIn(state, layers, matched, duration, groupGridCache)
}

export interface SwipeState {
  direction: 'out' | 'in'
  duration: number
  elapsed: number
  targetGrid: AnsiGrid
  sourceGrid: AnsiGrid
  shadowGrid: AnsiGrid
  desiredGrid: AnsiGrid
  commitLayerIds?: string[]
}

interface ScreenStateForSwipe {
  layers: LayerData[]
  lastGrid: AnsiGrid | null
  swipe: SwipeState | null
  needsRecomposite: boolean
  dirty: boolean
}

/**
 * Create a swipe-out state: fill grid as target, current display as source.
 */
export function createSwipeOut(
  state: ScreenStateForSwipe,
  duration: number,
  color: RGBColor,
  char: string,
  groupGridCache: Map<string, AnsiGrid>,
): SwipeState {
  const targetGrid = createFillGrid(char, color)
  const sourceGrid = createEmptyGrid()
  if (state.lastGrid) {
    copyGrid(sourceGrid, state.lastGrid)
  } else {
    groupGridCache.clear()
    compositeGridInto(sourceGrid, state.layers, groupGridCache)
  }
  return {
    direction: 'out', duration, elapsed: 0,
    targetGrid, sourceGrid,
    shadowGrid: createSentinelGrid(),
    desiredGrid: createEmptyGrid(),
  }
}

/**
 * Create a swipe-in state: composite preview with matched layers visible.
 * Returns the SwipeState and the matched layer IDs for commit on completion.
 */
export function createSwipeIn(
  state: ScreenStateForSwipe,
  layers: LayerData[],
  matched: LayerData[],
  duration: number,
  groupGridCache: Map<string, AnsiGrid>,
): SwipeState {
  // Temporarily toggle matched layers visible to composite preview
  const originalVisibility = matched.map(l => l.visible)
  for (const l of matched) l.visible = true

  const targetGrid = createEmptyGrid()
  groupGridCache.clear()
  compositeGridInto(targetGrid, layers, groupGridCache)

  // Restore original visibility
  matched.forEach((l, i) => l.visible = originalVisibility[i])

  const sourceGrid = createEmptyGrid()
  if (state.lastGrid) {
    copyGrid(sourceGrid, state.lastGrid)
  } else {
    groupGridCache.clear()
    compositeGridInto(sourceGrid, state.layers, groupGridCache)
  }

  return {
    direction: 'in', duration, elapsed: 0,
    targetGrid, sourceGrid,
    shadowGrid: createSentinelGrid(),
    desiredGrid: createEmptyGrid(),
    commitLayerIds: matched.map(l => l.id),
  }
}

/**
 * Advance one frame of swipe. Returns the batch string to write, or null.
 * Also handles completion: commits layers, updates lastGrid.
 */
export function advanceSwipe(
  state: ScreenStateForSwipe,
  deltaTime: number,
): string | null {
  const swipe = state.swipe!

  swipe.elapsed += deltaTime
  const progress = Math.min(swipe.elapsed / swipe.duration, 1)
  const boundaryCol = Math.floor(progress * ANSI_COLS)

  buildSwipeGrid(swipe.targetGrid, swipe.sourceGrid, boundaryCol, swipe.desiredGrid)

  const batch = renderSwipeDiff(swipe.desiredGrid, swipe.shadowGrid)
  updateShadow(swipe.desiredGrid, swipe.shadowGrid)

  // Complete
  if (swipe.elapsed >= swipe.duration) {
    if (swipe.commitLayerIds) {
      for (const layerId of swipe.commitLayerIds) {
        const layer = state.layers.find(l => l.id === layerId)
        if (layer) layer.visible = true
      }
      state.needsRecomposite = true
      state.dirty = true
    }
    // Update lastGrid to reflect what's on the terminal
    if (!state.lastGrid) state.lastGrid = createEmptyGrid()
    copyGrid(state.lastGrid, swipe.desiredGrid)
    state.swipe = null
  }

  return batch
}

function copyGrid(dst: AnsiGrid, src: AnsiGrid): void {
  for (let r = 0; r < dst.length; r++) {
    for (let c = 0; c < dst[r].length; c++) {
      const d = dst[r][c]
      const s = src[r][c]
      d.char = s.char
      d.fg[0] = s.fg[0]; d.fg[1] = s.fg[1]; d.fg[2] = s.fg[2]
      d.bg[0] = s.bg[0]; d.bg[1] = s.bg[1]; d.bg[2] = s.bg[2]
    }
  }
}
