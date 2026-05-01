import type { AnsiGrid, Layer } from './types'
import { isDrawableLayer } from './types'

const SPACE = ' '

function collectChars(grids: readonly AnsiGrid[]): string[] {
  const seen = new Set<string>()
  for (const grid of grids) {
    for (const row of grid) {
      for (const cell of row) {
        const ch = cell.char
        if (ch && ch !== SPACE) seen.add(ch)
      }
    }
  }
  return Array.from(seen).sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
}

/**
 * Every non-space character used anywhere in the active layer. Drawn
 * layers contribute every frame's grid; text layers contribute their
 * rasterized grid. Non-drawable layers (group, reference) contribute
 * nothing because they have no per-cell content of their own.
 */
export function extractLayerChars(layer: Layer | undefined): string[] {
  if (!layer || !isDrawableLayer(layer)) return []
  if (layer.type === 'drawn') return collectChars(layer.frames)
  return collectChars([layer.grid])
}

/**
 * Every non-space character used across all visible drawable layers.
 * Group / reference layers are excluded — their rendered output comes
 * from their drawable descendants, which are already in the iteration.
 */
export function extractCurrentChars(layers: readonly Layer[]): string[] {
  const grids: AnsiGrid[] = []
  for (const layer of layers) {
    if (!layer.visible) continue
    if (!isDrawableLayer(layer)) continue
    if (layer.type === 'drawn') grids.push(...layer.frames)
    else grids.push(layer.grid)
  }
  return collectChars(grids)
}
