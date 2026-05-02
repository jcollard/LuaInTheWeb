import { describe, it, expect } from 'vitest'
import { extractCurrentChars, extractLayerChars } from './extractUsedChars'
import type { AnsiCell, AnsiGrid, DrawnLayer, GroupLayer, Layer, TextLayer } from './types'

function cell(char: string): AnsiCell {
  return { char, fg: [255, 255, 255], bg: [0, 0, 0] }
}

function grid(...rows: string[][]): AnsiGrid {
  return rows.map(r => r.map(cell))
}

function drawn(id: string, frames: AnsiGrid[], visible = true): DrawnLayer {
  return {
    id, name: id, visible, type: 'drawn',
    grid: frames[0],
    frames,
    currentFrameIndex: 0,
    frameDurationMs: 100,
  }
}

function text(id: string, g: AnsiGrid, visible = true): TextLayer {
  return {
    id, name: id, visible, type: 'text',
    grid: g,
    text: '',
    bounds: { r0: 0, c0: 0, r1: 0, c1: 0 },
    textFg: [255, 255, 255],
  }
}

describe('extractLayerChars', () => {
  it('returns chars used across every frame of a drawn layer, excluding spaces', () => {
    const layer = drawn('a', [
      grid([' ', 'A', ' '], [' ', 'B', ' ']),
      grid([' ', 'C', ' '], [' ', 'A', ' ']),
    ])
    expect(extractLayerChars(layer)).toEqual(['A', 'B', 'C'])
  })

  it('returns chars from a text layer grid', () => {
    const layer = text('t', grid([' ', 'X'], ['Y', ' ']))
    expect(extractLayerChars(layer)).toEqual(['X', 'Y'])
  })

  it('returns empty array for non-drawable layers', () => {
    const group: GroupLayer = { id: 'g', name: 'g', visible: true, type: 'group', collapsed: false }
    expect(extractLayerChars(group)).toEqual([])
  })

  it('returns empty array when layer is undefined', () => {
    expect(extractLayerChars(undefined)).toEqual([])
  })

  it('sorts results by codepoint', () => {
    const layer = drawn('a', [grid(['Z', 'A', 'M'])])
    expect(extractLayerChars(layer)).toEqual(['A', 'M', 'Z'])
  })
})

describe('extractCurrentChars', () => {
  it('unions chars across visible drawable layers', () => {
    const layers: Layer[] = [
      drawn('a', [grid(['A', ' '])]),
      drawn('b', [grid([' ', 'B'])]),
      text('t', grid(['C'])),
    ]
    expect(extractCurrentChars(layers)).toEqual(['A', 'B', 'C'])
  })

  it('skips invisible layers', () => {
    const layers: Layer[] = [
      drawn('a', [grid(['A'])]),
      drawn('b', [grid(['B'])], false),
    ]
    expect(extractCurrentChars(layers)).toEqual(['A'])
  })

  it('skips group / non-drawable layers', () => {
    const layers: Layer[] = [
      { id: 'g', name: 'g', visible: true, type: 'group', collapsed: false },
      drawn('a', [grid(['A'])]),
    ]
    expect(extractCurrentChars(layers)).toEqual(['A'])
  })

  it('returns sorted unique chars', () => {
    const layers: Layer[] = [
      drawn('a', [grid(['Z', 'A'])]),
      drawn('b', [grid(['A', 'M'])]),
    ]
    expect(extractCurrentChars(layers)).toEqual(['A', 'M', 'Z'])
  })
})
