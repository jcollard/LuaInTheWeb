import { stringify, parse } from '@kilcekru/lua-table'
import type { AnsiGrid, LayerState } from './types'
import { ANSI_COLS, ANSI_ROWS } from './types'

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
  const data = {
    version: 2,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: state.activeLayerId,
    layers: state.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      grid: l.grid,
    })),
  }
  return 'return ' + stringify(data)
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
        id,
        name: 'Background',
        visible: true,
        grid: data.grid as AnsiGrid,
      }],
      activeLayerId: id,
    }
  }

  if (version === 2) {
    const layers = data.layers as Array<{ id: string; name: string; visible: boolean; grid: AnsiGrid }>
    return {
      layers,
      activeLayerId: data.activeLayerId as string,
    }
  }

  throw new Error(`Unsupported version: ${version}`)
}
