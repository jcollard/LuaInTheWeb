import type { AnsiCell, AnsiGrid, ClipLayer, DrawableLayer, DrawnLayer, GroupLayer, Layer, LayerState, ReferenceLayer, RGBColor, TextLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, DEFAULT_FRAME_DURATION_MS, isGroupLayer, isDrawableLayer, isClipLayer, isReferenceLayer, getParentId } from './types'
import { compositeGrid } from './compositeUtils'
export { visibleDrawableLayers, compositeCell, compositeGrid, compositeGridInto, compositeCellWithOverride, prepareComposite, compositeCellPrepared, compositeCellWithOverridePrepared, type CompositeState } from './compositeUtils'

/** Walk parentId chain collecting ancestor group IDs. Uses a visited set to prevent infinite loops. */
export function getAncestorGroupIds(layer: Layer, layers: Layer[]): string[] {
  const ancestors: string[] = []
  const visited = new Set<string>()
  const layerMap = new Map(layers.map(l => [l.id, l]))
  let parentId = getParentId(layer)
  while (parentId) {
    if (visited.has(parentId)) break
    visited.add(parentId)
    ancestors.push(parentId)
    const parent = layerMap.get(parentId)
    parentId = parent ? getParentId(parent) : undefined
  }
  return ancestors
}

/** Recursively collect all drawable layers nested under a group (including through sub-groups). */
export function getGroupDescendantLayers(groupId: string, layers: Layer[]): DrawableLayer[] {
  const result: DrawableLayer[] = []
  const childGroupIds: string[] = [groupId]
  const visited = new Set<string>()
  while (childGroupIds.length > 0) {
    const currentId = childGroupIds.pop()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    for (const layer of layers) {
      if (isDrawableLayer(layer) && layer.parentId === currentId) {
        result.push(layer)
      } else if (isGroupLayer(layer) && layer.parentId === currentId) {
        childGroupIds.push(layer.id)
      }
    }
  }
  return result
}

/** Collect all layer IDs (groups + drawables) that are descendants of groupId. */
export function getGroupDescendantIds(groupId: string, layers: Layer[]): Set<string> {
  const ids = new Set<string>()
  const queue: string[] = [groupId]
  const visited = new Set<string>()
  while (queue.length > 0) {
    const currentId = queue.pop()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    for (const layer of layers) {
      if (getParentId(layer) === currentId) {
        ids.add(layer.id)
        if (isGroupLayer(layer)) queue.push(layer.id)
      }
    }
  }
  return ids
}

/** Returns ancestor count (0 = root). */
export function getNestingDepth(layer: Layer, layers: Layer[]): number {
  return getAncestorGroupIds(layer, layers).length
}

/** Check if candidateAncestorId is an ancestor of layerId. */
export function isAncestorOf(layerId: string, candidateAncestorId: string, layers: Layer[]): boolean {
  const layer = layers.find(l => l.id === layerId)
  return layer ? getAncestorGroupIds(layer, layers).includes(candidateAncestorId) : false
}

export function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

export function createLayer(
  name: string,
  id?: string,
  cols: number = ANSI_COLS,
  rows: number = ANSI_ROWS,
): DrawnLayer {
  const grid: AnsiGrid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...DEFAULT_CELL }))
  )
  return {
    type: 'drawn',
    id: id ?? crypto.randomUUID(),
    name,
    visible: true,
    grid,
    frames: [grid],
    currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
  }
}

export function createGroup(name: string, id?: string): GroupLayer {
  return {
    type: 'group',
    id: id ?? crypto.randomUUID(),
    name,
    visible: true,
    collapsed: false,
  }
}

export function createReferenceLayer(name: string, sourceLayerId: string, offsetRow = 0, offsetCol = 0, id?: string): ReferenceLayer {
  return {
    type: 'reference',
    id: id ?? crypto.randomUUID(),
    name,
    visible: true,
    sourceLayerId,
    offsetRow,
    offsetCol,
  }
}

export function addTagToLayer<T extends Layer>(layer: T, tag: string): T {
  if (layer.tags?.includes(tag)) return layer
  return { ...layer, tags: [...(layer.tags ?? []), tag] }
}

export function removeTagFromLayer<T extends Layer>(layer: T, tag: string): T {
  if (!layer.tags?.includes(tag)) return layer
  const remaining = layer.tags.filter(t => t !== tag)
  return { ...layer, tags: remaining.length > 0 ? remaining : undefined }
}

