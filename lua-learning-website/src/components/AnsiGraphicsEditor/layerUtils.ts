import type { AnsiCell, AnsiGrid, Layer, LayerState, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, TRANSPARENT_HALF } from './types'

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

export function createLayer(name: string, id?: string): Layer {
  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
  return {
    id: id ?? `layer-${nextLayerId++}`,
    name,
    visible: true,
    grid,
  }
}

function compositeCellCore(layers: Layer[], getCell: (layer: Layer) => AnsiCell | null): AnsiCell {
  let topColor: RGBColor | null = null
  let bottomColor: RGBColor | null = null

  for (let i = layers.length - 1; i >= 0; i--) {
    const cell = getCell(layers[i])
    if (cell === null || isDefaultCell(cell)) continue

    if (cell.char === HALF_BLOCK) {
      if (topColor === null && !rgbEqual(cell.fg, TRANSPARENT_HALF)) topColor = cell.fg
      if (bottomColor === null && !rgbEqual(cell.bg, TRANSPARENT_HALF)) bottomColor = cell.bg
    } else {
      // Non-HALF_BLOCK cell is fully opaque
      if (topColor === null && bottomColor === null) return cell
      if (topColor === null) topColor = cell.bg
      if (bottomColor === null) bottomColor = cell.bg
    }

    if (topColor !== null && bottomColor !== null) break
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

export function cloneLayerState(state: LayerState): LayerState {
  return {
    activeLayerId: state.activeLayerId,
    layers: state.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      grid: layer.grid.map(row =>
        row.map(cell => ({
          ...cell,
          fg: [...cell.fg] as RGBColor,
          bg: [...cell.bg] as RGBColor,
        }))
      ),
    })),
  }
}
