import { describe, it, expect } from 'vitest'
import { isDefaultCell, createLayer, compositeCell, compositeGrid, compositeCellWithOverride, cloneLayerState } from './layerUtils'
import { DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, ANSI_ROWS, ANSI_COLS } from './types'
import type { AnsiCell, RGBColor, Layer, LayerState } from './types'

describe('isDefaultCell', () => {
  it('returns true for DEFAULT_CELL', () => {
    expect(isDefaultCell(DEFAULT_CELL)).toBe(true)
  })

  it('returns true for a cell matching default values', () => {
    const cell: AnsiCell = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    expect(isDefaultCell(cell)).toBe(true)
  })

  it('returns false when char is different', () => {
    const cell: AnsiCell = { char: '#', fg: DEFAULT_FG, bg: DEFAULT_BG }
    expect(isDefaultCell(cell)).toBe(false)
  })

  it('returns false when fg is different', () => {
    const cell: AnsiCell = { char: ' ', fg: [255, 0, 0], bg: DEFAULT_BG }
    expect(isDefaultCell(cell)).toBe(false)
  })

  it('returns false when only fg[1] differs', () => {
    const cell: AnsiCell = { char: ' ', fg: [DEFAULT_FG[0], 99, DEFAULT_FG[2]], bg: DEFAULT_BG }
    expect(isDefaultCell(cell)).toBe(false)
  })

  it('returns false when only fg[2] differs', () => {
    const cell: AnsiCell = { char: ' ', fg: [DEFAULT_FG[0], DEFAULT_FG[1], 99], bg: DEFAULT_BG }
    expect(isDefaultCell(cell)).toBe(false)
  })

  it('returns false when bg is different', () => {
    const cell: AnsiCell = { char: ' ', fg: DEFAULT_FG, bg: [0, 0, 255] }
    expect(isDefaultCell(cell)).toBe(false)
  })

  it('returns false when only bg[1] differs', () => {
    const cell: AnsiCell = { char: ' ', fg: DEFAULT_FG, bg: [DEFAULT_BG[0], 99, DEFAULT_BG[2]] }
    expect(isDefaultCell(cell)).toBe(false)
  })

  it('returns false when only bg[2] differs', () => {
    const cell: AnsiCell = { char: ' ', fg: DEFAULT_FG, bg: [DEFAULT_BG[0], DEFAULT_BG[1], 99] }
    expect(isDefaultCell(cell)).toBe(false)
  })
})

describe('createLayer', () => {
  it('returns a layer with the given name', () => {
    const layer = createLayer('Background')
    expect(layer.name).toBe('Background')
  })

  it('returns a layer with a non-empty id', () => {
    const layer = createLayer('Layer 1')
    expect(layer.id).toBeTruthy()
    expect(typeof layer.id).toBe('string')
  })

  it('uses provided id when given', () => {
    const layer = createLayer('Test', 'custom-id')
    expect(layer.id).toBe('custom-id')
  })

  it('creates an empty 80×25 grid with independent rows', () => {
    const layer = createLayer('Test')
    expect(layer.grid).toHaveLength(ANSI_ROWS)
    expect(layer.grid[0]).toHaveLength(ANSI_COLS)
    expect(isDefaultCell(layer.grid[0][0])).toBe(true)
    expect(isDefaultCell(layer.grid[ANSI_ROWS - 1][ANSI_COLS - 1])).toBe(true)
    // Verify rows are independent objects
    layer.grid[0][0] = { char: 'X', fg: [255, 0, 0], bg: [0, 0, 0] }
    expect(isDefaultCell(layer.grid[1][0])).toBe(true)
  })

  it('defaults to visible', () => {
    const layer = createLayer('Test')
    expect(layer.visible).toBe(true)
  })

  it('generates unique ids for different calls', () => {
    const a = createLayer('A')
    const b = createLayer('B')
    expect(a.id).not.toBe(b.id)
  })
})

