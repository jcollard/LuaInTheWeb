import { describe, it, expect } from 'vitest'
import { compositeGrid, compositeGridInto } from '../src/screenCompositor'
import type { AnsiCell, AnsiGrid, ClipLayerData, DrawnLayerData, GroupLayerData, LayerData, ReferenceLayerData, RGBColor } from '../src/screenTypes'
import {
  ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_CELL, DEFAULT_FG,
  DEFAULT_FRAME_DURATION_MS,
} from '../src/screenTypes'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

function makeEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
}

function makeDrawnLayer(id: string, visible: boolean, grid: AnsiGrid, parentId?: string): DrawnLayerData {
  return {
    type: 'drawn', id, name: id, visible, grid,
    frames: [grid], currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    parentId,
  }
}

function makeGroup(id: string, visible: boolean, parentId?: string): GroupLayerData {
  return { type: 'group', id, name: id, visible, collapsed: false, parentId }
}

function makeClipLayer(id: string, parentId: string, visible = true): ClipLayerData {
  return {
    type: 'clip', id, name: id, visible,
    grid: makeEmptyGrid(),
    parentId,
    tags: [],
  }
}

function makeRefLayer(id: string, sourceLayerId: string, offsetRow: number, offsetCol: number, parentId?: string): ReferenceLayerData {
  return { type: 'reference', id, name: id, visible: true, sourceLayerId, offsetRow, offsetCol, parentId, tags: [] }
}

function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && cell.fg[0] === DEFAULT_FG[0] && cell.fg[1] === DEFAULT_FG[1] && cell.fg[2] === DEFAULT_FG[2]
    && cell.bg[0] === DEFAULT_BG[0] && cell.bg[1] === DEFAULT_BG[1] && cell.bg[2] === DEFAULT_BG[2]
}

describe('compositeGrid with group reference layers (runtime)', () => {
  const red: RGBColor = [255, 0, 0]

  it('reference to group composites children at offset', () => {
    const group = makeGroup('g1', true)
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('#', red, DEFAULT_BG)
    const child = makeDrawnLayer('child', true, grid, 'g1')
    const ref = makeRefLayer('ref1', 'g1', 5, 10)
    const layers: LayerData[] = [group, child, ref]
    const result = compositeGrid(layers)
    // Original child visible at (0,0)
    expect(result[0][0]).toEqual(makeCell('#', red, DEFAULT_BG))
    // Reference stamps group at offset: group's (0,0) appears at (5,10)
    expect(result[5][10]).toEqual(makeCell('#', red, DEFAULT_BG))
  })

  it('reference to empty group renders transparent', () => {
    const group = makeGroup('g1', true)
    const bg = makeDrawnLayer('bg', true, makeEmptyGrid())
    const ref = makeRefLayer('ref1', 'g1', 0, 0)
    const layers: LayerData[] = [bg, group, ref]
    const result = compositeGrid(layers)
    expect(isDefaultCell(result[0][0])).toBe(true)
  })

  it('reference to group with nested group composites all descendants', () => {
    const outer = makeGroup('outer', true)
    const inner = makeGroup('inner', true, 'outer')
    const grid = makeEmptyGrid()
    grid[2][3] = makeCell('X', red, DEFAULT_BG)
    const child = makeDrawnLayer('child', true, grid, 'inner')
    const ref = makeRefLayer('ref1', 'outer', 10, 10)
    const layers: LayerData[] = [outer, inner, child, ref]
    const result = compositeGrid(layers)
    // At (12,13), ref reads composited outer group at (2,3) = 'X'
    expect(result[12][13]).toEqual(makeCell('X', red, DEFAULT_BG))
  })

  it('reference to group with clip mask applies clip', () => {
    const group = makeGroup('g1', true)
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('#', red, DEFAULT_BG)
    grid[0][1] = makeCell('@', red, DEFAULT_BG)
    const child = makeDrawnLayer('child', true, grid, 'g1')
    const clip = makeClipLayer('c1', 'g1')
    // Clip allows only (0,0)
    clip.grid[0][0] = makeCell('X', [255, 255, 255], [128, 128, 128])
    // Reference at large offset to avoid overlap with original
    const ref = makeRefLayer('ref1', 'g1', 10, 0)
    const layers: LayerData[] = [group, child, clip, ref]
    const result = compositeGrid(layers)
    // Group composite with clip: (0,0) passes, (0,1) clipped
    // Ref at offset (10,0): stamps group composite
    expect(result[10][0]).toEqual(makeCell('#', red, DEFAULT_BG))
    expect(isDefaultCell(result[10][1])).toBe(true)
  })

  it('group containing reference to itself avoids infinite recursion', () => {
    const group = makeGroup('g1', true)
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('#', red, DEFAULT_BG)
    const child = makeDrawnLayer('child', true, grid, 'g1')
    // Reference inside the group pointing to the group itself
    const selfRef = makeRefLayer('selfRef', 'g1', 1, 0, 'g1')
    const layers: LayerData[] = [group, child, selfRef]
    const result = compositeGrid(layers)
    // Original child at (0,0)
    expect(result[0][0]).toEqual(makeCell('#', red, DEFAULT_BG))
    // selfRef in the main composite resolves g1 → composites children.
    // Inner selfRef tries to resolve g1 again → cycle → transparent.
    // So group composite = just child's grid. Shifted by (1,0):
    expect(result[1][0]).toEqual(makeCell('#', red, DEFAULT_BG))
  })

  it('chained reference → reference → group resolves correctly', () => {
    const group = makeGroup('g1', true)
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('X', red, DEFAULT_BG)
    const child = makeDrawnLayer('child', true, grid, 'g1')
    const refA = makeRefLayer('refA', 'g1', 1, 2)
    const refB = makeRefLayer('refB', 'refA', 3, 4)
    const layers: LayerData[] = [group, child, refA, refB]
    const result = compositeGrid(layers)
    // refB → refA → g1. Accumulated offset: (3+1, 4+2) = (4, 6)
    expect(result[4][6]).toEqual(makeCell('X', red, DEFAULT_BG))
  })

  it('compositeGridInto works with group references', () => {
    const group = makeGroup('g1', true)
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('#', red, DEFAULT_BG)
    const child = makeDrawnLayer('child', true, grid, 'g1')
    const ref = makeRefLayer('ref1', 'g1', 5, 10)
    const layers: LayerData[] = [group, child, ref]
    const target = makeEmptyGrid()
    compositeGridInto(target, layers)
    expect(target[5][10]).toEqual(makeCell('#', red, DEFAULT_BG))
  })

  it('reference to group composites multiple children with correct stacking', () => {
    const group = makeGroup('g1', true)
    const grid1 = makeEmptyGrid()
    grid1[0][0] = makeCell('A', red, DEFAULT_BG)
    const child1 = makeDrawnLayer('c1', true, grid1, 'g1')
    const grid2 = makeEmptyGrid()
    grid2[0][0] = makeCell('B', [0, 255, 0], [0, 0, 255])
    const child2 = makeDrawnLayer('c2', true, grid2, 'g1')
    const ref = makeRefLayer('ref1', 'g1', 10, 0)
    const layers: LayerData[] = [group, child1, child2, ref]
    const result = compositeGrid(layers)
    // child2 is on top of child1 in the group; 'B' wins at (0,0)
    // Ref at offset (10,0) shows composited group
    expect(result[10][0].char).toBe('B')
  })
})
