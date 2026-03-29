import { describe, it, expect } from 'vitest'
import { expandSelectionWithAncestors, buildExportLayers, filterExportTags } from './layerExport'
import type { Layer, DrawnLayer, GroupLayer, ClipLayer, ReferenceLayer, TextLayer, AnsiGrid, RGBColor } from './types'
import { DEFAULT_FG, DEFAULT_BG, DEFAULT_FRAME_DURATION_MS } from './types'

function makeGrid(): AnsiGrid {
  return [[{ char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }]]
}

function makeDrawn(id: string, name: string, parentId?: string, tags?: string[]): DrawnLayer {
  const grid = makeGrid()
  return {
    type: 'drawn', id, name, visible: true, parentId,
    grid, frames: [grid], currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS, tags,
  }
}

function makeGroup(id: string, name: string, parentId?: string): GroupLayer {
  return { type: 'group', id, name, visible: true, collapsed: false, parentId }
}

function makeClip(id: string, name: string, parentId: string): ClipLayer {
  return { type: 'clip', id, name, visible: true, grid: makeGrid(), parentId }
}

function makeReference(id: string, name: string, sourceLayerId: string, parentId?: string): ReferenceLayer {
  return { type: 'reference', id, name, visible: true, sourceLayerId, offsetRow: 0, offsetCol: 0, parentId }
}

function makeText(id: string, name: string, parentId?: string, tags?: string[]): TextLayer {
  return {
    type: 'text', id, name, visible: true, parentId, tags,
    text: 'hello', bounds: { r0: 0, c0: 0, r1: 1, c1: 5 },
    textFg: [...DEFAULT_FG] as RGBColor, grid: makeGrid(),
  }
}

describe('expandSelectionWithAncestors', () => {
  it('returns selected ids unchanged when no parents', () => {
    const layers: Layer[] = [makeDrawn('a', 'A'), makeDrawn('b', 'B')]
    const result = expandSelectionWithAncestors(new Set(['a']), layers)
    expect(result).toEqual(new Set(['a']))
  })

  it('adds parent group when child selected', () => {
    const layers: Layer[] = [makeGroup('g1', 'Group'), makeDrawn('a', 'A', 'g1')]
    const result = expandSelectionWithAncestors(new Set(['a']), layers)
    expect(result).toEqual(new Set(['a', 'g1']))
  })

  it('adds all ancestor groups for deeply nested child', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Top'),
      makeGroup('g2', 'Mid', 'g1'),
      makeDrawn('a', 'A', 'g2'),
    ]
    const result = expandSelectionWithAncestors(new Set(['a']), layers)
    expect(result).toEqual(new Set(['a', 'g2', 'g1']))
  })

  it('does not add unrelated groups', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Group1'),
      makeGroup('g2', 'Group2'),
      makeDrawn('a', 'A', 'g1'),
    ]
    const result = expandSelectionWithAncestors(new Set(['a']), layers)
    expect(result).toEqual(new Set(['a', 'g1']))
    expect(result.has('g2')).toBe(false)
  })
})

