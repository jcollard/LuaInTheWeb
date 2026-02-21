/* eslint-disable max-lines */
import { describe, it, expect } from 'vitest'
import { isDefaultCell, createLayer, createGroup, compositeCell, compositeGrid, compositeCellWithOverride, cloneLayerState, syncLayerIds, mergeLayerDown, visibleDrawableLayers, getAncestorGroupIds, getGroupDescendantLayers, getGroupDescendantIds, getNestingDepth, isAncestorOf, findGroupBlockEnd, snapPastSubBlocks, extractGroupBlock, buildDisplayOrder, assertContiguousBlocks, findSafeInsertPos, duplicateLayerBlock, addTagToLayer, removeTagFromLayer } from './layerUtils'
import { DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, DEFAULT_FRAME_DURATION_MS, ANSI_ROWS, ANSI_COLS, HALF_BLOCK, TRANSPARENT_HALF, TRANSPARENT_BG, isGroupLayer, isDrawableLayer } from './types'
import type { AnsiCell, DrawableLayer, DrawnLayer, RGBColor, Layer, LayerState, TextLayer, GroupLayer } from './types'

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

  it('initializes frames with single frame aliased to grid', () => {
    const layer = createLayer('Test')
    expect(layer.frames).toHaveLength(1)
    expect(layer.frames[0]).toBe(layer.grid)
  })

  it('initializes currentFrameIndex to 0', () => {
    const layer = createLayer('Test')
    expect(layer.currentFrameIndex).toBe(0)
  })

  it('initializes frameDurationMs to DEFAULT_FRAME_DURATION_MS', () => {
    const layer = createLayer('Test')
    expect(layer.frameDurationMs).toBe(DEFAULT_FRAME_DURATION_MS)
  })
})

describe('compositeCell', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]

  function makeLayer(name: string, overrides?: Partial<DrawnLayer>): DrawnLayer {
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

  it('merges top-half from upper layer with bottom-half from lower', () => {
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: blue }
    const top = makeLayer('top')
    top.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: HALF_BLOCK, fg: red, bg: blue })
  })

  it('three layers: halves from layers 1 and 3, layer 2 default', () => {
    const green: RGBColor = [0, 170, 0]
    const l1 = makeLayer('l1')
    l1.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: green }
    const l2 = makeLayer('l2')
    // l2[0][0] is DEFAULT_CELL
    const l3 = makeLayer('l3')
    l3.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    expect(compositeCell([l1, l2, l3], 0, 0)).toEqual({ char: HALF_BLOCK, fg: red, bg: green })
  })

  it('fully opaque HALF_BLOCK blocks lower layers', () => {
    const green: RGBColor = [0, 170, 0]
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: green, bg: green }
    const top = makeLayer('top')
    top.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: blue }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: HALF_BLOCK, fg: red, bg: blue })
  })

  it('transparent half falls through to brush cell bg', () => {
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: '#', fg: [255, 255, 255], bg: blue }
    const top = makeLayer('top')
    top.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: HALF_BLOCK, fg: red, bg: blue })
  })

  it('brush cell over HALF_BLOCK wins entirely', () => {
    const green: RGBColor = [0, 170, 0]
    const white: RGBColor = [255, 255, 255]
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: blue }
    const top = makeLayer('top')
    top.grid[0][0] = { char: '#', fg: white, bg: green }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: '#', fg: white, bg: green })
  })

  it('single layer top-half only', () => {
    const layer = makeLayer('l')
    layer.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    expect(compositeCell([layer], 0, 0)).toEqual({ char: HALF_BLOCK, fg: red, bg: [...DEFAULT_BG] as RGBColor })
  })

  it('single layer bottom-half only', () => {
    const layer = makeLayer('l')
    layer.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: blue }
    expect(compositeCell([layer], 0, 0)).toEqual({ char: HALF_BLOCK, fg: [...DEFAULT_BG] as RGBColor, bg: blue })
  })

  it('both layers bottom-only: top layer wins bottom', () => {
    const green: RGBColor = [0, 170, 0]
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: green }
    const top = makeLayer('top')
    top.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: blue }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: HALF_BLOCK, fg: [...DEFAULT_BG] as RGBColor, bg: blue })
  })

  it('hidden layer halves are skipped', () => {
    const green: RGBColor = [0, 170, 0]
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: green, bg: green }
    const middle = makeLayer('middle', { visible: false })
    middle.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: red }
    const top = makeLayer('top')
    top.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: blue }
    expect(compositeCell([bottom, middle, top], 0, 0)).toEqual({ char: HALF_BLOCK, fg: green, bg: blue })
  })

  it('black half-pixel is opaque, not transparent', () => {
    const bottom = makeLayer('bottom')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    const top = makeLayer('top')
    top.grid[0][0] = { char: HALF_BLOCK, fg: [...DEFAULT_BG] as RGBColor, bg: [...TRANSPARENT_HALF] as RGBColor }
    // Black top-half ([0,0,0]) on top layer should block red from bottom layer
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: HALF_BLOCK, fg: [...DEFAULT_BG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor })
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

  it('override HALF_BLOCK merges with lower layer', () => {
    const green: RGBColor = [0, 170, 0]
    const bottom = createLayer('bottom', 'bot')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: green }
    const top = createLayer('top', 'top-1')
    const override: AnsiCell = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    const result = compositeCellWithOverride([bottom, top], 0, 0, 'top-1', override)
    expect(result).toEqual({ char: HALF_BLOCK, fg: red, bg: green })
  })

  it('override transparent bottom shows brush cell bg', () => {
    const bottom = createLayer('bottom', 'bot')
    bottom.grid[0][0] = { char: '#', fg: [255, 255, 255], bg: blue }
    const top = createLayer('top', 'top-1')
    const override: AnsiCell = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    const result = compositeCellWithOverride([bottom, top], 0, 0, 'top-1', override)
    expect(result).toEqual({ char: HALF_BLOCK, fg: red, bg: blue })
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
    ;(clone.layers[0] as DrawableLayer).grid[0][0].char = 'Q'
    clone.layers[0].name = 'modified'
    expect((state.layers[0] as DrawableLayer).grid[0][0].char).toBe('Z')
    expect(state.layers[0].name).toBe('bg')
  })

  it('mutating original fg array does not affect clone', () => {
    const layer = createLayer('bg', 'id-1')
    layer.grid[0][0] = { char: 'X', fg: [100, 100, 100], bg: [50, 50, 50] }
    const state: LayerState = { layers: [layer], activeLayerId: 'id-1' }
    const clone = cloneLayerState(state)
    ;(state.layers[0] as DrawableLayer).grid[0][0].fg[0] = 0
    expect((clone.layers[0] as DrawableLayer).grid[0][0].fg[0]).toBe(100)
  })
})

