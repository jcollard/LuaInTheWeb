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

export function extractLayerChars(layer: Layer | undefined): string[] {
  if (!layer || !isDrawableLayer(layer)) return []
  if (layer.type === 'drawn') return collectChars(layer.frames)
  return collectChars([layer.grid])
}

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
