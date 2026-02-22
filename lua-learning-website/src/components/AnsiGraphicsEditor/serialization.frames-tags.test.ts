import { describe, it, expect } from 'vitest'
import { serializeGrid, serializeLayers, deserializeLayers } from './serialization'
import { DEFAULT_FRAME_DURATION_MS } from './types'
import type { AnsiGrid, DrawnLayer, GroupLayer, LayerState, RGBColor, Rect, TextLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
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

describe('v5 serialization (frames)', () => {
  it('single-frame layers serialize as v3 (no frames field)', () => {
    const layer = createLayer('BG', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 3')
    expect(lua).not.toContain('"frames"')
  })

  it('multi-frame layers serialize as v5 with frames', () => {
    const layer = createLayer('BG', 'l1')
    const frame2 = createTestGrid()
    frame2[0][0] = { char: 'A', fg: [255, 0, 0] as RGBColor, bg: [0, 0, 0] as RGBColor }
    layer.frames.push(frame2)
    layer.currentFrameIndex = 1
    layer.grid = layer.frames[1]
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    expect(lua).toContain('["version"] = 5')
    expect(lua).toContain('["frames"]')
    expect(lua).toContain('["currentFrameIndex"]')
    expect(lua).toContain('["frameDurationMs"]')
  })

  it('round-trips multi-frame layers', () => {
    const layer = createLayer('BG', 'l1')
    const frame2 = createTestGrid()
    frame2[0][0] = { char: 'B', fg: [0, 255, 0] as RGBColor, bg: [0, 0, 0] as RGBColor }
    layer.frames.push(frame2)
    layer.currentFrameIndex = 1
    layer.grid = layer.frames[1]
    layer.frameDurationMs = 200
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const loaded = result.layers[0] as DrawnLayer
    expect(loaded.frames).toHaveLength(2)
    expect(loaded.currentFrameIndex).toBe(1)
    expect(loaded.frameDurationMs).toBe(200)
    expect(loaded.grid).toBe(loaded.frames[1])
    expect(loaded.frames[1][0][0].char).toBe('B')
  })

  it('v3/v4 files load with frames: [grid] and defaults', () => {
    const layer = createLayer('BG', 'l1')
    // Serialize as v3 (single frame)
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    const loaded = result.layers[0] as DrawnLayer
    expect(loaded.frames).toHaveLength(1)
    expect(loaded.frames[0]).toBe(loaded.grid)
    expect(loaded.currentFrameIndex).toBe(0)
    expect(loaded.frameDurationMs).toBe(DEFAULT_FRAME_DURATION_MS)
  })

  it('v1 files load with frames: [grid] and defaults', () => {
    const grid = createTestGrid()
    grid[0][0] = { char: 'V', fg: [1, 2, 3] as RGBColor, bg: [4, 5, 6] as RGBColor }
    const luaV1 = serializeGrid(grid)
    const result = deserializeLayers(luaV1)
    const loaded = result.layers[0] as DrawnLayer
    expect(loaded.frames).toHaveLength(1)
    expect(loaded.frames[0]).toBe(loaded.grid)
    expect(loaded.currentFrameIndex).toBe(0)
  })
})

describe('v6 serialization (tags)', () => {
  it('serializes as v6 when layers have tags', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters'] }
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state, ['Characters'])
    expect(lua).toContain('["version"] = 6')
  })

  it('serializes as v6 when availableTags is non-empty', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state, ['Characters', 'Props'])
    expect(lua).toContain('["version"] = 6')
  })

  it('does not serialize as v6 when no tags present', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    expect(lua).not.toContain('["version"] = 6')
  })

  it('round-trips tags on drawn layers', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters', 'Props'] }
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state, ['Characters', 'Props'])
    const result = deserializeLayers(lua)
    expect(result.layers[0].tags).toEqual(['Characters', 'Props'])
  })

  it('round-trips tags on group layers', () => {
    const group = { ...createGroup('G', 'g1'), tags: ['UI'] }
    const child = createLayer('C', 'c1')
    child.parentId = 'g1'
    const state: LayerState = { layers: [group, child], activeLayerId: 'c1' }
    const lua = serializeLayers(state, ['UI'])
    const result = deserializeLayers(lua)
    expect((result.layers[0] as GroupLayer).tags).toEqual(['UI'])
  })

  it('round-trips tags on text layers', () => {
    const red: RGBColor = [255, 0, 0]
    const b: Rect = { r0: 1, c0: 2, r1: 3, c1: 12 }
    const text: TextLayer = {
      type: 'text', id: 'text-1', name: 'Text', visible: true,
      text: 'Hi', bounds: b, textFg: red, tags: ['Labels'],
      grid: renderTextLayerGrid('Hi', b, red),
    }
    const state: LayerState = { layers: [text], activeLayerId: 'text-1' }
    const lua = serializeLayers(state, ['Labels'])
    const result = deserializeLayers(lua)
    expect(result.layers[0].tags).toEqual(['Labels'])
  })

  it('round-trips availableTags', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state, ['Characters', 'Props', 'UI'])
    const result = deserializeLayers(lua)
    expect(result.availableTags).toEqual(['Characters', 'Props', 'UI'])
  })

  it('omits tags field when layer has no tags', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state, ['Characters'])
    // Should not contain tags for the layer itself
    expect(lua).not.toContain('["tags"]')
    // But should contain availableTags at top level
    expect(lua).toContain('["availableTags"]')
  })

  it('v1-v5 backward compat: loads without tags', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const result = deserializeLayers(lua)
    expect(result.layers[0].tags).toBeUndefined()
    expect(result.availableTags).toBeUndefined()
  })

  it('v6 with both tags and frames', () => {
    const layer = { ...createLayer('L', 'l1'), tags: ['Characters'] }
    const frame2 = createTestGrid()
    frame2[0][0] = { char: 'A', fg: [255, 0, 0] as RGBColor, bg: [0, 0, 0] as RGBColor }
    layer.frames.push(frame2)
    layer.currentFrameIndex = 1
    layer.grid = layer.frames[1]
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state, ['Characters'])
    expect(lua).toContain('["version"] = 6')
    const result = deserializeLayers(lua)
    const loaded = result.layers[0] as DrawnLayer
    expect(loaded.frames).toHaveLength(2)
    expect(loaded.tags).toEqual(['Characters'])
  })
})

describe('deserialization validation', () => {
  it('throws on unknown layer type', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    // Inject an invalid type
    const corrupted = lua.replace('["type"] = "drawn"', '["type"] = "bogus"')
    expect(() => deserializeLayers(corrupted)).toThrow('unknown layer type "bogus"')
  })

  it('throws with layer index in error message for invalid type', () => {
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    const corrupted = lua.replace('["type"] = "drawn"', '["type"] = "invalid"')
    expect(() => deserializeLayers(corrupted)).toThrow('Invalid layer at index 0')
  })

  it('allows missing type (defaults to drawn for backward compat)', () => {
    // v3 data without explicit type should default to drawn branch
    const layer = createLayer('L', 'l1')
    const state: LayerState = { layers: [layer], activeLayerId: 'l1' }
    const lua = serializeLayers(state)
    // Remove the type field entirely to simulate old v2/v3 data
    const noType = lua.replace(/\["type"\] = "drawn",?\s*/, '')
    const result = deserializeLayers(noType)
    expect(result.layers[0].type).toBe('drawn')
  })
})