describe('cloneLayerState with frames', () => {
  it('deep-clones all frames and preserves grid/frames alias', () => {
    const layer = createLayer('bg', 'id-1')
    // Add a second frame with distinct content
    const frame2 = Array.from({ length: ANSI_ROWS }, () =>
      Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
    )
    frame2[0][0] = { char: 'F', fg: [255, 0, 0] as RGBColor, bg: [0, 0, 0] as RGBColor }
    layer.frames.push(frame2)
    layer.currentFrameIndex = 1
    layer.grid = layer.frames[1]

    const state: LayerState = { layers: [layer], activeLayerId: 'id-1' }
    const clone = cloneLayerState(state)
    const clonedLayer = clone.layers[0] as DrawnLayer

    expect(clonedLayer.frames).toHaveLength(2)
    expect(clonedLayer.currentFrameIndex).toBe(1)
    // grid should alias the correct frame
    expect(clonedLayer.grid).toBe(clonedLayer.frames[1])
    // Verify deep clone - mutating clone frame doesn't affect original
    clonedLayer.frames[1][0][0].char = 'X'
    expect(layer.frames[1][0][0].char).toBe('F')
  })
})

describe('cloneLayerState with textFgColors', () => {
  it('preserves textFgColors in cloned text layer', () => {
    const textLayer: Layer = {
      type: 'text',
      id: 'text-1',
      name: 'Text',
      visible: true,
      text: 'Hi',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 10 },
      textFg: [255, 255, 255],
      textFgColors: [[255, 0, 0], [0, 255, 0]],
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const state: LayerState = { layers: [textLayer], activeLayerId: 'text-1' }
    const clone = cloneLayerState(state)
    const cloned = clone.layers[0] as import('./types').TextLayer
    expect(cloned.textFgColors).toEqual([[255, 0, 0], [0, 255, 0]])
  })

  it('deep-copies textFgColors so mutation does not affect original', () => {
    const textLayer: Layer = {
      type: 'text',
      id: 'text-1',
      name: 'Text',
      visible: true,
      text: 'Hi',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 10 },
      textFg: [255, 255, 255],
      textFgColors: [[255, 0, 0], [0, 255, 0]],
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const state: LayerState = { layers: [textLayer], activeLayerId: 'text-1' }
    const clone = cloneLayerState(state)
    const cloned = clone.layers[0] as import('./types').TextLayer
    cloned.textFgColors![0][0] = 0
    const original = state.layers[0] as import('./types').TextLayer
    expect(original.textFgColors![0][0]).toBe(255)
  })

  it('preserves textAlign in cloned text layer', () => {
    const textLayer: Layer = {
      type: 'text',
      id: 'text-1',
      name: 'Text',
      visible: true,
      text: 'Hi',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 10 },
      textFg: [255, 255, 255],
      textAlign: 'center',
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const state: LayerState = { layers: [textLayer], activeLayerId: 'text-1' }
    const clone = cloneLayerState(state)
    const cloned = clone.layers[0] as import('./types').TextLayer
    expect(cloned.textAlign).toBe('center')
  })

  it('handles text layer without textAlign (undefined)', () => {
    const textLayer: Layer = {
      type: 'text',
      id: 'text-1',
      name: 'Text',
      visible: true,
      text: 'Hi',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 10 },
      textFg: [255, 255, 255],
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const state: LayerState = { layers: [textLayer], activeLayerId: 'text-1' }
    const clone = cloneLayerState(state)
    const cloned = clone.layers[0] as import('./types').TextLayer
    expect(cloned.textAlign).toBeUndefined()
  })

  it('handles text layer without textFgColors (undefined)', () => {
    const textLayer: Layer = {
      type: 'text',
      id: 'text-1',
      name: 'Text',
      visible: true,
      text: '',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 10 },
      textFg: [255, 255, 255],
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const state: LayerState = { layers: [textLayer], activeLayerId: 'text-1' }
    const clone = cloneLayerState(state)
    const cloned = clone.layers[0] as import('./types').TextLayer
    expect(cloned.textFgColors).toBeUndefined()
  })
})

describe('syncLayerIds', () => {
  it('updates counter past the highest layer-N id', () => {
    const layers: Layer[] = [
      createLayer('A', 'layer-5'),
      createLayer('B', 'layer-10'),
      createLayer('C', 'layer-3'),
    ]
    syncLayerIds(layers)
    const newLayer = createLayer('New')
    // Next ID should be layer-11 or higher (past layer-10)
    const match = newLayer.id.match(/^layer-(\d+)$/)
    expect(match).not.toBeNull()
    expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(11)
  })

  it('ignores non-numeric ids like clear-bg-* or v1-background', () => {
    const layers: Layer[] = [
      createLayer('A', 'clear-bg-1'),
      createLayer('B', 'v1-background'),
      createLayer('C', 'custom-id'),
    ]
    // Should not throw and should not change counter in a way
    // that breaks createLayer
    syncLayerIds(layers)
    const newLayer = createLayer('New')
    expect(newLayer.id).toMatch(/^layer-\d+$/)
  })

  it('handles empty layer array without error', () => {
    syncLayerIds([])
    const newLayer = createLayer('New')
    expect(newLayer.id).toMatch(/^layer-\d+$/)
  })
})

