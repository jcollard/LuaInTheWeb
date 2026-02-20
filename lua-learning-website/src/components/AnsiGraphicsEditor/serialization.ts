import { stringify, parse } from '@kilcekru/lua-table'
import type { AnsiGrid, Layer, LayerState, TextLayer, TextAlign, RGBColor, Rect } from './types'
import { ANSI_COLS, ANSI_ROWS } from './types'
import { renderTextLayerGrid } from './textLayerGrid'

export function serializeGrid(grid: AnsiGrid): string {
  const data = { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid }
  return 'return ' + stringify(data)
}

export function deserializeGrid(lua: string): AnsiGrid {
  const stripped = lua.replace(/^return\s+/, '')
  const data = parse(stripped) as Record<string, unknown>
  if (data.version !== 1) {
    throw new Error(`Unsupported version: ${data.version}`)
  }
  if (!Array.isArray(data.grid)) {
    throw new Error('Missing grid field')
  }
  return data.grid as AnsiGrid
}

export function serializeLayers(state: LayerState): string {
  const version = 3
  const layers = state.layers.map(layer => {
    if (layer.type === 'text') {
      const serialized: Record<string, unknown> = {
        type: 'text',
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        text: layer.text,
        bounds: layer.bounds,
        textFg: layer.textFg,
        // grid is NOT serialized — recomputed on load
      }
      if (layer.textFgColors && layer.textFgColors.length > 0) {
        serialized.textFgColors = layer.textFgColors
      }
      if (layer.textAlign && layer.textAlign !== 'left') {
        serialized.textAlign = layer.textAlign
      }
      return serialized
    }
    return {
      type: 'drawn',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      grid: layer.grid,
    }
  })
  const data = {
    version,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: state.activeLayerId,
    layers,
  }
  return 'return ' + stringify(data)
}

interface RawLayer {
  type?: string
  id: string
  name: string
  visible: boolean
  grid?: AnsiGrid
  text?: string
  bounds?: Rect
  textFg?: RGBColor
  textFgColors?: RGBColor[]
  textAlign?: string
}

export function deserializeLayers(lua: string): LayerState {
  const stripped = lua.replace(/^return\s+/, '')
  const data = parse(stripped) as Record<string, unknown>
  const version = data.version as number

  if (version === 1) {
    if (!Array.isArray(data.grid)) {
      throw new Error('Missing grid field')
    }
    const id = 'v1-background'
    return {
      layers: [{
        type: 'drawn' as const,
        id,
        name: 'Background',
        visible: true,
        grid: data.grid as AnsiGrid,
      }],
      activeLayerId: id,
    }
  }

  if (version === 2) {
    const layers = (data.layers as Layer[]).map(l => ({ ...l, type: 'drawn' as const }))
    return {
      layers,
      activeLayerId: data.activeLayerId as string,
    }
  }

  if (version === 3) {
    const rawLayers = data.layers as RawLayer[]
    const layers: Layer[] = rawLayers.map((l, i) => {
      if (!l.id || !l.name || l.visible === undefined) {
        throw new Error(`Invalid layer at index ${i}: missing required fields (id, name, visible)`)
      }
      if (l.type === 'text') {
        if (!l.text || !l.bounds || !l.textFg) {
          throw new Error(`Invalid text layer "${l.name}": missing text, bounds, or textFg`)
        }
        const textFgColors = l.textFgColors && l.textFgColors.length > 0 ? l.textFgColors : undefined
        const textAlign = l.textAlign as TextAlign | undefined
        const textLayer: TextLayer = {
          type: 'text',
          id: l.id,
          name: l.name,
          visible: l.visible,
          text: l.text,
          bounds: l.bounds,
          textFg: l.textFg,
          textFgColors,
          textAlign,
          grid: renderTextLayerGrid(l.text, l.bounds, l.textFg, textFgColors, textAlign),
        }
        return textLayer
      }
      if (!l.grid) {
        throw new Error(`Invalid drawn layer "${l.name}": missing grid`)
      }
      return {
        type: 'drawn' as const,
        id: l.id,
        name: l.name,
        visible: l.visible,
        grid: l.grid,
      }
    })
    return {
      layers,
      activeLayerId: data.activeLayerId as string,
    }
  }

  throw new Error(`Unsupported version: ${version}`)
}