function cloneGrid(grid: AnsiGrid): AnsiGrid {
  return grid.map(row =>
    row.map(cell => ({
      ...cell,
      fg: [...cell.fg] as RGBColor,
      bg: [...cell.bg] as RGBColor,
    }))
  )
}

export function cloneLayer(layer: Layer): Layer {
  if (isGroupLayer(layer)) {
    return {
      type: 'group',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      collapsed: layer.collapsed,
      parentId: layer.parentId,
      tags: layer.tags ? [...layer.tags] : undefined,
    } satisfies GroupLayer
  }
  if (isClipLayer(layer)) {
    return {
      type: 'clip',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      grid: cloneGrid(layer.grid),
      parentId: layer.parentId,
      tags: layer.tags ? [...layer.tags] : undefined,
    } satisfies ClipLayer
  }
  if (isReferenceLayer(layer)) {
    return {
      type: 'reference',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      sourceLayerId: layer.sourceLayerId,
      offsetRow: layer.offsetRow,
      offsetCol: layer.offsetCol,
      parentId: layer.parentId,
      tags: layer.tags ? [...layer.tags] : undefined,
    } satisfies ReferenceLayer
  }
  const base = {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    grid: cloneGrid(layer.grid),
    parentId: layer.parentId,
    tags: layer.tags ? [...layer.tags] : undefined,
  }
  if (layer.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: layer.text,
      bounds: { ...layer.bounds },
      textFg: [...layer.textFg] as RGBColor,
      textFgColors: layer.textFgColors?.map(c => [...c] as RGBColor),
      textAlign: layer.textAlign,
    } satisfies TextLayer
  }
  const clonedFrames = layer.frames.map(cloneGrid)
  return {
    ...base,
    type: 'drawn',
    grid: clonedFrames[layer.currentFrameIndex],
    frames: clonedFrames,
    currentFrameIndex: layer.currentFrameIndex,
    frameDurationMs: layer.frameDurationMs,
  } satisfies DrawnLayer
}

export function mergeLayerDown(layers: Layer[], layerId: string): Layer[] | null {
  const idx = layers.findIndex(l => l.id === layerId)
  if (idx <= 0) return null // bottom layer or not found

  const upper = layers[idx]
  const lower = layers[idx - 1]

  // Cannot merge if either layer is a group, clip, or reference
  if (isGroupLayer(upper) || isGroupLayer(lower)) return null
  if (isClipLayer(upper) || isClipLayer(lower)) return null
  if (isReferenceLayer(upper) || isReferenceLayer(lower)) return null

  // After group guard, both are drawable layers
  // Composite the two layers into a new grid, treating both as visible
  const pair: Layer[] = [
    { ...lower, visible: true } as DrawableLayer,
    { ...upper, visible: true } as DrawableLayer,
  ]
  const mergedGrid = compositeGrid(pair)

  const merged: DrawnLayer = {
    type: 'drawn',
    id: lower.id,
    name: lower.name,
    visible: lower.visible,
    grid: mergedGrid,
    frames: [mergedGrid],
    currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
  }

  // Replace the lower layer with the merged result, remove the upper layer
  return [...layers.slice(0, idx - 1), merged, ...layers.slice(idx + 1)]
}

/**
 * Find the end index (exclusive) of a group's contiguous nested block,
 * including all recursive descendants (not just direct children).
 */
export function findGroupBlockEnd(layers: Layer[], groupId: string, startIdx: number): number {
  let end = startIdx + 1
  const tracked = new Set([groupId])
  for (let i = startIdx + 1; i < layers.length; i++) {
    const pid = getParentId(layers[i])
    if (pid !== undefined && tracked.has(pid)) {
      end = i + 1
      if (isGroupLayer(layers[i])) tracked.add(layers[i].id)
    } else {
      break
    }
  }
  return end
}

/**
 * If insertAt falls strictly inside a nested sub-group's block, snap it
 * to the end of that block so we never split a sub-group's contiguous range.
 */
export function snapPastSubBlocks(layers: Layer[], pos: number, groupIdx: number, rangeEnd: number): number {
  for (let i = groupIdx + 1; i < rangeEnd; i++) {
    if (isGroupLayer(layers[i])) {
      const subEnd = findGroupBlockEnd(layers, layers[i].id, i)
      if (pos > i && pos < subEnd) return subEnd
      i = subEnd - 1 // skip past this sub-block
    }
  }
  return pos
}

