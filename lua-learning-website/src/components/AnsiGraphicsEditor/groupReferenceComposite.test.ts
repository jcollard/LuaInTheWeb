import { describe, it, expect } from 'vitest'
import { compositeGrid, compositeCell, createLayer, createClipLayer } from './layerUtils'
import { DEFAULT_CELL, DEFAULT_BG, DEFAULT_FG } from './types'
import type { GroupLayer, ReferenceLayer, RGBColor, Layer, AnsiCell } from './types'

function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && cell.fg[0] === DEFAULT_FG[0] && cell.fg[1] === DEFAULT_FG[1] && cell.fg[2] === DEFAULT_FG[2]
    && cell.bg[0] === DEFAULT_BG[0] && cell.bg[1] === DEFAULT_BG[1] && cell.bg[2] === DEFAULT_BG[2]
}

function makeGroup(id: string, visible: boolean, parentId?: string): GroupLayer {
  return { type: 'group', id, name: id, visible, collapsed: false, parentId }
}

function makeRef(id: string, sourceLayerId: string, offsetRow: number, offsetCol: number, parentId?: string): ReferenceLayer {
  return { type: 'reference', id, name: id, visible: true, sourceLayerId, offsetRow, offsetCol, parentId }
}

describe('hidden reference layer rendering (editor)', () => {
  const red: RGBColor = [255, 0, 0]

  it('hidden reference layer does NOT render', () => {
    const source = createLayer('Source', 'src')
    source.grid[0][0] = { char: '#', fg: red, bg: DEFAULT_BG }
    const ref: ReferenceLayer = { ...makeRef('ref1', 'src', 10, 10), visible: false }
    const layers: Layer[] = [source, ref]
    const result = compositeGrid(layers)
    // Hidden ref should not render at offset position
    expect(isDefaultCell(result[10][10])).toBe(true)
    // Source itself still renders
    expect(result[0][0]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
  })

  it('visible reference renders when source is hidden', () => {
    const source = createLayer('Source', 'src')
    source.visible = false
    source.grid[0][0] = { char: '#', fg: red, bg: DEFAULT_BG }
    const ref: ReferenceLayer = makeRef('ref1', 'src', 10, 10)
    const layers: Layer[] = [source, ref]
    const result = compositeGrid(layers)
    // Source is hidden so it does not render directly
    expect(isDefaultCell(result[0][0])).toBe(true)
    // But visible ref reads source grid and renders at offset
    expect(result[10][10]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
  })

  it('hidden drawable layer does NOT render', () => {
    const bg = createLayer('BG', 'bg')
    const fg = createLayer('FG', 'fg')
    fg.visible = false
    fg.grid[0][0] = { char: 'X', fg: red, bg: DEFAULT_BG }
    const layers: Layer[] = [bg, fg]
    const result = compositeGrid(layers)
    // Hidden drawable should not render
    expect(result[0][0]).toEqual(DEFAULT_CELL)
  })
})

describe('compositeGrid with group reference layers (editor)', () => {
  const red: RGBColor = [255, 0, 0]

  it('reference to group composites children at offset', () => {
    const group = makeGroup('g1', true)
    const child = createLayer('Child', 'child')
    child.parentId = 'g1'
    child.grid[0][0] = { char: '#', fg: red, bg: DEFAULT_BG }
    const ref = makeRef('ref1', 'g1', 5, 10)
    const layers: Layer[] = [group, child, ref]
    const result = compositeGrid(layers)
    // Original child visible at (0,0)
    expect(result[0][0]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
    // Reference stamps group at offset: group's (0,0) appears at (5,10)
    expect(result[5][10]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
  })

  it('reference to empty group renders transparent', () => {
    const group = makeGroup('g1', true)
    const bg = createLayer('BG', 'bg')
    const ref = makeRef('ref1', 'g1', 0, 0)
    const layers: Layer[] = [bg, group, ref]
    expect(compositeCell(layers, 0, 0)).toEqual(DEFAULT_CELL)
  })

  it('reference to group with nested group composites all descendants', () => {
    const outer = makeGroup('outer', true)
    const inner = makeGroup('inner', true, 'outer')
    const child = createLayer('Child', 'child')
    child.parentId = 'inner'
    child.grid[2][3] = { char: 'X', fg: red, bg: DEFAULT_BG }
    const ref = makeRef('ref1', 'outer', 10, 10)
    const layers: Layer[] = [outer, inner, child, ref]
    const result = compositeGrid(layers)
    // At (12,13), ref reads composited outer group at (2,3) = 'X'
    expect(result[12][13]).toEqual({ char: 'X', fg: red, bg: DEFAULT_BG })
  })

  it('reference to group with clip mask applies clip', () => {
    const group = makeGroup('g1', true)
    const child = createLayer('Child', 'child')
    child.parentId = 'g1'
    child.grid[0][0] = { char: '#', fg: red, bg: DEFAULT_BG }
    child.grid[0][1] = { char: '@', fg: red, bg: DEFAULT_BG }
    const clip = createClipLayer('Mask', 'g1', 'c1')
    // Clip allows only (0,0)
    clip.grid[0][0] = { char: 'X', fg: [255, 255, 255], bg: [128, 128, 128] }
    // Reference at large offset to avoid overlap
    const ref = makeRef('ref1', 'g1', 10, 0)
    const layers: Layer[] = [group, child, clip, ref]
    const result = compositeGrid(layers)
    // Group composite with clip: (0,0) passes, (0,1) clipped
    expect(result[10][0]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
    expect(isDefaultCell(result[10][1])).toBe(true)
  })

  it('group containing reference to itself avoids infinite recursion', () => {
    const group = makeGroup('g1', true)
    const child = createLayer('Child', 'child')
    child.parentId = 'g1'
    child.grid[0][0] = { char: '#', fg: red, bg: DEFAULT_BG }
    // Reference inside the group pointing to the group itself
    const selfRef = makeRef('selfRef', 'g1', 1, 0, 'g1')
    const layers: Layer[] = [group, child, selfRef]
    const result = compositeGrid(layers)
    // Original child at (0,0)
    expect(result[0][0]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
    // selfRef resolves g1 → composites children. Inner selfRef is cycle → transparent.
    // Group composite = just child. Shifted by (1,0):
    expect(result[1][0]).toEqual({ char: '#', fg: red, bg: DEFAULT_BG })
  })

  it('chained reference → reference → group resolves correctly', () => {
    const group = makeGroup('g1', true)
    const child = createLayer('Child', 'child')
    child.parentId = 'g1'
    child.grid[0][0] = { char: 'X', fg: red, bg: DEFAULT_BG }
    const refA = makeRef('refA', 'g1', 1, 2)
    const refB = makeRef('refB', 'refA', 3, 4)
    const layers: Layer[] = [group, child, refA, refB]
    const result = compositeGrid(layers)
    // refB → refA → g1. Accumulated offset: (3+1, 4+2) = (4, 6)
    expect(result[4][6]).toEqual({ char: 'X', fg: red, bg: DEFAULT_BG })
  })

  it('reference to group composites multiple children with correct stacking', () => {
    const group = makeGroup('g1', true)
    const child1 = createLayer('C1', 'c1')
    child1.parentId = 'g1'
    child1.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    const child2 = createLayer('C2', 'c2')
    child2.parentId = 'g1'
    child2.grid[0][0] = { char: 'B', fg: [0, 255, 0], bg: [0, 0, 255] }
    const ref = makeRef('ref1', 'g1', 10, 0)
    const layers: Layer[] = [group, child1, child2, ref]
    const result = compositeGrid(layers)
    // child2 on top of child1 → 'B' wins. Ref at offset (10,0):
    expect(result[10][0].char).toBe('B')
  })
})
