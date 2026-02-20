import type { AnsiCell, AnsiGrid, DrawableLayer, DrawnLayer, GroupLayer, Layer, LayerState, RGBColor, TextLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, TRANSPARENT_HALF, TRANSPARENT_BG, isGroupLayer, isDrawableLayer, getParentId } from './types'

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
  if (!layer) return false
  return getAncestorGroupIds(layer, layers).includes(candidateAncestorId)
}

let nextLayerId = 1
let nextGroupId = 1

export function syncLayerIds(layers: Layer[]): void {
  for (const layer of layers) {
    const layerMatch = layer.id.match(/^layer-(\d+)$/)
    if (layerMatch) {
      const num = parseInt(layerMatch[1], 10)
      if (num >= nextLayerId) nextLayerId = num + 1
    }
    const groupMatch = layer.id.match(/^group-(\d+)$/)
    if (groupMatch) {
      const num = parseInt(groupMatch[1], 10)
      if (num >= nextGroupId) nextGroupId = num + 1
    }
  }
}

export function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

export function createLayer(name: string, id?: string): DrawnLayer {
  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
  return {
    type: 'drawn',
    id: id ?? `layer-${nextLayerId++}`,
    name,
    visible: true,
    grid,
  }
}

export function createGroup(name: string, id?: string): GroupLayer {
  return {
    type: 'group',
    id: id ?? `group-${nextGroupId++}`,
    name,
    visible: true,
    collapsed: false,
  }
}

/** Returns IDs of groups that are effectively hidden (own visible=false or any ancestor hidden). */
function hiddenGroupIds(layers: Layer[]): Set<string> {
  const ids = new Set<string>()
  // First pass: collect directly hidden groups
  for (const layer of layers) {
    if (isGroupLayer(layer) && !layer.visible) ids.add(layer.id)
  }
  // Iterative fixpoint: propagate hidden status to nested sub-groups
  let changed = true
  while (changed) {
    changed = false
    for (const layer of layers) {
      if (isGroupLayer(layer) && !ids.has(layer.id) && layer.parentId && ids.has(layer.parentId)) {
        ids.add(layer.id)
        changed = true
      }
    }
  }
  return ids
}

/** Filters to only DrawableLayer entries, skipping groups and children of hidden groups. */
export function visibleDrawableLayers(layers: Layer[]): DrawableLayer[] {
  const hidden = hiddenGroupIds(layers)
  const result: DrawableLayer[] = []
  for (const layer of layers) {
    if (!isDrawableLayer(layer)) continue
    if (layer.parentId && hidden.has(layer.parentId)) continue
    result.push(layer)
  }
  return result
}

function isTransparentBg(color: RGBColor): boolean {
  return rgbEqual(color, TRANSPARENT_BG)
}

function compositeCellCore(layers: DrawableLayer[], getCell: (layer: DrawableLayer) => AnsiCell | null): AnsiCell {
  let topColor: RGBColor | null = null
  let bottomColor: RGBColor | null = null
  // Pending text cell: char+fg from a TRANSPARENT_BG cell waiting for a bg source
  let pendingChar: string | null = null
  let pendingFg: RGBColor | null = null

  for (let i = layers.length - 1; i >= 0; i--) {
    const cell = getCell(layers[i])
    if (cell === null || isDefaultCell(cell)) continue

    // TRANSPARENT_BG cells: space = fully transparent (skip), non-space = pending text
    if (isTransparentBg(cell.bg)) {
      if (cell.char === ' ') continue
      if (pendingChar === null) {
        pendingChar = cell.char
        pendingFg = cell.fg
      }
      continue
    }

    if (cell.char === HALF_BLOCK) {
      // Pending text cell can use the half-block's bg as its background
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      if (topColor === null && !rgbEqual(cell.fg, TRANSPARENT_HALF)) topColor = cell.fg
      if (bottomColor === null && !rgbEqual(cell.bg, TRANSPARENT_HALF)) bottomColor = cell.bg
    } else {
      // Pending text cell uses this opaque cell's bg
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      // Non-HALF_BLOCK cell is fully opaque
      if (topColor === null && bottomColor === null) return cell
      if (topColor === null) topColor = cell.bg
      if (bottomColor === null) bottomColor = cell.bg
    }

    if (topColor !== null && bottomColor !== null) break
  }

  // If we have a pending text cell but no bg source, use DEFAULT_BG
  if (pendingChar !== null) {
    return { char: pendingChar, fg: pendingFg!, bg: [...DEFAULT_BG] as RGBColor }
  }

  if (topColor === null && bottomColor === null) return DEFAULT_CELL
  return {
    char: HALF_BLOCK,
    fg: topColor ?? [...DEFAULT_BG] as RGBColor,
    bg: bottomColor ?? [...DEFAULT_BG] as RGBColor,
  }
}

export function compositeCell(layers: Layer[], row: number, col: number): AnsiCell {
  const drawable = visibleDrawableLayers(layers)
  return compositeCellCore(drawable, (layer) => layer.visible ? layer.grid[row][col] : null)
}

export function compositeGrid(layers: Layer[]): AnsiGrid {
  const drawable = visibleDrawableLayers(layers)
  return Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) =>
      compositeCellCore(drawable, (layer) => layer.visible ? layer.grid[r][c] : null)
    )
  )
}

export function compositeCellWithOverride(
  layers: Layer[], row: number, col: number,
  activeLayerId: string, overrideCell: AnsiCell,
): AnsiCell {
  const drawable = visibleDrawableLayers(layers)
  return compositeCellCore(drawable, (layer) => {
    if (!layer.visible) return null
    return layer.id === activeLayerId ? overrideCell : layer.grid[row][col]
  })
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

function cloneLayer(layer: Layer): Layer {
  if (isGroupLayer(layer)) {
    return {
      type: 'group',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      collapsed: layer.collapsed,
      parentId: layer.parentId,
    } satisfies GroupLayer
  }
  const base = {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    grid: cloneGrid(layer.grid),
    parentId: layer.parentId,
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
  return { ...base, type: 'drawn' } satisfies DrawnLayer
}

export function mergeLayerDown(layers: Layer[], layerId: string): Layer[] | null {
  const idx = layers.findIndex(l => l.id === layerId)
  if (idx <= 0) return null // bottom layer or not found

  const upper = layers[idx]
  const lower = layers[idx - 1]

  // Cannot merge if either layer is a group
  if (isGroupLayer(upper) || isGroupLayer(lower)) return null

  // After group guard, both are drawable layers
  // Composite the two layers into a new grid, treating both as visible
  const pair: DrawableLayer[] = [
    { ...lower, visible: true } as DrawableLayer,
    { ...upper, visible: true } as DrawableLayer,
  ]
  const mergedGrid: AnsiGrid = Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) =>
      compositeCellCore(pair, (layer) => layer.grid[r][c])
    )
  )

  const merged: DrawnLayer = {
    type: 'drawn',
    id: lower.id,
    name: lower.name,
    visible: lower.visible,
    grid: mergedGrid,
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
  return {
    activeLayerId: state.activeLayerId,
    layers: state.layers.map(cloneLayer),
  }
}