/**
 * Extract a group and all its descendants from the layers array.
 * Returns { block, rest } where block contains the group + descendants
 * in their original order, and rest contains everything else.
 */
export function extractGroupBlock(layers: Layer[], groupId: string): { block: Layer[]; rest: Layer[] } {
  const descendantIds = getGroupDescendantIds(groupId, layers)
  const blockIds = new Set([groupId, ...descendantIds])
  const block = layers.filter(l => blockIds.has(l.id))
  const rest = layers.filter(l => !blockIds.has(l.id))
  return { block, rest }
}

/**
 * Duplicate a layer (or group + all descendants) with fresh IDs.
 * Only the root element gets " (Copy)" appended to its name;
 * children of a duplicated group keep original names.
 * Returns the cloned layers with remapped parentIds.
 */
export function duplicateLayerBlock(layers: Layer[], layerId: string): Layer[] {
  const target = layers.find(l => l.id === layerId)
  if (!target) return []

  if (!isGroupLayer(target)) {
    const cloned = cloneLayer(target)
    const newId = crypto.randomUUID()
    return [{ ...cloned, id: newId, name: `${target.name} (Copy)` }]
  }

  const { block } = extractGroupBlock(layers, layerId)
  const idMap = new Map<string, string>()

  for (const layer of block) {
    idMap.set(layer.id, crypto.randomUUID())
  }

  return block.map(layer => {
    const cloned = cloneLayer(layer)
    const newId = idMap.get(layer.id)!
    const parentId = getParentId(layer)
    const newParentId = parentId ? (idMap.get(parentId) ?? parentId) : parentId
    const name = layer.id === layerId ? `${layer.name} (Copy)` : layer.name
    return { ...cloned, id: newId, name, parentId: newParentId } as Layer
  })
}

/**
 * If pos falls inside any group's contiguous block, snap it to the end
 * of that block. Prevents root-level insertions from splitting group blocks.
 */
export function findSafeInsertPos(layers: Layer[], pos: number): number {
  for (let i = 0; i < layers.length && i < pos; i++) {
    if (!isGroupLayer(layers[i])) continue
    const blockEnd = findGroupBlockEnd(layers, layers[i].id, i)
    if (pos > i && pos < blockEnd) return blockEnd
    i = blockEnd - 1
  }
  return pos
}

/**
 * Convert a flat layers array (bottom-to-top) into visual display order
 * by reversing and performing a DFS tree-walk. Groups appear before their children.
 */
export function buildDisplayOrder(layers: Layer[]): Layer[] {
  const childrenMap = new Map<string | undefined, Layer[]>()
  const rawReversed = [...layers].reverse()
  for (const layer of rawReversed) {
    const pid = getParentId(layer)
    const existing = childrenMap.get(pid) ?? []
    existing.push(layer)
    childrenMap.set(pid, existing)
  }
  const result: Layer[] = []
  function walk(parentId: string | undefined): void {
    const children = childrenMap.get(parentId)
    if (!children) return
    for (const layer of children) {
      result.push(layer)
      if (isGroupLayer(layer)) walk(layer.id)
    }
  }
  walk(undefined)
  return result
}

/**
 * Debug-only assertion: verifies that all group children form contiguous blocks.
 * Throws if a child is separated from its group by an unrelated layer.
 */
export function assertContiguousBlocks(layers: Layer[]): void {
  for (let i = 0; i < layers.length; i++) {
    if (!isGroupLayer(layers[i])) continue
    const groupId = layers[i].id
    const blockEnd = findGroupBlockEnd(layers, groupId, i)
    // Every descendant of this group must be within [i+1, blockEnd)
    const descendantIds = getGroupDescendantIds(groupId, layers)
    for (const dId of descendantIds) {
      const dIdx = layers.findIndex(l => l.id === dId)
      if (dIdx < i + 1 || dIdx >= blockEnd) {
        throw new Error(`Contiguity violation: layer "${dId}" (descendant of group "${groupId}") is at index ${dIdx}, outside block [${i + 1}, ${blockEnd})`)
      }
    }
  }
}

export function cloneLayerState(state: LayerState): LayerState {
  return { activeLayerId: state.activeLayerId, layers: state.layers.map(cloneLayer) }
}

export { createClipLayer, buildClipMaskMap, isCellClipped } from './clipMaskUtils'
export { formatLayerId, layerMatchesQuery, filterLayers, filterTagsTab } from './layerFilterUtils'
export type { FilteredTag } from './layerFilterUtils'