describe('compositeCell', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]

  function makeLayer(name: string, overrides?: Partial<Layer>): Layer {
    const layer = createLayer(name)
    return { ...layer, ...overrides }
  }

  it('returns DEFAULT_CELL when all layers are empty', () => {
    const layers = [makeLayer('bg')]
    expect(compositeCell(layers, 0, 0)).toEqual(DEFAULT_CELL)
  })

  it('returns the cell from a single visible layer', () => {
    const layer = makeLayer('fg')
    layer.grid[2][3] = { char: '#', fg: red, bg: DEFAULT_BG }
    expect(compositeCell([layer], 2, 3)).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
  })

  it('topmost non-empty visible cell wins', () => {
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = makeLayer('top')
    top.grid[0][0] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    expect(compositeCell([bottom, top], 0, 0).char).toBe('B')
  })

  it('skips hidden layers', () => {
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = makeLayer('top', { visible: false })
    top.grid[0][0] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    expect(compositeCell([bottom, top], 0, 0).char).toBe('A')
  })

  it('falls through to lower layer when top is default', () => {
    const bottom = makeLayer('bottom')
    bottom.grid[1][1] = { char: 'X', fg: red, bg: DEFAULT_BG }
    const top = makeLayer('top')
    // top[1][1] is default
    expect(compositeCell([bottom, top], 1, 1).char).toBe('X')
  })

  it('returns DEFAULT_CELL when all visible layers are empty at position', () => {
    const a = makeLayer('a')
    const b = makeLayer('b')
    expect(compositeCell([a, b], 5, 5)).toEqual(DEFAULT_CELL)
  })
})

describe('compositeGrid', () => {
  it('returns a full 80×25 grid', () => {
    const layer = createLayer('bg')
    const grid = compositeGrid([layer])
    expect(grid).toHaveLength(ANSI_ROWS)
    expect(grid[0]).toHaveLength(ANSI_COLS)
  })

  it('composites multiple layers correctly', () => {
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    const bottom = createLayer('bottom')
    bottom.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = createLayer('top')
    top.grid[0][1] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    const grid = compositeGrid([bottom, top])
    expect(grid[0][0].char).toBe('A')
    expect(grid[0][1].char).toBe('B')
    expect(isDefaultCell(grid[0][2])).toBe(true)
  })
})

describe('compositeCellWithOverride', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]

  it('uses overrideCell for the active layer', () => {
    const layer = createLayer('bg', 'active-1')
    const override: AnsiCell = { char: 'O', fg: red, bg: DEFAULT_BG }
    const result = compositeCellWithOverride([layer], 0, 0, 'active-1', override)
    expect(result.char).toBe('O')
  })

  it('uses grid cell for non-active layers', () => {
    const bottom = createLayer('bottom', 'bot')
    bottom.grid[0][0] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    const top = createLayer('top', 'top-1')
    const override: AnsiCell = { ...DEFAULT_CELL } // default override on active
    const result = compositeCellWithOverride([bottom, top], 0, 0, 'top-1', override)
    expect(result.char).toBe('B')
  })

  it('skips hidden layers in override compositing', () => {
    const hidden = createLayer('hidden', 'h')
    hidden.visible = false
    hidden.grid[0][0] = { char: 'H', fg: red, bg: DEFAULT_BG }
    const visible = createLayer('visible', 'v')
    visible.grid[0][0] = { char: 'V', fg: blue, bg: DEFAULT_BG }
    const override: AnsiCell = { ...DEFAULT_CELL }
    const result = compositeCellWithOverride([hidden, visible], 0, 0, 'v', override)
    // Active layer has default override, hidden layer is skipped → DEFAULT_CELL
    expect(isDefaultCell(result)).toBe(true)
  })
})

describe('cloneLayerState', () => {
  it('produces a deep clone with same values', () => {
    const layer = createLayer('bg', 'id-1')
    layer.grid[0][0] = { char: 'Z', fg: [255, 0, 0], bg: [0, 0, 0] }
    const state: LayerState = { layers: [layer], activeLayerId: 'id-1' }
    const clone = cloneLayerState(state)
    expect(clone).toEqual(state)
    expect(clone.activeLayerId).toBe('id-1')
    expect(clone.layers[0].id).toBe('id-1')
    expect(clone.layers[0].name).toBe('bg')
    expect(clone.layers[0].visible).toBe(true)
  })

  it('mutating the clone does not affect the original', () => {
    const layer = createLayer('bg', 'id-1')
    layer.grid[0][0] = { char: 'Z', fg: [255, 0, 0], bg: [0, 0, 0] }
    const state: LayerState = { layers: [layer], activeLayerId: 'id-1' }
    const clone = cloneLayerState(state)
    clone.layers[0].grid[0][0].char = 'Q'
    clone.layers[0].name = 'modified'
    expect(state.layers[0].grid[0][0].char).toBe('Z')
    expect(state.layers[0].name).toBe('bg')
  })

  it('mutating original fg array does not affect clone', () => {
    const layer = createLayer('bg', 'id-1')
    layer.grid[0][0] = { char: 'X', fg: [100, 100, 100], bg: [50, 50, 50] }
    const state: LayerState = { layers: [layer], activeLayerId: 'id-1' }
    const clone = cloneLayerState(state)
    state.layers[0].grid[0][0].fg[0] = 0
    expect(clone.layers[0].grid[0][0].fg[0]).toBe(100)
  })
})
