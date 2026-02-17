import type { AnsiCell, AnsiGrid, Layer, LayerState, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG } from './types'

let nextLayerId = 1

export function isDefaultCell(cell: AnsiCell): boolean {
  return (
    cell.char === ' ' &&
    cell.fg[0] === DEFAULT_FG[0] && cell.fg[1] === DEFAULT_FG[1] && cell.fg[2] === DEFAULT_FG[2] &&
    cell.bg[0] === DEFAULT_BG[0] && cell.bg[1] === DEFAULT_BG[1] && cell.bg[2] === DEFAULT_BG[2]
  )
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

export function compositeCell(layers: Layer[], row: number, col: number): AnsiCell {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (!layer.visible) continue
    const cell = layer.grid[row][col]
    if (!isDefaultCell(cell)) return cell
  }
  return DEFAULT_CELL
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
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (!layer.visible) continue
    const cell = layer.id === activeLayerId ? overrideCell : layer.grid[row][col]
    if (!isDefaultCell(cell)) return cell
  }
  return DEFAULT_CELL
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
