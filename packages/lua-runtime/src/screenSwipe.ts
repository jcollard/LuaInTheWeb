/**
 * Swipe/dither transition state and logic, extracted from AnsiController.
 */

import type { AnsiGrid, LayerData, RGBColor } from './screenTypes'
import { createEmptyGrid, createFillGrid } from './screenTypes'
import { compositeGridInto } from './screenCompositor'
import {
  buildSwipeGrid, buildDitherGrid, generateDitherOrder,
  renderSwipeDiff, updateShadow, createSentinelGrid,
  type SwipeDirection,
} from './swipeRenderer'

export type TransitionMode = 'swipe' | 'dither'

export interface TransitionState {
  mode: TransitionMode
  inOut: 'out' | 'in'
  duration: number
  elapsed: number
  targetGrid: AnsiGrid
  sourceGrid: AnsiGrid
  shadowGrid: AnsiGrid
  desiredGrid: AnsiGrid
  commitLayerIds?: string[]
  direction?: SwipeDirection
  ditherOrder?: number[]
}

// Re-export for AnsiController type usage
export type { SwipeDirection }

interface ScreenStateForTransition {
  layers: LayerData[]
  lastGrid: AnsiGrid | null
  swipe: TransitionState | null
  needsRecomposite: boolean
  dirty: boolean
}

/**
 * Resolve one or more layer identifiers (\\x1F-separated string) against a layer list.
 * Each identifier is resolved by ID, name, or tag. Results are unioned and deduplicated.
 */
export function resolveMultipleIdentifiers(
  layers: LayerData[],
  ids: string,
  resolveOne: (layers: LayerData[], id: string) => LayerData[],
): LayerData[] {
  const seen = new Set<string>()
  const result: LayerData[] = []
  for (const id of ids.split('\x1F')) {
    for (const l of resolveOne(layers, id)) {
      if (!seen.has(l.id)) { seen.add(l.id); result.push(l) }
    }
  }
  return result
}

function captureSource(state: ScreenStateForTransition, groupGridCache: Map<string, AnsiGrid>): AnsiGrid {
  const grid = createEmptyGrid()
  if (state.lastGrid) {
    copyGrid(grid, state.lastGrid)
  } else {
    groupGridCache.clear()
    compositeGridInto(grid, state.layers, groupGridCache)
  }
  return grid
}

export function startSwipeOut(
  state: ScreenStateForTransition, duration: number, color: RGBColor, char: string,
  direction: SwipeDirection, groupGridCache: Map<string, AnsiGrid>,
): void {
  if (duration <= 0) throw new Error('Transition duration must be a positive number.')
  state.swipe = {
    mode: 'swipe', inOut: 'out', duration, elapsed: 0, direction,
    targetGrid: createFillGrid(char, color),
    sourceGrid: captureSource(state, groupGridCache),
    shadowGrid: createSentinelGrid(), desiredGrid: createEmptyGrid(),
  }
}

export function startSwipeIn(
  state: ScreenStateForTransition, layers: LayerData[], matched: LayerData[],
  duration: number, direction: SwipeDirection, groupGridCache: Map<string, AnsiGrid>,
): void {
  if (duration <= 0) throw new Error('Transition duration must be a positive number.')
  const originalVis = matched.map(l => l.visible)
  for (const l of matched) l.visible = true
  const targetGrid = createEmptyGrid()
  groupGridCache.clear()
  compositeGridInto(targetGrid, layers, groupGridCache)
  matched.forEach((l, i) => l.visible = originalVis[i])

  state.swipe = {
    mode: 'swipe', inOut: 'in', duration, elapsed: 0, direction,
    targetGrid, sourceGrid: captureSource(state, groupGridCache),
    shadowGrid: createSentinelGrid(), desiredGrid: createEmptyGrid(),
    commitLayerIds: matched.map(l => l.id),
  }
}

export function startDitherOut(
  state: ScreenStateForTransition, duration: number, color: RGBColor, char: string,
  seed: number, groupGridCache: Map<string, AnsiGrid>,
): void {
  if (duration <= 0) throw new Error('Transition duration must be a positive number.')
  state.swipe = {
    mode: 'dither', inOut: 'out', duration, elapsed: 0,
    targetGrid: createFillGrid(char, color),
    sourceGrid: captureSource(state, groupGridCache),
    shadowGrid: createSentinelGrid(), desiredGrid: createEmptyGrid(),
    ditherOrder: generateDitherOrder(seed),
  }
}

export function startDitherIn(
  state: ScreenStateForTransition, layers: LayerData[], matched: LayerData[],
  duration: number, seed: number, groupGridCache: Map<string, AnsiGrid>,
): void {
  if (duration <= 0) throw new Error('Transition duration must be a positive number.')
  const originalVis = matched.map(l => l.visible)
  for (const l of matched) l.visible = true
  const targetGrid = createEmptyGrid()
  groupGridCache.clear()
  compositeGridInto(targetGrid, layers, groupGridCache)
  matched.forEach((l, i) => l.visible = originalVis[i])

  state.swipe = {
    mode: 'dither', inOut: 'in', duration, elapsed: 0,
    targetGrid, sourceGrid: captureSource(state, groupGridCache),
    shadowGrid: createSentinelGrid(), desiredGrid: createEmptyGrid(),
    ditherOrder: generateDitherOrder(seed),
    commitLayerIds: matched.map(l => l.id),
  }
}

export function advanceTransition(state: ScreenStateForTransition, deltaTime: number): string | null {
  const t = state.swipe!
  t.elapsed += deltaTime
  const progress = Math.min(t.elapsed / t.duration, 1)

  if (t.mode === 'swipe') {
    buildSwipeGrid(t.targetGrid, t.sourceGrid, progress, t.direction!, t.desiredGrid)
  } else {
    buildDitherGrid(t.targetGrid, t.sourceGrid, progress, t.ditherOrder!, t.desiredGrid)
  }

  const batch = renderSwipeDiff(t.desiredGrid, t.shadowGrid)
  updateShadow(t.desiredGrid, t.shadowGrid)

  if (t.elapsed >= t.duration) {
    if (t.commitLayerIds) {
      for (const id of t.commitLayerIds) {
        const layer = state.layers.find(l => l.id === id)
        if (layer) layer.visible = true
      }
      state.needsRecomposite = true
      state.dirty = true
    }
    if (!state.lastGrid) state.lastGrid = createEmptyGrid()
    copyGrid(state.lastGrid, t.desiredGrid)
    state.swipe = null
  }
  return batch
}

function copyGrid(dst: AnsiGrid, src: AnsiGrid): void {
  for (let r = 0; r < dst.length; r++) {
    for (let c = 0; c < dst[r].length; c++) {
      const d = dst[r][c]; const s = src[r][c]
      d.char = s.char
      d.fg[0] = s.fg[0]; d.fg[1] = s.fg[1]; d.fg[2] = s.fg[2]
      d.bg[0] = s.bg[0]; d.bg[1] = s.bg[1]; d.bg[2] = s.bg[2]
    }
  }
}
