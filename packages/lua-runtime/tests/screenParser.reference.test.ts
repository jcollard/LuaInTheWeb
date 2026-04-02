import { describe, it, expect } from 'vitest'
import { parseScreenLayers } from '../src/screenParser'
import type { ReferenceLayerData } from '../src/screenTypes'
import { DEFAULT_BG, DEFAULT_FG } from '../src/screenTypes'

describe('v8 parsing with reference layers', () => {
  it('parses v8 format with reference layer', () => {
    const data: Record<string, unknown> = {
      version: 8,
      activeLayerId: 'src',
      palette: { 1: DEFAULT_FG, 2: DEFAULT_BG },
      defaultFg: 1,
      defaultBg: 2,
      layers: {
        1: {
          type: 'drawn', id: 'src', name: 'Source', visible: true,
          cells: {},
        },
        2: {
          type: 'reference', id: 'ref1', name: 'Ref', visible: true,
          sourceLayerId: 'src', offsetRow: 3, offsetCol: 5,
        },
      },
    }
    const layers = parseScreenLayers(data)
    expect(layers).toHaveLength(2)
    const ref = layers[1] as ReferenceLayerData
    expect(ref.type).toBe('reference')
    expect(ref.sourceLayerId).toBe('src')
    expect(ref.offsetRow).toBe(3)
    expect(ref.offsetCol).toBe(5)
  })

  it('parses v8 reference layer with parentId and tags', () => {
    const data: Record<string, unknown> = {
      version: 8,
      activeLayerId: 'src',
      palette: { 1: DEFAULT_FG, 2: DEFAULT_BG },
      defaultFg: 1,
      defaultBg: 2,
      layers: {
        1: {
          type: 'group', id: 'g1', name: 'Group', visible: true, collapsed: false,
        },
        2: {
          type: 'drawn', id: 'src', name: 'Source', visible: true,
          cells: {},
        },
        3: {
          type: 'reference', id: 'ref1', name: 'Ref', visible: true,
          sourceLayerId: 'src', offsetRow: 0, offsetCol: 0,
          parentId: 'g1', tags: { 1: 'sprite' },
        },
      },
    }
    const layers = parseScreenLayers(data)
    const ref = layers[2] as ReferenceLayerData
    expect(ref.parentId).toBe('g1')
    expect(ref.tags).toEqual(['sprite'])
  })

  it('parses v4 format with reference layer (raw grids)', () => {
    const grid: Record<number, Record<number, Record<string, unknown>>> = {}
    for (let r = 1; r <= 25; r++) {
      grid[r] = {}
      for (let c = 1; c <= 80; c++) {
        grid[r][c] = { char: ' ', fg: DEFAULT_FG, bg: DEFAULT_BG }
      }
    }
    const data: Record<string, unknown> = {
      version: 4,
      activeLayerId: 'src',
      layers: {
        1: {
          type: 'drawn', id: 'src', name: 'Source', visible: true,
          grid, frames: { 1: grid },
        },
        2: {
          type: 'reference', id: 'ref1', name: 'Ref', visible: true,
          sourceLayerId: 'src', offsetRow: 0, offsetCol: 80,
        },
      },
    }
    const layers = parseScreenLayers(data)
    expect(layers).toHaveLength(2)
    const ref = layers[1] as ReferenceLayerData
    expect(ref.type).toBe('reference')
    expect(ref.sourceLayerId).toBe('src')
    expect(ref.offsetCol).toBe(80)
  })

  it('v8 format defaults missing offsets to 0', () => {
    const data: Record<string, unknown> = {
      version: 8,
      activeLayerId: 'src',
      palette: { 1: DEFAULT_FG, 2: DEFAULT_BG },
      defaultFg: 1,
      defaultBg: 2,
      layers: {
        1: {
          type: 'drawn', id: 'src', name: 'Source', visible: true,
          cells: {},
        },
        2: {
          type: 'reference', id: 'ref1', name: 'Ref', visible: true,
          sourceLayerId: 'src',
        },
      },
    }
    const layers = parseScreenLayers(data)
    const ref = layers[1] as ReferenceLayerData
    expect(ref.offsetRow).toBe(0)
    expect(ref.offsetCol).toBe(0)
  })
})