describe('TRANSPARENT_BG compositing', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]
  const green: RGBColor = [0, 170, 0]
  const white: RGBColor = [255, 255, 255]

  function makeLayer(name: string, overrides?: Partial<DrawnLayer>): DrawnLayer {
    const layer = createLayer(name)
    return { ...layer, ...overrides }
  }

  it('text cell above opaque cell gets bg from opaque cell', () => {
    const bottom = makeLayer('bg')
    bottom.grid[0][0] = { char: '#', fg: white, bg: blue }
    const top = makeLayer('text')
    top.grid[0][0] = { char: 'A', fg: red, bg: TRANSPARENT_BG }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: 'A', fg: red, bg: blue })
  })

  it('text cell above HALF_BLOCK gets bg from half-block bg', () => {
    const bottom = makeLayer('bg')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: green, bg: blue }
    const top = makeLayer('text')
    top.grid[0][0] = { char: 'T', fg: red, bg: TRANSPARENT_BG }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: 'T', fg: red, bg: blue })
  })

  it('text cell above nothing gets DEFAULT_BG', () => {
    const layer = makeLayer('text')
    layer.grid[0][0] = { char: 'X', fg: red, bg: TRANSPARENT_BG }
    expect(compositeCell([layer], 0, 0)).toEqual({ char: 'X', fg: red, bg: DEFAULT_BG })
  })

  it('stacked text cells: topmost char+fg wins, bg from below both', () => {
    const bottom = makeLayer('bg')
    bottom.grid[0][0] = { char: '#', fg: white, bg: green }
    const mid = makeLayer('text1')
    mid.grid[0][0] = { char: 'M', fg: blue, bg: TRANSPARENT_BG }
    const top = makeLayer('text2')
    top.grid[0][0] = { char: 'T', fg: red, bg: TRANSPARENT_BG }
    expect(compositeCell([bottom, mid, top], 0, 0)).toEqual({ char: 'T', fg: red, bg: green })
  })

  it('text cell above default cell gets DEFAULT_BG', () => {
    const bottom = makeLayer('bg')
    // bottom[0][0] is default
    const top = makeLayer('text')
    top.grid[0][0] = { char: 'Z', fg: red, bg: TRANSPARENT_BG }
    expect(compositeCell([bottom, top], 0, 0)).toEqual({ char: 'Z', fg: red, bg: DEFAULT_BG })
  })

  it('TRANSPARENT_BG cell is skipped when it has space char (default cell with transparent bg)', () => {
    const bottom = makeLayer('bg')
    bottom.grid[0][0] = { char: '#', fg: white, bg: blue }
    const top = makeLayer('text')
    // Space with TRANSPARENT_BG should be treated as "no content" — fall through
    top.grid[0][0] = { char: ' ', fg: DEFAULT_FG, bg: TRANSPARENT_BG }
    const result = compositeCell([bottom, top], 0, 0)
    expect(result).toEqual({ char: '#', fg: white, bg: blue })
  })
})

describe('mergeLayerDown', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]
  const green: RGBColor = [0, 170, 0]
  const white: RGBColor = [255, 255, 255]

  it('returns null for bottom layer (index 0)', () => {
    const layers = [createLayer('Bottom', 'b'), createLayer('Top', 't')]
    expect(mergeLayerDown(layers, 'b')).toBeNull()
  })

  it('returns null for non-existent layer id', () => {
    const layers = [createLayer('Bottom', 'b'), createLayer('Top', 't')]
    expect(mergeLayerDown(layers, 'nonexistent')).toBeNull()
  })

  it('merges two drawn layers: upper content composited onto lower', () => {
    const bottom = createLayer('Bottom', 'b')
    bottom.grid[0][0] = { char: '#', fg: red, bg: DEFAULT_BG }
    const top = createLayer('Top', 't')
    top.grid[0][1] = { char: 'X', fg: blue, bg: DEFAULT_BG }
    const result = mergeLayerDown([bottom, top], 't')!
    expect(result).toHaveLength(1)
    // Merged layer keeps lower layer's id and name
    expect(result[0].id).toBe('b')
    expect(result[0].name).toBe('Bottom')
    expect(result[0].type).toBe('drawn')
    // Both cells should be present in merged grid
    expect((result[0] as DrawableLayer).grid[0][0]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
    expect((result[0] as DrawableLayer).grid[0][1]).toEqual({ char: 'X', fg: blue, bg: DEFAULT_BG })
  })

  it('upper layer content overwrites lower layer content at same position', () => {
    const bottom = createLayer('Bottom', 'b')
    bottom.grid[0][0] = { char: 'A', fg: red, bg: green }
    const top = createLayer('Top', 't')
    top.grid[0][0] = { char: 'B', fg: blue, bg: white }
    const result = mergeLayerDown([bottom, top], 't')!
    // Top layer cell wins (opaque on top)
    expect((result[0] as DrawableLayer).grid[0][0]).toEqual({ char: 'B', fg: blue, bg: white })
  })

  it('merges text layer onto drawn layer', () => {
    const bottom = createLayer('Bottom', 'b')
    bottom.grid[0][0] = { char: '#', fg: white, bg: blue }
    const textLayer: TextLayer = {
      type: 'text',
      id: 'txt',
      name: 'Text',
      visible: true,
      text: 'A',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 10 },
      textFg: red,
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    // Place a text cell with TRANSPARENT_BG
    textLayer.grid[0][0] = { char: 'A', fg: red, bg: TRANSPARENT_BG }
    const result = mergeLayerDown([bottom, textLayer], 'txt')!
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('drawn')
    // Text 'A' should get bg from lower layer's cell
    expect((result[0] as DrawableLayer).grid[0][0]).toEqual({ char: 'A', fg: red, bg: blue })
  })

  it('preserves other layers untouched', () => {
    const l1 = createLayer('L1', 'l1')
    const l2 = createLayer('L2', 'l2')
    l2.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const l3 = createLayer('L3', 'l3')
    l3.grid[0][1] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    const l4 = createLayer('L4', 'l4')
    const result = mergeLayerDown([l1, l2, l3, l4], 'l3')!
    expect(result).toHaveLength(3)
    // l1 and l4 should be untouched
    expect(result[0].id).toBe('l1')
    expect(result[2].id).toBe('l4')
    // merged layer replaces l2, with content from both l2 and l3
    expect(result[1].id).toBe('l2')
    expect((result[1] as DrawableLayer).grid[0][0]).toEqual({ char: 'A', fg: red, bg: DEFAULT_BG })
    expect((result[1] as DrawableLayer).grid[0][1]).toEqual({ char: 'B', fg: blue, bg: DEFAULT_BG })
  })

  it('merged result matches compositeCell output for the two layers', () => {
    const bottom = createLayer('Bottom', 'b')
    bottom.grid[0][0] = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: green }
    const top = createLayer('Top', 't')
    top.grid[0][0] = { char: HALF_BLOCK, fg: red, bg: [...TRANSPARENT_HALF] as RGBColor }
    const result = mergeLayerDown([bottom, top], 't')!
    const expected = compositeCell([bottom, top], 0, 0)
    expect((result[0] as DrawableLayer).grid[0][0]).toEqual(expected)
  })

  it('keeps lower layer visibility', () => {
    const bottom = createLayer('Bottom', 'b')
    bottom.visible = false
    const top = createLayer('Top', 't')
    const result = mergeLayerDown([bottom, top], 't')!
    expect(result[0].visible).toBe(false)
  })

  it('composites both layers regardless of visibility (uses raw grid data)', () => {
    const bottom = createLayer('Bottom', 'b')
    bottom.visible = false
    bottom.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = createLayer('Top', 't')
    top.visible = false
    top.grid[0][1] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    const result = mergeLayerDown([bottom, top], 't')!
    // Both cells should be present even though layers were hidden
    expect((result[0] as DrawableLayer).grid[0][0].char).toBe('A')
    expect((result[0] as DrawableLayer).grid[0][1].char).toBe('B')
  })

  it('returns null when upper layer is a group', () => {
    const bottom = createLayer('Bottom', 'b')
    const group = createGroup('Group', 'g')
    expect(mergeLayerDown([bottom, group], 'g')).toBeNull()
  })

  it('returns null when lower layer is a group', () => {
    const group = createGroup('Group', 'g')
    const top = createLayer('Top', 't')
    expect(mergeLayerDown([group, top], 't')).toBeNull()
  })
})

