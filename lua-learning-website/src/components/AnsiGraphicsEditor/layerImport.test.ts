import { describe, it, expect } from 'vitest'
import { buildImportEntries, remapLayers } from './layerImport'
import { createLayer, createGroup } from './layerUtils'
import type { Layer, GroupLayer, ReferenceLayer, ClipLayer } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_CELL } from './types'

function makeGrid() {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL })),
  )
}

function makeClipLayer(name: string, parentId: string, id?: string): ClipLayer {
  return {
    type: 'clip',
    id: id ?? crypto.randomUUID(),
    name,
    visible: true,
    grid: makeGrid(),
    parentId,
  }
}

function makeReferenceLayer(
  name: string,
  sourceLayerId: string,
  parentId?: string,
  id?: string,
): ReferenceLayer {
  return {
    type: 'reference',
    id: id ?? crypto.randomUUID(),
    name,
    visible: true,
    sourceLayerId,
    offsetRow: 0,
    offsetCol: 0,
    parentId,
  }
}

describe('buildImportEntries', () => {
  it('returns entries with depth 0 for flat layers', () => {
    const bg = createLayer('Background', 'bg-1')
    const fg = createLayer('Foreground', 'fg-1')
    const entries = buildImportEntries([bg, fg])

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({ layer: bg, depth: 0 })
    expect(entries[1]).toEqual({ layer: fg, depth: 0 })
  })

  it('assigns correct depth for nested groups', () => {
    const group: GroupLayer = {
      ...createGroup('Group', 'g-1'),
      collapsed: false,
    }
    const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
    const layers: Layer[] = [group, child]
    const entries = buildImportEntries(layers)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({ layer: group, depth: 0 })
    expect(entries[1]).toEqual({ layer: child, depth: 1 })
  })

  it('handles deeply nested layers', () => {
    const outer: GroupLayer = { ...createGroup('Outer', 'g-outer'), collapsed: false }
    const inner: GroupLayer = {
      ...createGroup('Inner', 'g-inner'),
      collapsed: false,
      parentId: 'g-outer',
    }
    const leaf = { ...createLayer('Leaf', 'leaf-1'), parentId: 'g-inner' }
    const entries = buildImportEntries([outer, inner, leaf])

    expect(entries[0].depth).toBe(0)
    expect(entries[1].depth).toBe(1)
    expect(entries[2].depth).toBe(2)
  })
})

describe('remapLayers', () => {
  it('assigns new UUIDs to all layers', () => {
    const a = createLayer('A', 'a-1')
    const b = createLayer('B', 'b-1')
    const result = remapLayers([a, b], undefined, new Set())

    expect(result).toHaveLength(2)
    expect(result[0].id).not.toBe('a-1')
    expect(result[1].id).not.toBe('b-1')
    // IDs should be valid UUIDs (36 chars)
    expect(result[0].id).toHaveLength(36)
    expect(result[1].id).toHaveLength(36)
  })

  it('remaps parentId within the selected set', () => {
    const group = createGroup('G', 'g-1')
    const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
    const result = remapLayers([group, child], undefined, new Set())

    const newGroupId = result[0].id
    expect(result[1].parentId).toBe(newGroupId)
  })

  it('maps orphaned parentId to targetParentId', () => {
    // Child's parent is NOT in the selected set
    const child = { ...createLayer('Child', 'c-1'), parentId: 'missing-group' }
    const result = remapLayers([child], 'target-group', new Set())

    expect(result[0].parentId).toBe('target-group')
  })

  it('maps orphaned parentId to undefined when no target', () => {
    const child = { ...createLayer('Child', 'c-1'), parentId: 'missing-group' }
    const result = remapLayers([child], undefined, new Set())

    expect(result[0].parentId).toBeUndefined()
  })

  it('remaps ReferenceLayer sourceLayerId within selected set', () => {
    const source = createLayer('Source', 'src-1')
    const ref = makeReferenceLayer('Ref', 'src-1', undefined, 'ref-1')
    const result = remapLayers([source, ref], undefined, new Set())

    const newSourceId = result[0].id
    const remappedRef = result[1] as ReferenceLayer
    expect(remappedRef.sourceLayerId).toBe(newSourceId)
  })

  it('keeps ReferenceLayer when source exists in existingIds', () => {
    const ref = makeReferenceLayer('Ref', 'existing-layer', undefined, 'ref-1')
    const result = remapLayers([ref], undefined, new Set(['existing-layer']))

    expect(result).toHaveLength(1)
    expect((result[0] as ReferenceLayer).sourceLayerId).toBe('existing-layer')
  })

  it('excludes ReferenceLayer when source not in selected or existing', () => {
    const ref = makeReferenceLayer('Ref', 'nowhere', undefined, 'ref-1')
    const result = remapLayers([ref], undefined, new Set())

    expect(result).toHaveLength(0)
  })

  it('excludes ClipLayer when parent group not selected', () => {
    const clip = makeClipLayer('Clip', 'missing-group', 'clip-1')
    const result = remapLayers([clip], undefined, new Set())

    expect(result).toHaveLength(0)
  })

  it('keeps ClipLayer when parent group is selected', () => {
    const group = createGroup('G', 'g-1')
    const clip = makeClipLayer('Clip', 'g-1', 'clip-1')
    const result = remapLayers([group, clip], undefined, new Set())

    expect(result).toHaveLength(2)
    expect(result[1].type).toBe('clip')
    expect(result[1].parentId).toBe(result[0].id)
  })

  it('preserves original relative order', () => {
    const a = createLayer('A', 'a-1')
    const b = createLayer('B', 'b-1')
    const c = createLayer('C', 'c-1')
    const result = remapLayers([a, b, c], undefined, new Set())

    expect(result[0].name).toBe('A')
    expect(result[1].name).toBe('B')
    expect(result[2].name).toBe('C')
  })

  it('deep-clones layer data (no shared references)', () => {
    const original = createLayer('Original', 'o-1')
    const result = remapLayers([original], undefined, new Set())

    // Mutating result grid should not affect original
    result[0].name = 'Changed'
    expect(original.name).toBe('Original')
  })

  it('sets root-level layers parentId to targetParentId', () => {
    const a = createLayer('A', 'a-1') // no parentId
    const result = remapLayers([a], 'target-group', new Set())

    expect(result[0].parentId).toBe('target-group')
  })
})
