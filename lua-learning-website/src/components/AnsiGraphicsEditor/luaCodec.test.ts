import { describe, it, expect } from 'vitest'
import { serializeGrid, deserializeGrid, serializeLayers, deserializeLayers } from './serialization'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import type { AnsiGrid, DrawableLayer, LayerState } from './types'
import { createLayer } from './layerUtils'

function emptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as [number, number, number],
      bg: [...DEFAULT_BG] as [number, number, number],
    }))
  )
}

describe('lua string escape round-trips', () => {
  it('v1 grid round-trips a cell containing a backslash', () => {
    const grid = emptyGrid()
    grid[1][2] = { char: '\\', fg: [255, 255, 255], bg: [0, 0, 0] }
    expect(deserializeGrid(serializeGrid(grid))[1][2].char).toBe('\\')
  })

  it('v1 grid round-trips a cell containing a double-quote', () => {
    const grid = emptyGrid()
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