describe('buildExportLayers', () => {
  it('returns only selected layers preserving order', () => {
    const layers: Layer[] = [makeDrawn('a', 'A'), makeDrawn('b', 'B'), makeDrawn('c', 'C')]
    const { layers: result, warnings } = buildExportLayers(new Set(['c', 'a']), layers, false)
    expect(result.map(l => l.id)).toEqual(['a', 'c'])
    expect(warnings).toEqual([])
  })

  it('auto-includes ancestor groups when child selected', () => {
    const layers: Layer[] = [makeGroup('g1', 'Group'), makeDrawn('a', 'A', 'g1')]
    const { layers: result } = buildExportLayers(new Set(['a']), layers, false)
    expect(result.map(l => l.id)).toEqual(['g1', 'a'])
  })

  it('flattenToRoot strips all parentId', () => {
    const layers: Layer[] = [makeGroup('g1', 'Group'), makeDrawn('a', 'A', 'g1')]
    const { layers: result } = buildExportLayers(new Set(['g1', 'a']), layers, true)
    for (const layer of result) {
      expect(layer.parentId).toBeUndefined()
    }
  })

  it('flattenToRoot does NOT auto-include ancestors', () => {
    const layers: Layer[] = [makeGroup('g1', 'Group'), makeDrawn('a', 'A', 'g1')]
    const { layers: result } = buildExportLayers(new Set(['a']), layers, true)
    expect(result.map(l => l.id)).toEqual(['a'])
  })

  it('excludes reference layers with missing source and produces warning', () => {
    const layers: Layer[] = [
      makeDrawn('a', 'A'),
      makeReference('r1', 'Ref', 'missing-source'),
    ]
    const { layers: result, warnings } = buildExportLayers(new Set(['a', 'r1']), layers, false)
    expect(result.map(l => l.id)).toEqual(['a'])
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('Ref')
  })

  it('keeps reference layers when source is in selected set', () => {
    const layers: Layer[] = [
      makeDrawn('a', 'A'),
      makeReference('r1', 'Ref', 'a'),
    ]
    const { layers: result, warnings } = buildExportLayers(new Set(['a', 'r1']), layers, false)
    expect(result.map(l => l.id)).toEqual(['a', 'r1'])
    expect(warnings).toEqual([])
  })

  it('excludes clip layers without a parent group and produces warning', () => {
    // A clip with parentId=undefined is invalid (orphaned clip) — excluded with warning
    const clip: ClipLayer = { type: 'clip', id: 'c1', name: 'Clip', visible: true, grid: makeGrid(), parentId: undefined }
    const layers: Layer[] = [clip, makeDrawn('a', 'A')]
    const { layers: result, warnings } = buildExportLayers(new Set(['c1', 'a']), layers, false)
    expect(result.map(l => l.id)).toEqual(['a'])
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('Clip')
  })

  it('keeps clip layers when parent group is selected', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Group'),
      makeClip('c1', 'Clip', 'g1'),
    ]
    const { layers: result, warnings } = buildExportLayers(new Set(['g1', 'c1']), layers, false)
    expect(result.map(l => l.id)).toEqual(['g1', 'c1'])
    expect(warnings).toEqual([])
  })

  it('flattenToRoot excludes clip layers with warning', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Group'),
      makeClip('c1', 'Clip', 'g1'),
      makeDrawn('a', 'A', 'g1'),
    ]
    // flattenToRoot strips parentId, so g1 becomes an empty group and is also excluded by default
    const { layers: result, warnings } = buildExportLayers(new Set(['g1', 'c1', 'a']), layers, true)
    expect(result.map(l => l.id)).toEqual(['a'])
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('Clip')
  })

  it('preserves parentId when flattenToRoot is false', () => {
    const layers: Layer[] = [makeGroup('g1', 'Group'), makeDrawn('a', 'A', 'g1')]
    const { layers: result } = buildExportLayers(new Set(['g1', 'a']), layers, false)
    const drawn = result.find(l => l.id === 'a')!
    expect(drawn.parentId).toBe('g1')
  })

  it('excludes empty groups when includeEmptyGroups is false', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Empty Group'),
      makeGroup('g2', 'Non-Empty Group'),
      makeDrawn('a', 'A', 'g2'),
    ]
    const { layers: result } = buildExportLayers(
      new Set(['g1', 'g2', 'a']), layers, false, { includeEmptyGroups: false },
    )
    expect(result.map(l => l.id)).toEqual(['g2', 'a'])
  })

  it('includes empty groups when includeEmptyGroups is true', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Empty Group'),
      makeDrawn('a', 'A'),
    ]
    const { layers: result } = buildExportLayers(
      new Set(['g1', 'a']), layers, false, { includeEmptyGroups: true },
    )
    expect(result.map(l => l.id)).toEqual(['g1', 'a'])
  })

  it('excludes empty groups by default', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Empty Group'),
      makeDrawn('a', 'A'),
    ]
    const { layers: result } = buildExportLayers(new Set(['g1', 'a']), layers, false)
    expect(result.map(l => l.id)).toEqual(['a'])
  })

  it('excludes nested empty groups when includeEmptyGroups is false', () => {
    const layers: Layer[] = [
      makeGroup('g1', 'Outer'),
      makeGroup('g2', 'Inner', 'g1'),
    ]
    const { layers: result } = buildExportLayers(
      new Set(['g1', 'g2']), layers, false, { includeEmptyGroups: false },
    )
    expect(result).toEqual([])
  })

  it('does not mutate input layers', () => {
    const drawn = makeDrawn('a', 'A', 'g1')
    const group = makeGroup('g1', 'Group')
    const layers: Layer[] = [group, drawn]
    buildExportLayers(new Set(['g1', 'a']), layers, true)
    expect(drawn.parentId).toBe('g1')
    expect(group.parentId).toBeUndefined()
  })
})

describe('filterExportTags', () => {
  it('returns only tags used by export layers', () => {
    const layers: Layer[] = [
      makeDrawn('a', 'A', undefined, ['bg', 'fg']),
      makeText('b', 'B', undefined, ['fg']),
    ]
    const result = filterExportTags(layers, ['bg', 'fg', 'unused'])
    expect(result).toEqual(['bg', 'fg'])
  })

  it('returns undefined when no tags exist', () => {
    const layers: Layer[] = [makeDrawn('a', 'A')]
    const result = filterExportTags(layers, undefined)
    expect(result).toBeUndefined()
  })

  it('returns undefined when no exported layers have tags', () => {
    const layers: Layer[] = [makeDrawn('a', 'A')]
    const result = filterExportTags(layers, ['unused'])
    expect(result).toBeUndefined()
  })

  it('returns undefined when availableTags is empty array', () => {
    const layers: Layer[] = [makeDrawn('a', 'A', undefined, ['bg'])]
    const result = filterExportTags(layers, [])
    expect(result).toBeUndefined()
  })
})
