import type { AnsiCell, AnsiGrid, DrawnLayer, Layer, LayerState, RGBColor, TextLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, TRANSPARENT_HALF, TRANSPARENT_BG } from './types'

let nextLayerId = 1

export function syncLayerIds(layers: Layer[]): void {
  for (const layer of layers) {
    const match = layer.id.match(/^layer-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= nextLayerId) nextLayerId = num + 1
    }
  }
}

export function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

export function createLayer(name: string, id?: string): DrawnLayer {
  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
  return {
    type: 'drawn',
    id: id ?? `layer-${nextLayerId++}`,
    name,
    visible: true,
    grid,
  }
}

function isTransparentBg(color: RGBColor): boolean {
  return color[0] === TRANSPARENT_BG[0] && color[1] === TRANSPARENT_BG[1] && color[2] === TRANSPARENT_BG[2]
}

function compositeCellCore(layers: Layer[], getCell: (layer: Layer) => AnsiCell | null): AnsiCell {
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

export function compositeCell(layers: Layer[], row: number, col: number): AnsiCell {
  return compositeCellCore(layers, (layer) => layer.visible ? layer.grid[row][col] : null)
}

export function compositeGrid(layers: Layer[]): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) => compositeCell(layers, r, c))
  )
}

export function compositeCellWithOverride(
  layers: Layer[], row: number, col: number,
  activeLayerId: string, overrideCell: AnsiCell,
): AnsiCell {
  return compositeCellCore(layers, (layer) => {
    if (!layer.visible) return null
    return layer.id === activeLayerId ? overrideCell : layer.grid[row][col]
  })
}

function cloneGrid(grid: AnsiGrid): AnsiGrid {
  return grid.map(row =>
    row.map(cell => ({
      ...cell,
      fg: [...cell.fg] as RGBColor,
      bg: [...cell.bg] as RGBColor,
    }))
  )
}

function cloneLayer(layer: Layer): Layer {
  const base = {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    grid: cloneGrid(layer.grid),
  }
  if (layer.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: layer.text,
      bounds: { ...layer.bounds },
      textFg: [...layer.textFg] as RGBColor,
      textFgColors: layer.textFgColors?.map(c => [...c] as RGBColor),
      textAlign: layer.textAlign,
    } satisfies TextLayer
  }
  return { ...base, type: 'drawn' } satisfies DrawnLayer
}

export function mergeLayerDown(layers: Layer[], layerId: string): Layer[] | null {
  const idx = layers.findIndex(l => l.id === layerId)
  if (idx <= 0) return null // bottom layer or not found — can't merge down

  const upper = layers[idx]
  const lower = layers[idx - 1]

  // Composite just the two layers (lower on bottom, upper on top) into a new grid.
  // Both layers are treated as visible regardless of their actual visibility.
  const pair: Layer[] = [
    { ...lower, visible: true },
    { ...upper, visible: true },
  ]
  const mergedGrid: AnsiGrid = Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) =>
      compositeCell(pair, r, c)
    )
  )

  const merged: DrawnLayer = {
    type: 'drawn',
    id: lower.id,
    name: lower.name,
    visible: lower.visible,
    grid: mergedGrid,
  }

  return layers.map((l, i) => i === idx - 1 ? merged : l).filter((_, i) => i !== idx)
}

export function cloneLayerState(state: LayerState): LayerState {
  return {
    activeLayerId: state.activeLayerId,
    layers: state.layers.map(cloneLayer),
  }
}
