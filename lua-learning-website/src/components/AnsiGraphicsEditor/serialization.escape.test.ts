import { describe, it, expect } from 'vitest'
import { serializeGrid, deserializeGrid, serializeLayers, deserializeLayers } from './serialization'
import { luaStringify, luaParse } from './luaCodec'
import type { DrawableLayer, LayerState } from './types'
import { createEmptyGrid } from './gridUtils'
import { createLayer } from './layerUtils'

describe('luaCodec round-trip', () => {
  it('preserves a string containing backslashes', () => {
    const data = { s: 'a\\b\\\\c' }
    expect(luaParse(luaStringify(data))).toEqual(data)
  })
})

describe('serialization escape round-trips', () => {
  it('v1 grid round-trips a cell containing a backslash', () => {
    const grid = createEmptyGrid()
    grid[1][2] = { char: '\\', fg: [255, 255, 255], bg: [0, 0, 0] }
    expect(deserializeGrid(serializeGrid(grid))[1][2].char).toBe('\\')
  })

  it('v1 grid round-trips a cell containing a double-quote', () => {
    const grid = createEmptyGrid()
    grid[0][0] = { char: '"', fg: [255, 255, 255], bg: [0, 0, 0] }
    expect(deserializeGrid(serializeGrid(grid))[0][0].char).toBe('"')
  })

  it('v7 drawn layer round-trips a cell containing a backslash', () => {
    const layer = createLayer('L', 'l1')
    layer.grid[2][3] = { char: '\\', fg: [255, 255, 255], bg: [0, 0, 0] }
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const result = deserializeLayers(serializeLayers(state))
    expect((result.layers[0] as DrawableLayer).grid[2][3].char).toBe('\\')
  })
})