describe('createGroup', () => {
  it('creates a group layer with the given name', () => {
    const group = createGroup('My Group')
    expect(group.type).toBe('group')
    expect(group.name).toBe('My Group')
    expect(group.visible).toBe(true)
    expect(group.collapsed).toBe(false)
  })

  it('generates a unique id starting with group-', () => {
    const g1 = createGroup('G1')
    const g2 = createGroup('G2')
    expect(g1.id).toMatch(/^group-\d+$/)
    expect(g2.id).toMatch(/^group-\d+$/)
    expect(g1.id).not.toBe(g2.id)
  })

  it('uses provided id when given', () => {
    const group = createGroup('Test', 'custom-group-id')
    expect(group.id).toBe('custom-group-id')
  })
})

describe('isGroupLayer', () => {
  it('returns true for group layers', () => {
    const group = createGroup('G')
    expect(isGroupLayer(group)).toBe(true)
  })

  it('returns false for drawn layers', () => {
    const layer = createLayer('L')
    expect(isGroupLayer(layer)).toBe(false)
  })
})

describe('isDrawableLayer', () => {
  it('returns true for drawn layers', () => {
    const layer = createLayer('L')
    expect(isDrawableLayer(layer)).toBe(true)
  })

  it('returns false for group layers', () => {
    const group = createGroup('G')
    expect(isDrawableLayer(group)).toBe(false)
  })
})

describe('visibleDrawableLayers', () => {
  it('returns only drawable layers, skipping groups', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const root = createLayer('Root', 'r1')
    const result = visibleDrawableLayers([root, group, child])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('r1')
    expect(result[1].id).toBe('c1')
  })

  it('skips children of hidden groups', () => {
    const group = createGroup('G', 'g1')
    group.visible = false
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const root = createLayer('Root', 'r1')
    const result = visibleDrawableLayers([root, group, child])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })

  it('includes children of visible groups', () => {
    const group = createGroup('G', 'g1')
    group.visible = true
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const result = visibleDrawableLayers([group, child])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })
})

describe('compositing with groups', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]

  it('skips children of hidden groups in compositeCell', () => {
    const group = createGroup('G', 'g1')
    group.visible = false
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    child.grid[0][0] = { char: 'X', fg: red, bg: DEFAULT_BG }
    const bottom = createLayer('Bottom', 'b1')
    bottom.grid[0][0] = { char: 'A', fg: blue, bg: DEFAULT_BG }
    expect(compositeCell([bottom, group, child], 0, 0).char).toBe('A')
  })

  it('includes children of visible groups in compositeCell', () => {
    const group = createGroup('G', 'g1')
    group.visible = true
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    child.grid[0][0] = { char: 'X', fg: red, bg: DEFAULT_BG }
    const bottom = createLayer('Bottom', 'b1')
    bottom.grid[0][0] = { char: 'A', fg: blue, bg: DEFAULT_BG }
    expect(compositeCell([bottom, group, child], 0, 0).char).toBe('X')
  })

  it('hidden group hides children in compositeGrid', () => {
    const group = createGroup('G', 'g1')
    group.visible = false
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    child.grid[0][0] = { char: 'Z', fg: red, bg: DEFAULT_BG }
    const grid = compositeGrid([group, child])
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
  })
})

