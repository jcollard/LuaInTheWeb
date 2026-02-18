import { describe, it, expect } from 'vitest'
import { serializeGrid, deserializeGrid, serializeLayers, deserializeLayers } from './serialization'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG, TRANSPARENT_BG } from './types'
import type { AnsiGrid, LayerState, TextLayer, RGBColor, Rect } from './types'
import { createLayer } from './layerUtils'
import { renderTextLayerGrid } from './textLayerGrid'

function createTestGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as [number, number, number],
      bg: [...DEFAULT_BG] as [number, number, number],
    }))
  )
}

describe('serializeGrid', () => {
  it('should produce a Lua table literal starting with return', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    expect(lua.startsWith('return {')).toBe(true)
  })

  it('should use Lua table syntax with equals signs', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    expect(lua).toContain('["version"] = 1')
    expect(lua).toContain(`["width"] = ${ANSI_COLS}`)
    expect(lua).toContain(`["height"] = ${ANSI_ROWS}`)
  })

  it('should include cell data in Lua syntax', () => {
    const grid = createTestGrid()
    grid[0][0] = { char: '#', fg: [255, 85, 85], bg: [0, 0, 170] }
    const lua = serializeGrid(grid)
    expect(lua).toContain('["char"] = "#"')
  })

  it('should not contain JSON colons for key-value pairs', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    expect(lua).not.toContain('"version":')
    expect(lua).not.toContain('"grid":')
  })
})

describe('deserializeGrid', () => {
  it('should round-trip an empty grid', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    const result = deserializeGrid(lua)
    expect(result).toEqual(grid)
  })

  it('should round-trip a grid with painted cells', () => {
    const grid = createTestGrid()
    grid[5][10] = { char: '@', fg: [85, 255, 85], bg: [170, 0, 170] }
    grid[24][79] = { char: 'Z', fg: [255, 255, 255], bg: [0, 0, 0] }
    const lua = serializeGrid(grid)
    const result = deserializeGrid(lua)
    expect(result[5][10]).toEqual({ char: '@', fg: [85, 255, 85], bg: [170, 0, 170] })
    expect(result[24][79]).toEqual({ char: 'Z', fg: [255, 255, 255], bg: [0, 0, 0] })
  })

  it('should throw on invalid input', () => {
    expect(() => deserializeGrid('not valid lua')).toThrow()
  })

  it('should throw on missing version field', () => {
    expect(() => deserializeGrid('return {["width"] = 80, ["height"] = 25, ["grid"] = {}}')).toThrow()
  })

  it('should throw on unsupported version with version number in message', () => {
    expect(() => deserializeGrid('return {["version"] = 99, ["width"] = 80, ["height"] = 25, ["grid"] = {}}')).toThrow('Unsupported version: 99')
  })

  it('should throw on missing grid field with descriptive message', () => {
    expect(() => deserializeGrid('return {["version"] = 1, ["width"] = 80, ["height"] = 25}')).toThrow('Missing grid field')
  })

  it('should throw when grid is a string not an array', () => {
    expect(() => deserializeGrid('return {["version"] = 1, ["width"] = 80, ["height"] = 25, ["grid"] = "not-array"}')).toThrow('Missing grid field')
  })
})

describe('serializeLayers', () => {
  it('produces a Lua table with version 3', () => {
    const layer = createLayer('Background', 'bg-1')
    const state: LayerState = { layers: [layer], activeLayerId: 'bg-1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 3')
  })

  it('includes layer metadata (id, name, visible)', () => {
    const layer = createLayer('My Layer', 'layer-1')
    const state: LayerState = { layers: [layer], activeLayerId: 'layer-1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["id"] = "layer-1"')
    expect(lua).toContain('["name"] = "My Layer"')
    expect(lua).toContain('["visible"] = true')
  })

  it('includes activeLayerId', () => {
    const layer = createLayer('BG', 'bg-1')
    const state: LayerState = { layers: [layer], activeLayerId: 'bg-1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["activeLayerId"] = "bg-1"')
  })
})

describe('deserializeLayers', () => {
  it('round-trips a v2 layer state', () => {
    const layer1 = createLayer('Background', 'bg')
    layer1.grid[0][0] = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 0] }
    const layer2 = createLayer('Foreground', 'fg')
    layer2.visible = false
    const state: LayerState = { layers: [layer1, layer2], activeLayerId: 'fg' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    expect(result.layers).toHaveLength(2)
    expect(result.layers[0].id).toBe('bg')
    expect(result.layers[0].name).toBe('Background')
    expect(result.layers[0].grid[0][0].char).toBe('A')
    expect(result.layers[1].id).toBe('fg')
    expect(result.layers[1].visible).toBe(false)
    expect(result.activeLayerId).toBe('fg')
  })

  it('deserializes v1 format into a single Background layer', () => {
    const grid = createTestGrid()
    grid[3][5] = { char: '#', fg: [255, 0, 0], bg: [0, 0, 0] }
    const lua = serializeGrid(grid)
    const result = deserializeLayers(lua)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].name).toBe('Background')
    expect(result.layers[0].visible).toBe(true)
    expect(result.layers[0].grid[3][5].char).toBe('#')
    expect(result.activeLayerId).toBe(result.layers[0].id)
  })

  it('throws on unsupported version', () => {
    expect(() => deserializeLayers('return {["version"] = 99}')).toThrow()
  })
})

