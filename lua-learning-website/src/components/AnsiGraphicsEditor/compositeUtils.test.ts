import { describe, it, expect } from 'vitest'
import { prepareComposite, isLayerOccludedAt } from './compositeUtils'
import { createLayer } from './layerUtils'
import { createClipLayer } from './clipMaskUtils'
import { DEFAULT_BG, TRANSPARENT_BG } from './types'
import type { GroupLayer, TextLayer, RGBColor, Layer } from './types'

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]

function makeGroup(id: string, visible: boolean, parentId?: string): GroupLayer {
  return { type: 'group', id, name: id, visible, collapsed: false, parentId }
}

function makeTextLayer(id: string, bounds: { r0: number; c0: number; r1: number; c1: number }): TextLayer {
  const grid = Array.from({ length: 25 }, () =>
    Array.from({ length: 80 }, () => ({ char: ' ', fg: [170, 170, 170] as RGBColor, bg: [...TRANSPARENT_BG] as RGBColor })),
  )
  return {
    type: 'text',
    id,
    name: id,
    visible: true,
    text: 'Hello',
    bounds,
    textFg: [255, 255, 255] as RGBColor,
    grid,
  }
}

describe('isLayerOccludedAt', () => {
  it('returns false for a visible uncovered layer', () => {
    const layer = createLayer('bg', 'bg')
    layer.grid[5][10] = { char: '#', fg: red, bg: DEFAULT_BG }
    const state = prepareComposite([layer])
    expect(isLayerOccludedAt('bg', 5, 10, state)).toBe(false)
  })

  it('returns true for a layer not in composite entries (hidden group child)', () => {
    const group = makeGroup('g1', false)
    const child = createLayer('child', 'child')
    child.parentId = 'g1'
    child.grid[5][10] = { char: '#', fg: red, bg: DEFAULT_BG }
    const layers: Layer[] = [group, child]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('child', 5, 10, state)).toBe(true)
  })

  it('returns true for a directly hidden layer (visible=false)', () => {
    const layer = createLayer('hidden', 'hidden')
    layer.visible = false
    layer.grid[5][10] = { char: '#', fg: red, bg: DEFAULT_BG }
    const state = prepareComposite([layer])
    expect(isLayerOccludedAt('hidden', 5, 10, state)).toBe(true)
  })

  it('returns true when an opaque layer above covers the position', () => {
    const bottom = createLayer('bottom', 'bottom')
    bottom.grid[5][10] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = createLayer('top', 'top')
    top.grid[5][10] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    const layers: Layer[] = [bottom, top] // bottom-to-top order
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('bottom', 5, 10, state)).toBe(true)
  })

  it('returns false when layer above has default (transparent) cells at position', () => {
    const bottom = createLayer('bottom', 'bottom')
    bottom.grid[5][10] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = createLayer('top', 'top')
    // top has default cells at (5,10) — no occlusion
    const layers: Layer[] = [bottom, top]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('bottom', 5, 10, state)).toBe(false)
  })

  it('returns true when a text-bg layer above has a non-space char at position', () => {
    const bottom = createLayer('bottom', 'bottom')
    bottom.grid[5][10] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = createLayer('top', 'top')
    top.grid[5][10] = { char: 'X', fg: blue, bg: [...TRANSPARENT_BG] as RGBColor }
    const layers: Layer[] = [bottom, top]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('bottom', 5, 10, state)).toBe(true)
  })

  it('returns false when a text-bg layer above has a space char (fully transparent)', () => {
    const bottom = createLayer('bottom', 'bottom')
    bottom.grid[5][10] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const top = createLayer('top', 'top')
    top.grid[5][10] = { char: ' ', fg: blue, bg: [...TRANSPARENT_BG] as RGBColor }
    const layers: Layer[] = [bottom, top]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('bottom', 5, 10, state)).toBe(false)
  })

  it('returns false for the topmost layer (nothing above)', () => {
    const bottom = createLayer('bottom', 'bottom')
    const top = createLayer('top', 'top')
    top.grid[5][10] = { char: '#', fg: red, bg: DEFAULT_BG }
    const layers: Layer[] = [bottom, top]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('top', 5, 10, state)).toBe(false)
  })

  it('returns true for a text layer inside a hidden group', () => {
    const group = makeGroup('g1', false)
    const text = makeTextLayer('txt', { r0: 3, c0: 5, r1: 8, c1: 20 })
    text.parentId = 'g1'
    const layers: Layer[] = [group, text]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('txt', 5, 10, state)).toBe(true)
  })

  it('returns false when covering layer is clipped away by a clip mask', () => {
    const group = makeGroup('g1', true)
    const clip = createClipLayer('clip', 'g1', 'clip1')
    // Clip mask is default (transparent) at (5,10) — clips away the cover layer there
    const cover = createLayer('cover', 'cover')
    cover.parentId = 'g1'
    cover.grid[5][10] = { char: '#', fg: red, bg: [...DEFAULT_BG] as RGBColor }
    const bottom = createLayer('bottom', 'bottom')
    bottom.grid[5][10] = { char: 'A', fg: blue, bg: [...DEFAULT_BG] as RGBColor }
    // bottom is outside group, cover is inside group with clip mask
    const layers: Layer[] = [bottom, group, clip, cover]
    const state = prepareComposite(layers)
    // Cover is clipped at (5,10), so bottom is NOT occluded
    expect(isLayerOccludedAt('bottom', 5, 10, state)).toBe(false)
  })

  it('returns true for opaque bg even when char differs from transparent-bg text', () => {
    // This test distinguishes the opaque path from the transparent-bg path
    const bottom = createLayer('bottom', 'bottom')
    bottom.grid[5][10] = { char: 'A', fg: red, bg: [...DEFAULT_BG] as RGBColor }
    const top = createLayer('top', 'top')
    // Opaque cell with solid background — takes opaque path, not transparent-bg path
    top.grid[5][10] = { char: ' ', fg: blue, bg: [...red] as RGBColor }
    const layers: Layer[] = [bottom, top]
    const state = prepareComposite(layers)
    expect(isLayerOccludedAt('bottom', 5, 10, state)).toBe(true)
  })
})