describe('cloneLayerState with groups', () => {
  it('clones group layers correctly', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const state: LayerState = { layers: [group, child], activeLayerId: 'c1' }
    const clone = cloneLayerState(state)
    expect(clone.layers).toHaveLength(2)
    const clonedGroup = clone.layers[0] as GroupLayer
    expect(clonedGroup.type).toBe('group')
    expect(clonedGroup.collapsed).toBe(false)
    expect(clonedGroup.visible).toBe(true)
    const clonedChild = clone.layers[1]
    expect(isDrawableLayer(clonedChild) && clonedChild.parentId).toBe('g1')
  })

  it('preserves collapsed state in cloned group', () => {
    const group = createGroup('G', 'g1')
    group.collapsed = true
    const state: LayerState = { layers: [group, createLayer('L', 'l1')], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    const clonedGroup = clone.layers[0] as GroupLayer
    expect(clonedGroup.collapsed).toBe(true)
  })

  it('mutating cloned group does not affect original', () => {
    const group = createGroup('G', 'g1')
    const state: LayerState = { layers: [group, createLayer('L', 'l1')], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    const clonedGroup = clone.layers[0] as GroupLayer
    clonedGroup.name = 'Modified'
    clonedGroup.collapsed = true
    expect(group.name).toBe('G')
    expect(group.collapsed).toBe(false)
  })
})

describe('syncLayerIds with groups', () => {
  it('updates group counter past the highest group-N id', () => {
    const layers: Layer[] = [
      createGroup('G1', 'group-5'),
      createGroup('G2', 'group-10'),
      createLayer('L', 'layer-1'),
    ]
    syncLayerIds(layers)
    const newGroup = createGroup('New')
    const match = newGroup.id.match(/^group-(\d+)$/)
    expect(match).not.toBeNull()
    expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(11)
  })
})

describe('getAncestorGroupIds', () => {
  it('returns empty array for root layer', () => {
    const layer = createLayer('L', 'l1')
    expect(getAncestorGroupIds(layer, [layer])).toEqual([])
  })

  it('returns single ancestor for direct child', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    expect(getAncestorGroupIds(child, [group, child])).toEqual(['g1'])
  })

  it('returns multi-level ancestors', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const layers: Layer[] = [outer, inner, leaf]
    const ancestors = getAncestorGroupIds(leaf, layers)
    expect(ancestors).toEqual(['g-inner', 'g-outer'])
  })

  it('prevents infinite loops from corrupted parentId cycles', () => {
    const g1: GroupLayer = { ...createGroup('G1', 'g1'), parentId: 'g2' }
    const g2: GroupLayer = { ...createGroup('G2', 'g2'), parentId: 'g1' }
    const child = createLayer('C', 'c1')
    child.parentId = 'g1'
    const ancestors = getAncestorGroupIds(child, [g1, g2, child])
    // Should terminate without infinite loop; order may vary, just ensure it terminates
    expect(ancestors.length).toBeLessThanOrEqual(3)
  })
})

describe('getGroupDescendantLayers', () => {
  it('returns direct drawable children', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const result = getGroupDescendantLayers('g1', [group, child])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })

  it('returns recursive descendants through sub-groups', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const directChild = createLayer('Direct', 'l2')
    directChild.parentId = 'g-outer'
    const layers: Layer[] = [outer, inner, leaf, directChild]
    const result = getGroupDescendantLayers('g-outer', layers)
    expect(result).toHaveLength(2)
    const ids = result.map(l => l.id).sort()
    expect(ids).toEqual(['l1', 'l2'])
  })

  it('returns empty array when group has no children', () => {
    const group = createGroup('G', 'g1')
    expect(getGroupDescendantLayers('g1', [group])).toEqual([])
  })
})

describe('getGroupDescendantIds', () => {
  it('returns all descendant IDs including sub-groups', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const directChild = createLayer('Direct', 'l2')
    directChild.parentId = 'g-outer'
    const ids = getGroupDescendantIds('g-outer', [outer, inner, leaf, directChild])
    expect(ids).toEqual(new Set(['g-inner', 'l1', 'l2']))
  })
})

describe('getNestingDepth', () => {
  it('returns 0 for root layer', () => {
    const layer = createLayer('L', 'l1')
    expect(getNestingDepth(layer, [layer])).toBe(0)
  })

  it('returns 1 for direct child of a group', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('C', 'c1')
    child.parentId = 'g1'
    expect(getNestingDepth(child, [group, child])).toBe(1)
  })

  it('returns 2 for grandchild', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    expect(getNestingDepth(leaf, [outer, inner, leaf])).toBe(2)
  })
})

describe('isAncestorOf', () => {
  it('returns true when candidateAncestorId is a direct parent', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('C', 'c1')
    child.parentId = 'g1'
    expect(isAncestorOf('c1', 'g1', [group, child])).toBe(true)
  })

  it('returns true when candidateAncestorId is a grandparent', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    expect(isAncestorOf('l1', 'g-outer', [outer, inner, leaf])).toBe(true)
  })

  it('returns false when not an ancestor', () => {
    const g1 = createGroup('G1', 'g1')
    const g2 = createGroup('G2', 'g2')
    const child = createLayer('C', 'c1')
    child.parentId = 'g1'
    expect(isAncestorOf('c1', 'g2', [g1, g2, child])).toBe(false)
  })

  it('returns false when layerId is same as candidateAncestorId', () => {
    const group = createGroup('G', 'g1')
    expect(isAncestorOf('g1', 'g1', [group])).toBe(false)
  })
})

describe('hiddenGroupIds propagation to nested sub-groups', () => {
  it('hides deeply nested layers when ancestor group is hidden', () => {
    const outer = createGroup('Outer', 'g-outer')
    outer.visible = false
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const root = createLayer('Root', 'r1')
    const result = visibleDrawableLayers([root, outer, inner, leaf])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })

  it('shows nested layers when all ancestor groups are visible', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const result = visibleDrawableLayers([outer, inner, leaf])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('l1')
  })
})

describe('cloneLayerState preserves parentId on groups', () => {
  it('preserves parentId on cloned group layer', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const state: LayerState = { layers: [outer, inner, leaf], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    const clonedInner = clone.layers[1] as GroupLayer
    expect(clonedInner.parentId).toBe('g-outer')
  })
})

describe('findGroupBlockEnd', () => {
  it('returns startIdx+1 for a group with no children', () => {
    const g = createGroup('G', 'g1')
    const l = createLayer('L', 'l1')
    const layers: Layer[] = [l, g]
    expect(findGroupBlockEnd(layers, 'g1', 1)).toBe(2)
  })

  it('includes direct children in the block', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = { ...createLayer('L2', 'l2'), parentId: 'g1' }
    const layers: Layer[] = [g, l1, l2]
    expect(findGroupBlockEnd(layers, 'g1', 0)).toBe(3)
  })

  it('includes nested sub-groups and their children', () => {
    const g = createGroup('G', 'g1')
    const sub: GroupLayer = { ...createGroup('Sub', 'g2'), parentId: 'g1' }
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g2' }
    const layers: Layer[] = [g, sub, l1]
    expect(findGroupBlockEnd(layers, 'g1', 0)).toBe(3)
  })

  it('stops at a layer not belonging to the group', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = createLayer('L2', 'l2')
    const layers: Layer[] = [g, l1, l2]
    expect(findGroupBlockEnd(layers, 'g1', 0)).toBe(2)
  })
})