describe('v3 serialization with text layers', () => {
  const red: RGBColor = [255, 0, 0]
  const bounds: Rect = { r0: 1, c0: 2, r1: 3, c1: 12 }

  function createTextLayer(name: string, text: string, fg: RGBColor, b: Rect): TextLayer {
    return {
      type: 'text',
      id: 'text-1',
      name,
      visible: true,
      text,
      bounds: b,
      textFg: fg,
      grid: renderTextLayerGrid(text, b, fg),
    }
  }

  it('serializes state with text layers as version 3', () => {
    const drawn = createLayer('Background', 'bg')
    const text = createTextLayer('Text', 'Hello', red, bounds)
    const state: LayerState = { layers: [drawn, text], activeLayerId: 'bg' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 3')
  })

  it('does not serialize grid for text layers', () => {
    const text = createTextLayer('Text', 'Hello', red, bounds)
    const state: LayerState = { layers: [text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state)
    // Text layer should have text, bounds, textFg but NOT a grid field
    expect(lua).toContain('["text"] = "Hello"')
    expect(lua).toContain('["type"] = "text"')
  })

  it('serializes drawn layers with grid and type', () => {
    const drawn = createLayer('Background', 'bg')
    drawn.grid[0][0] = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 0] }
    const state: LayerState = { layers: [drawn], activeLayerId: 'bg' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["type"] = "drawn"')
  })

  it('round-trips a state with both drawn and text layers', () => {
    const drawn = createLayer('Background', 'bg')
    drawn.grid[0][0] = { char: 'X', fg: [255, 0, 0], bg: [0, 0, 0] }
    const text = createTextLayer('Text', 'Hi', red, bounds)
    const state: LayerState = { layers: [drawn, text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)

    expect(result.layers).toHaveLength(2)
    expect(result.activeLayerId).toBe('text-1')

    // Drawn layer
    expect(result.layers[0].type).toBe('drawn')
    expect(result.layers[0].grid[0][0].char).toBe('X')

    // Text layer: grid recomputed from text+bounds+fg
    const tl = result.layers[1] as TextLayer
    expect(tl.type).toBe('text')
    expect(tl.text).toBe('Hi')
    expect(tl.bounds).toEqual(bounds)
    expect(tl.textFg).toEqual(red)
    expect(tl.grid[1][2].char).toBe('H') // computed from text+bounds
    expect(tl.grid[1][2].bg).toEqual(TRANSPARENT_BG)
  })

  it('v2 backward compat: adds type drawn to loaded layers', () => {
    const layer = createLayer('Background', 'bg')
    // Serialize as v2 (old format without type field)
    const state: LayerState = { layers: [layer], activeLayerId: 'bg' }
    const lua = serializeLayers(state)
    // Re-parse — should still work and add type: 'drawn'
    const result = deserializeLayers(lua)
    expect(result.layers[0].type).toBe('drawn')
  })

  it('v1 backward compat: single grid loads as drawn layer with type', () => {
    const grid = createTestGrid()
    grid[3][5] = { char: '#', fg: [255, 0, 0], bg: [0, 0, 0] }
    const lua = serializeGrid(grid)
    const result = deserializeLayers(lua)
    expect(result.layers[0].type).toBe('drawn')
  })

  it('round-trips textFgColors for text layers', () => {
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    const b: Rect = { r0: 1, c0: 2, r1: 3, c1: 12 }
    const text: TextLayer = {
      type: 'text',
      id: 'text-1',
      name: 'ColorText',
      visible: true,
      text: 'AB',
      bounds: b,
      textFg: red,
      textFgColors: [red, blue],
      grid: renderTextLayerGrid('AB', b, red, [red, blue]),
    }
    const state: LayerState = { layers: [text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const tl = result.layers[0] as TextLayer
    expect(tl.textFgColors).toEqual([red, blue])
    // Grid should reflect per-char colors
    expect(tl.grid[1][2].fg).toEqual(red)
    expect(tl.grid[1][3].fg).toEqual(blue)
  })

  it('round-trips textAlign for text layers', () => {
    const red: RGBColor = [255, 0, 0]
    const b: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const text: TextLayer = {
      type: 'text',
      id: 'text-1',
      name: 'Centered',
      visible: true,
      text: 'Hi',
      bounds: b,
      textFg: red,
      textAlign: 'center',
      grid: renderTextLayerGrid('Hi', b, red, undefined, 'center'),
    }
    const state: LayerState = { layers: [text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const tl = result.layers[0] as TextLayer
    expect(tl.textAlign).toBe('center')
    // Grid should be rendered with center alignment
    expect(tl.grid[0][4].char).toBe('H')
  })

  it('omits textAlign when left (default)', () => {
    const red: RGBColor = [255, 0, 0]
    const b: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const text: TextLayer = {
      type: 'text',
      id: 'text-1',
      name: 'Left',
      visible: true,
      text: 'Hi',
      bounds: b,
      textFg: red,
      // textAlign is absent (default left)
      grid: renderTextLayerGrid('Hi', b, red),
    }
    const state: LayerState = { layers: [text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state)
    expect(lua).not.toContain('textAlign')
    const result = deserializeLayers(lua)
    const tl = result.layers[0] as TextLayer
    expect(tl.textAlign).toBeUndefined()
  })

  it('round-trips text layers without textFgColors (backward compat)', () => {
    const red: RGBColor = [255, 0, 0]
    const b: Rect = { r0: 1, c0: 2, r1: 3, c1: 12 }
    const text: TextLayer = {
      type: 'text',
      id: 'text-1',
      name: 'Text',
      visible: true,
      text: 'Hi',
      bounds: b,
      textFg: red,
      // No textFgColors
      grid: renderTextLayerGrid('Hi', b, red),
    }
    const state: LayerState = { layers: [text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const tl = result.layers[0] as TextLayer
    // Should load without textFgColors (undefined)
    expect(tl.textFgColors).toBeUndefined()
    expect(tl.grid[1][2].fg).toEqual(red)
  })
})
