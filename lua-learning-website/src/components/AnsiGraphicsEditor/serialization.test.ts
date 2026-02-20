import { describe, it, expect } from 'vitest'
import { serializeGrid, deserializeGrid, serializeLayers, deserializeLayers } from './serialization'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG, TRANSPARENT_BG, isDrawableLayer } from './types'
import type { AnsiGrid, DrawableLayer, LayerState, TextLayer, GroupLayer, RGBColor, Rect } from './types'
import { createLayer, createGroup } from './layerUtils'
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
    expect((result.layers[0] as DrawableLayer).grid[0][0].char).toBe('A')
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
    expect((result.layers[0] as DrawableLayer).grid[3][5].char).toBe('#')
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
    expect((result.layers[0] as DrawableLayer).grid[0][0].char).toBe('X')

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

describe('v4 serialization with groups', () => {
  it('serializes as v4 when groups are present', () => {
    const group = createGroup('G', 'g1')
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const state: LayerState = { layers: [group, child], activeLayerId: 'c1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 4')
  })

  it('serializes as v3 when no groups are present', () => {
    const layer = createLayer('Background', 'bg')
    const state: LayerState = { layers: [layer], activeLayerId: 'bg' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 3')
  })

  it('serializes as v4 when parentId is present even without group layer', () => {
    const layer = createLayer('Child', 'c1')
    layer.parentId = 'g1'
    const state: LayerState = { layers: [layer], activeLayerId: 'c1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 4')
  })

  it('round-trips groups with collapsed and parentId', () => {
    const group = createGroup('Characters', 'g1')
    group.collapsed = true
    const child1 = createLayer('Hero', 'c1')
    child1.parentId = 'g1'
    const child2 = createLayer('Enemy', 'c2')
    child2.parentId = 'g1'
    const root = createLayer('Background', 'bg')
    const state: LayerState = {
      layers: [root, group, child1, child2],
      activeLayerId: 'c1',
    }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)

    expect(result.layers).toHaveLength(4)
    expect(result.activeLayerId).toBe('c1')

    // Root layer
    expect(result.layers[0].type).toBe('drawn')
    expect(result.layers[0].id).toBe('bg')

    // Group layer
    const g = result.layers[1] as GroupLayer
    expect(g.type).toBe('group')
    expect(g.id).toBe('g1')
    expect(g.name).toBe('Characters')
    expect(g.visible).toBe(true)
    expect(g.collapsed).toBe(true)

    // Children with parentId
    expect(isDrawableLayer(result.layers[2]) && result.layers[2].parentId).toBe('g1')
    expect(isDrawableLayer(result.layers[3]) && result.layers[3].parentId).toBe('g1')
  })

  it('deserializes group with collapsed=false by default', () => {
    const group = createGroup('G', 'g1')
    // collapsed defaults to false
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [group, layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const g = result.layers[0] as GroupLayer
    expect(g.collapsed).toBe(false)
  })

  it('v3 backward compat still works (no groups)', () => {
    const layer1 = createLayer('Background', 'bg')
    layer1.grid[0][0] = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 0] }
    const state: LayerState = { layers: [layer1], activeLayerId: 'bg' }
    const lua = serializeLayers(state)
    // Should be v3 (no groups)
    expect(lua).toContain('["version"] = 3')
    const result = deserializeLayers(lua)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].type).toBe('drawn')
  })

  it('serializes group layer with visibility flag', () => {
    const group = createGroup('G', 'g1')
    group.visible = false
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [group, layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const g = result.layers[0] as GroupLayer
    expect(g.visible).toBe(false)
  })

  it('does not serialize parentId for root layers', () => {
    const group = createGroup('G', 'g1')
    const root = createLayer('Root', 'r1')
    // root has no parentId
    const state: LayerState = { layers: [group, root], activeLayerId: 'r1' }
    const lua = serializeLayers(state)
    // The root layer entry should not contain parentId
    // The only parentId in the output should be absent for root
    expect(lua).not.toContain('"parentId"')
  })

  it('round-trips nested groups with group parentId', () => {
    const outer = createGroup('Outer', 'g-outer')
    const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
    const leaf = createLayer('Leaf', 'l1')
    leaf.parentId = 'g-inner'
    const state: LayerState = { layers: [outer, inner, leaf], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    expect(result.layers).toHaveLength(3)
    const restoredInner = result.layers[1] as GroupLayer
    expect(restoredInner.type).toBe('group')
    expect(restoredInner.parentId).toBe('g-outer')
    const restoredLeaf = result.layers[2]
    expect(isDrawableLayer(restoredLeaf) && restoredLeaf.parentId).toBe('g-inner')
  })

  it('backward compat: v4 without group parentId still loads', () => {
    // Create a simple group without parentId
    const group = createGroup('G', 'g1')
    const child = createLayer('Child', 'c1')
    child.parentId = 'g1'
    const state: LayerState = { layers: [group, child], activeLayerId: 'c1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const g = result.layers[0] as GroupLayer
    expect(g.parentId).toBeUndefined()
  })
})