describe('snapPastSubBlocks', () => {
  it('returns pos unchanged when not inside a sub-group block', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const layers: Layer[] = [g, l1]
    expect(snapPastSubBlocks(layers, 1, 0, 2)).toBe(1)
  })

  it('snaps past sub-group block when pos falls inside it', () => {
    const g = createGroup('G', 'g1')
    const sub: GroupLayer = { ...createGroup('Sub', 'g2'), parentId: 'g1' }
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g2' }
    const l2 = { ...createLayer('L2', 'l2'), parentId: 'g1' }
    const layers: Layer[] = [g, sub, l1, l2]
    // pos=2 falls inside sub-group [1,3), should snap to 3
    expect(snapPastSubBlocks(layers, 2, 0, 4)).toBe(3)
  })

  it('returns pos when pos is at sub-group start (not strictly inside)', () => {
    const g = createGroup('G', 'g1')
    const sub: GroupLayer = { ...createGroup('Sub', 'g2'), parentId: 'g1' }
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g2' }
    const layers: Layer[] = [g, sub, l1]
    // pos=1 is AT the sub-group, not strictly inside it
    expect(snapPastSubBlocks(layers, 1, 0, 3)).toBe(1)
  })
})

describe('extractGroupBlock', () => {
  it('extracts a group and all its descendants', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = createLayer('L2', 'l2')
    const layers: Layer[] = [l2, g, l1]
    const { block, rest } = extractGroupBlock(layers, 'g1')
    expect(block.map(l => l.id)).toEqual(['g1', 'l1'])
    expect(rest.map(l => l.id)).toEqual(['l2'])
  })

  it('includes nested sub-groups in the block', () => {
    const g = createGroup('G', 'g1')
    const sub: GroupLayer = { ...createGroup('Sub', 'g2'), parentId: 'g1' }
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g2' }
    const l2 = createLayer('L2', 'l2')
    const layers: Layer[] = [l2, g, sub, l1]
    const { block, rest } = extractGroupBlock(layers, 'g1')
    expect(block.map(l => l.id)).toEqual(['g1', 'g2', 'l1'])
    expect(rest.map(l => l.id)).toEqual(['l2'])
  })

  it('preserves relative order within block and rest', () => {
    const l0 = createLayer('L0', 'l0')
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = { ...createLayer('L2', 'l2'), parentId: 'g1' }
    const l3 = createLayer('L3', 'l3')
    const layers: Layer[] = [l0, g, l1, l2, l3]
    const { block, rest } = extractGroupBlock(layers, 'g1')
    expect(block.map(l => l.id)).toEqual(['g1', 'l1', 'l2'])
    expect(rest.map(l => l.id)).toEqual(['l0', 'l3'])
  })
})

describe('buildDisplayOrder', () => {
  it('returns root-only layers in reverse order', () => {
    const l1 = createLayer('L1', 'l1')
    const l2 = createLayer('L2', 'l2')
    const layers: Layer[] = [l1, l2]
    const result = buildDisplayOrder(layers)
    expect(result.map(l => l.id)).toEqual(['l2', 'l1'])
  })

  it('places group children directly after the group (reversed)', () => {
    const l0 = createLayer('L0', 'l0')
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = { ...createLayer('L2', 'l2'), parentId: 'g1' }
    const layers: Layer[] = [l0, g, l1, l2]
    const result = buildDisplayOrder(layers)
    // Display order reverses the array but keeps tree structure
    // Reversed: [l2(g1), l1(g1), g1, l0] → DFS: g1 → l2, l1; then l0
    expect(result.map(l => l.id)).toEqual(['g1', 'l2', 'l1', 'l0'])
  })

  it('handles nested groups', () => {
    const l0 = createLayer('L0', 'l0')
    const g1 = createGroup('G1', 'g1')
    const g2: GroupLayer = { ...createGroup('G2', 'g2'), parentId: 'g1' }
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g2' }
    const layers: Layer[] = [l0, g1, g2, l1]
    const result = buildDisplayOrder(layers)
    // Reversed: [l1(g2), g2(g1), g1, l0] → DFS: g1 → g2 → l1; then l0
    expect(result.map(l => l.id)).toEqual(['g1', 'g2', 'l1', 'l0'])
  })

  it('returns empty array for empty input', () => {
    expect(buildDisplayOrder([])).toEqual([])
  })

  it('handles multiple root groups', () => {
    const g1 = createGroup('G1', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const g2 = createGroup('G2', 'g2')
    const l2 = { ...createLayer('L2', 'l2'), parentId: 'g2' }
    const layers: Layer[] = [g1, l1, g2, l2]
    const result = buildDisplayOrder(layers)
    // Reversed: [l2(g2), g2, l1(g1), g1] → DFS: g2 → l2; g1 → l1
    expect(result.map(l => l.id)).toEqual(['g2', 'l2', 'g1', 'l1'])
  })
})

describe('assertContiguousBlocks', () => {
  it('does not throw for valid contiguous blocks', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = createLayer('L2', 'l2')
    const layers: Layer[] = [l2, g, l1]
    expect(() => assertContiguousBlocks(layers)).not.toThrow()
  })

  it('does not throw for root-only layers', () => {
    const l1 = createLayer('L1', 'l1')
    const l2 = createLayer('L2', 'l2')
    expect(() => assertContiguousBlocks([l1, l2])).not.toThrow()
  })

  it('throws when a group child is separated from its group', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = createLayer('L2', 'l2')
    // l1 is separated from g by l2
    const layers: Layer[] = [g, l2, l1]
    expect(() => assertContiguousBlocks(layers)).toThrow()
  })
})

describe('findSafeInsertPos', () => {
  it('returns pos unchanged when not inside any group block', () => {
    const l1 = createLayer('L1', 'l1')
    const l2 = createLayer('L2', 'l2')
    expect(findSafeInsertPos([l1, l2], 1)).toBe(1)
  })

  it('snaps past a group block when pos falls inside it', () => {
    const l0 = createLayer('L0', 'l0')
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = { ...createLayer('L2', 'l2'), parentId: 'g1' }
    // [l0, g1, l1(g1), l2(g1)] — pos=2 is inside g1's block [1,4)
    const layers: Layer[] = [l0, g, l1, l2]
    expect(findSafeInsertPos(layers, 2)).toBe(4)
  })

  it('snaps past nested group blocks', () => {
    const g1 = createGroup('G1', 'g1')
    const g2: GroupLayer = { ...createGroup('G2', 'g2'), parentId: 'g1' }
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g2' }
    const l2 = createLayer('L2', 'l2')
    // [g1, g2(g1), l1(g2), l2] — pos=2 is inside g1's block [0,3)
    const layers: Layer[] = [g1, g2, l1, l2]
    expect(findSafeInsertPos(layers, 2)).toBe(3)
  })

  it('returns pos at boundary (right after group block)', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    const l2 = createLayer('L2', 'l2')
    // [g1, l1(g1), l2] — pos=2 is right after g1's block, safe
    const layers: Layer[] = [g, l1, l2]
    expect(findSafeInsertPos(layers, 2)).toBe(2)
  })

  it('returns pos at array start', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    expect(findSafeInsertPos([g, l1], 0)).toBe(0)
  })

  it('returns pos at array end', () => {
    const g = createGroup('G', 'g1')
    const l1 = { ...createLayer('L1', 'l1'), parentId: 'g1' }
    expect(findSafeInsertPos([g, l1], 2)).toBe(2)
  })
})

describe('duplicateLayerBlock', () => {
  it('returns empty array for non-existent layer', () => {
    const layers = [createLayer('L1', 'layer-100')]
    expect(duplicateLayerBlock(layers, 'no-such-id')).toEqual([])
  })

  it('duplicates a single drawn layer with fresh id and (Copy) name', () => {
    const layer = createLayer('Background', 'layer-200')
    layer.grid[0][0] = { char: '#', fg: [255, 0, 0], bg: [0, 0, 255] }
    const dupes = duplicateLayerBlock([layer], 'layer-200')
    expect(dupes).toHaveLength(1)
    expect(dupes[0].id).not.toBe('layer-200')
    expect(dupes[0].name).toBe('Background (Copy)')
    expect(dupes[0].type).toBe('drawn')
    // Grid data is deep-cloned
    const dupe = dupes[0] as DrawnLayer
    expect(dupe.grid[0][0].char).toBe('#')
    expect(dupe.grid[0][0].fg).toEqual([255, 0, 0])
    // Ensure deep copy (not shared reference)
    dupe.grid[0][0].fg[0] = 0
    expect(layer.grid[0][0].fg[0]).toBe(255)
  })

  it('duplicates a text layer with fresh id and (Copy) name', () => {
    const base = createLayer('Text', 'layer-300')
    const textLayer: TextLayer = {
      ...base,
      type: 'text',
      text: 'hello',
      bounds: { r0: 0, c0: 0, r1: 5, c1: 10 },
      textFg: [255, 255, 255],
    }
    const dupes = duplicateLayerBlock([textLayer], 'layer-300')
    expect(dupes).toHaveLength(1)
    expect(dupes[0].id).not.toBe('layer-300')
    expect(dupes[0].name).toBe('Text (Copy)')
    expect(dupes[0].type).toBe('text')
    const dupe = dupes[0] as TextLayer
    expect(dupe.text).toBe('hello')
    expect(dupe.bounds).toEqual({ r0: 0, c0: 0, r1: 5, c1: 10 })
  })

  it('duplicates a group with all descendants', () => {
    const group = createGroup('Folder', 'group-100')
    const child1: Layer = { ...createLayer('C1', 'layer-400'), parentId: 'group-100' }
    const child2: Layer = { ...createLayer('C2', 'layer-401'), parentId: 'group-100' }
    const layers: Layer[] = [group, child1, child2]

    const dupes = duplicateLayerBlock(layers, 'group-100')
    expect(dupes).toHaveLength(3)

    // Root group gets (Copy) name
    const dupGroup = dupes[0]
    expect(isGroupLayer(dupGroup)).toBe(true)
    expect(dupGroup.name).toBe('Folder (Copy)')
    expect(dupGroup.id).not.toBe('group-100')

    // Children keep original names
    expect(dupes[1].name).toBe('C1')
    expect(dupes[2].name).toBe('C2')

    // Children point to the new group
    expect((dupes[1] as DrawnLayer).parentId).toBe(dupGroup.id)
    expect((dupes[2] as DrawnLayer).parentId).toBe(dupGroup.id)

    // All IDs are fresh
    const originalIds = new Set(['group-100', 'layer-400', 'layer-401'])
    for (const d of dupes) {
      expect(originalIds.has(d.id)).toBe(false)
    }
  })

  it('duplicates nested sub-groups with remapped parentIds', () => {
    const g1 = createGroup('G1', 'group-200')
    const g2: GroupLayer = { ...createGroup('G2', 'group-201'), parentId: 'group-200' }
    const child: Layer = { ...createLayer('C', 'layer-500'), parentId: 'group-201' }
    const layers: Layer[] = [g1, g2, child]

    const dupes = duplicateLayerBlock(layers, 'group-200')
    expect(dupes).toHaveLength(3)

    const dupG1 = dupes[0]
    const dupG2 = dupes[1]
    const dupChild = dupes[2]

    // G1 root gets (Copy)
    expect(dupG1.name).toBe('G1 (Copy)')
    // G2 keeps original name
    expect(dupG2.name).toBe('G2')
    // Child keeps original name
    expect(dupChild.name).toBe('C')

    // Sub-group's parentId remapped to new G1
    expect((dupG2 as GroupLayer).parentId).toBe(dupG1.id)
    // Child's parentId remapped to new G2
    expect((dupChild as DrawnLayer).parentId).toBe(dupG2.id)
  })

  it('preserves root parentId for layer inside a group', () => {
    const group = createGroup('G', 'group-300')
    const child: Layer = { ...createLayer('C', 'layer-600'), parentId: 'group-300' }
    const layers: Layer[] = [group, child]

    // Duplicate just the child (not the group)
    const dupes = duplicateLayerBlock(layers, 'layer-600')
    expect(dupes).toHaveLength(1)
    expect(dupes[0].name).toBe('C (Copy)')
    // parentId is preserved (still points to original group)
    expect((dupes[0] as DrawnLayer).parentId).toBe('group-300')
  })

  it('duplicates animation frames, currentFrameIndex, and frameDurationMs', () => {
    const layer = createLayer('Anim', 'layer-800') as DrawnLayer
    // Add a second frame with distinct content
    const frame2 = layer.grid.map(row => row.map(cell => ({ ...cell })))
    frame2[0][0] = { char: 'X', fg: [255, 0, 0], bg: [0, 255, 0] }
    layer.frames = [layer.grid, frame2]
    layer.currentFrameIndex = 1
    layer.frameDurationMs = 250

    const dupes = duplicateLayerBlock([layer], 'layer-800')
    expect(dupes).toHaveLength(1)
    const dupe = dupes[0] as DrawnLayer
    expect(dupe.frames).toHaveLength(2)
    expect(dupe.currentFrameIndex).toBe(1)
    expect(dupe.frameDurationMs).toBe(250)
    // grid points to the correct cloned frame
    expect(dupe.grid).toBe(dupe.frames[1])
    // Frame content is deep-cloned
    expect(dupe.frames[1][0][0].char).toBe('X')
    dupe.frames[1][0][0].char = 'Y'
    expect(frame2[0][0].char).toBe('X') // original untouched
  })

  it('produces layers that pass assertContiguousBlocks when inserted', () => {
    const group = createGroup('G', 'group-400')
    const c1: Layer = { ...createLayer('C1', 'layer-700'), parentId: 'group-400' }
    const c2: Layer = { ...createLayer('C2', 'layer-701'), parentId: 'group-400' }
    const layers: Layer[] = [group, c1, c2]

    const dupes = duplicateLayerBlock(layers, 'group-400')
    // Insert after the original group block
    const insertIdx = findGroupBlockEnd(layers, 'group-400', 0)
    const combined = [...layers.slice(0, insertIdx), ...dupes, ...layers.slice(insertIdx)]
    expect(() => assertContiguousBlocks(combined)).not.toThrow()
  })
})

describe('addTagToLayer', () => {
  it('adds a tag to a layer with no tags', () => {
    const layer = createLayer('L', 'l1')
    const result = addTagToLayer(layer, 'Characters')
    expect(result.tags).toEqual(['Characters'])
  })

  it('adds a tag to a layer with existing tags', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Props'] }
    const result = addTagToLayer(layer, 'Characters')
    expect(result.tags).toEqual(['Props', 'Characters'])
  })

  it('does not duplicate an existing tag', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters'] }
    const result = addTagToLayer(layer, 'Characters')
    expect(result.tags).toEqual(['Characters'])
    expect(result).toBe(layer)
  })

  it('works with group layers', () => {
    const group = createGroup('G', 'g1')
    const result = addTagToLayer(group, 'UI')
    expect(result.tags).toEqual(['UI'])
  })

  it('works with text layers', () => {
    const textLayer: TextLayer = {
      type: 'text', id: 'txt-1', name: 'Text', visible: true,
      text: 'Hi', bounds: { r0: 0, c0: 0, r1: 0, c1: 10 }, textFg: [255, 255, 255],
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const result = addTagToLayer(textLayer, 'Labels')
    expect(result.tags).toEqual(['Labels'])
  })
})

describe('removeTagFromLayer', () => {
  it('removes a tag from a layer', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters', 'Props'] }
    const result = removeTagFromLayer(layer, 'Characters')
    expect(result.tags).toEqual(['Props'])
  })

  it('sets tags to undefined when last tag is removed', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters'] }
    const result = removeTagFromLayer(layer, 'Characters')
    expect(result.tags).toBeUndefined()
  })

  it('returns same layer when tag not present', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Props'] }
    const result = removeTagFromLayer(layer, 'Characters')
    expect(result).toBe(layer)
  })

  it('returns same layer when tags is undefined', () => {
    const layer = createLayer('L', 'l1')
    const result = removeTagFromLayer(layer, 'Characters')
    expect(result).toBe(layer)
  })

  it('works with group layers', () => {
    const group = { ...createGroup('G', 'g1'), tags: ['UI'] }
    const result = removeTagFromLayer(group, 'UI')
    expect(result.tags).toBeUndefined()
  })
})

describe('cloneLayer preserves tags', () => {
  it('preserves tags on drawn layers', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters'] }
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    expect(clone.layers[0].tags).toEqual(['Characters'])
  })

  it('preserves tags on group layers', () => {
    const group = { ...createGroup('G', 'g1'), tags: ['UI'] }
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [group, layer], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    expect(clone.layers[0].tags).toEqual(['UI'])
  })

  it('preserves tags on text layers', () => {
    const textLayer: Layer = {
      type: 'text', id: 'txt-1', name: 'Text', visible: true,
      text: 'Hi', bounds: { r0: 0, c0: 0, r1: 0, c1: 10 }, textFg: [255, 255, 255],
      tags: ['Labels'],
      grid: Array.from({ length: ANSI_ROWS }, () =>
        Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
      ),
    }
    const state: LayerState = { layers: [textLayer], activeLayerId: 'txt-1' }
    const clone = cloneLayerState(state)
    expect(clone.layers[0].tags).toEqual(['Labels'])
  })

  it('deep-clones tags so mutation does not affect original', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters'] }
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    clone.layers[0].tags!.push('Props')
    expect(layer.tags).toEqual(['Characters'])
  })

  it('preserves undefined tags', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const clone = cloneLayerState(state)
    expect(clone.layers[0].tags).toBeUndefined()
  })
})

describe('duplicateLayerBlock preserves tags', () => {
  it('preserves tags when duplicating a drawn layer', () => {
    const layer = { ...createLayer('L', 'layer-900'), tags: ['Characters'] }
    const dupes = duplicateLayerBlock([layer], 'layer-900')
    expect(dupes[0].tags).toEqual(['Characters'])
  })

  it('preserves tags when duplicating a group with children', () => {
    const group = { ...createGroup('G', 'group-500'), tags: ['UI'] }
    const child: Layer = { ...createLayer('C', 'layer-901'), parentId: 'group-500', tags: ['Props'] }
    const dupes = duplicateLayerBlock([group, child], 'group-500')
    expect(dupes[0].tags).toEqual(['UI'])
    expect(dupes[1].tags).toEqual(['Props'])
  })
})
