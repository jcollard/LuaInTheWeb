/**
 * Shared generic compositing engine for ANSI layer systems.
 *
 * Both the editor (Layer types) and runtime (LayerData types) have structurally
 * identical compositing logic. This module extracts it into generic functions
 * parameterized by minimal structural interfaces that both type families satisfy.
 */

// --- Minimal ANSI types for compositing ---

export type RGBColor = [number, number, number]

export interface AnsiCell {
  char: string
  fg: RGBColor
  bg: RGBColor
}

export type AnsiGrid = AnsiCell[][]

// --- Constants ---

export const ANSI_COLS = 80
export const ANSI_ROWS = 25
export const DEFAULT_FG: RGBColor = [170, 170, 170]
export const DEFAULT_BG: RGBColor = [0, 0, 0]
export const DEFAULT_CELL: AnsiCell = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
export const HALF_BLOCK = '\u2580'
export const TRANSPARENT_HALF: RGBColor = [-1, -1, -1]
export const TRANSPARENT_BG: RGBColor = [-2, -2, -2]

// --- Helpers ---

export function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && rgbEqual(cell.fg, DEFAULT_FG) && rgbEqual(cell.bg, DEFAULT_BG)
}

function isTransparentBg(color: RGBColor): boolean {
  return rgbEqual(color, TRANSPARENT_BG)
}

// --- Minimal layer constraint interfaces ---

/** Minimal layer shape that both Layer and LayerData satisfy. */
export interface CompositeLayer {
  readonly id: string
  readonly name: string
  readonly visible: boolean
  readonly parentId?: string
  readonly type: string
}

/** Layer with a grid (drawn/text/clip layers). */
export interface GridCompositeLayer extends CompositeLayer {
  readonly grid: AnsiGrid
}

/** Reference layer shape. */
export interface ReferenceCompositeLayer extends CompositeLayer {
  readonly type: 'reference'
  readonly sourceLayerId: string
  readonly offsetRow: number
  readonly offsetCol: number
}

/** Group layer shape. */
export interface GroupCompositeLayer extends CompositeLayer {
  readonly type: 'group'
}

// --- Composite entry types ---

export interface DrawableEntry {
  kind: 'drawable'
  id: string
  visible: boolean
  parentId?: string
  grid: AnsiGrid
}

export interface ReferenceEntry {
  kind: 'reference'
  id: string
  visible: boolean
  parentId?: string
  sourceGrid: AnsiGrid
  offsetRow: number
  offsetCol: number
}

export type CompositeEntry = DrawableEntry | ReferenceEntry

// --- Type guard config ---

/** Type guards and helpers needed by the compositing engine. */
export interface CompositeHelpers<L extends CompositeLayer> {
  isGroupLayer: (layer: L) => layer is L & GroupCompositeLayer
  isDrawableLayer: (layer: L) => layer is L & GridCompositeLayer
  isReferenceLayer: (layer: L) => layer is L & ReferenceCompositeLayer
  createEmptyGrid: () => AnsiGrid
  buildClipMaskMap: (layers: L[]) => Map<string, AnsiGrid>
  isCellClipped: (
    layer: { parentId?: string }, row: number, col: number,
    clipMap: Map<string, AnsiGrid>, layerMap: Map<string, L>,
  ) => boolean
}

// --- Core compositing (standalone, already generic) ---

/**
 * Core compositing: merge a stack of entries into a single cell.
 * Entries are ordered bottom-to-top (index 0 = bottom).
 * Iterates from top to bottom, resolving transparency.
 */
export function compositeCellCore<T>(
  layers: T[],
  getCell: (layer: T) => AnsiCell | null,
  preserveTransparency?: boolean,
): AnsiCell {
  let topColor: RGBColor | null = null
  let bottomColor: RGBColor | null = null
  let pendingChar: string | null = null
  let pendingFg: RGBColor | null = null

  for (let i = layers.length - 1; i >= 0; i--) {
    const cell = getCell(layers[i])
    if (cell === null || isDefaultCell(cell)) continue

    if (isTransparentBg(cell.bg)) {
      if (cell.char === ' ') continue
      if (pendingChar === null) {
        pendingChar = cell.char
        pendingFg = cell.fg
      }
      continue
    }

    if (cell.char === HALF_BLOCK) {
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      if (topColor === null && !rgbEqual(cell.fg, TRANSPARENT_HALF)) topColor = cell.fg
      if (bottomColor === null && !rgbEqual(cell.bg, TRANSPARENT_HALF)) bottomColor = cell.bg
    } else {
      if (pendingChar !== null) {
        return { char: pendingChar, fg: pendingFg!, bg: cell.bg }
      }
      if (topColor === null && bottomColor === null) return cell
      if (topColor === null) topColor = cell.bg
      if (bottomColor === null) bottomColor = cell.bg
    }

    if (topColor !== null && bottomColor !== null) break
  }

  if (pendingChar !== null) {
    const bg = preserveTransparency ? [...TRANSPARENT_BG] : [...DEFAULT_BG]
    return { char: pendingChar, fg: pendingFg!, bg: bg as RGBColor }
  }

  if (topColor === null && bottomColor === null) return DEFAULT_CELL
  return {
    char: HALF_BLOCK,
    fg: topColor ?? ([...(preserveTransparency ? TRANSPARENT_HALF : DEFAULT_BG)] as RGBColor),
    bg: bottomColor ?? ([...(preserveTransparency ? TRANSPARENT_HALF : DEFAULT_BG)] as RGBColor),
  }
}

// --- Engine factory ---

export interface CompositeEngine<L extends CompositeLayer> {
  hiddenGroupIds: (layers: L[]) => Set<string>
  collectGroupSubset: (groupId: string, allLayers: L[]) => L[]
  resolveReference: (
    sourceLayerId: string, offsetRow: number, offsetCol: number,
    layers: { map: Map<string, L>; all: L[] },
    visited?: Set<string>, groupGridCache?: Map<string, AnsiGrid>,
  ) => { grid: AnsiGrid; offsetRow: number; offsetCol: number } | null
  buildCompositeEntries: (
    layers: L[], layerMap: Map<string, L>, groupGridCache?: Map<string, AnsiGrid>,
  ) => CompositeEntry[]
  getEntryCell: (entry: CompositeEntry, row: number, col: number) => AnsiCell | null
  compositeGroupToGridInto: (
    target: AnsiGrid, groupId: string,
    layers: { map: Map<string, L>; all: L[] },
    visited: Set<string>, groupGridCache?: Map<string, AnsiGrid>,
  ) => AnsiGrid | null
}

/**
 * Create a compositing engine bound to specific type guards and helpers.
 * Both the editor and runtime call this once with their own type guards.
 */
export function createCompositeEngine<L extends CompositeLayer>(
  helpers: CompositeHelpers<L>,
): CompositeEngine<L> {
  const {
    isGroupLayer, isDrawableLayer, isReferenceLayer,
    createEmptyGrid, buildClipMaskMap, isCellClipped,
  } = helpers

  function hiddenGroupIds(layers: L[]): Set<string> {
    const ids = new Set<string>()
    const children = new Map<string, string[]>()
    for (const layer of layers) {
      if (isGroupLayer(layer) && layer.parentId) {
        const siblings = children.get(layer.parentId)
        if (siblings) siblings.push(layer.id)
        else children.set(layer.parentId, [layer.id])
      }
    }
    const queue: string[] = []
    for (const layer of layers) {
      if (isGroupLayer(layer) && !layer.visible) {
        ids.add(layer.id)
        queue.push(layer.id)
      }
    }
    while (queue.length > 0) {
      const parentId = queue.pop()
      if (!parentId) continue
      const kids = children.get(parentId)
      if (!kids) continue
      for (const kid of kids) {
        if (!ids.has(kid)) {
          ids.add(kid)
          queue.push(kid)
        }
      }
    }
    return ids
  }

  function collectGroupSubset(groupId: string, allLayers: L[]): L[] {
    const result: L[] = []
    const descendantGroups = new Set([groupId])
    for (const layer of allLayers) {
      if (layer.id === groupId) { result.push(layer); continue }
      if (layer.parentId && descendantGroups.has(layer.parentId)) {
        result.push(layer)
        if (isGroupLayer(layer)) descendantGroups.add(layer.id)
      }
    }
    return result
  }

  function compositeGroupToGridInto(
    target: AnsiGrid,
    groupId: string, layers: { map: Map<string, L>; all: L[] }, visited: Set<string>,
    groupGridCache?: Map<string, AnsiGrid>,
  ): AnsiGrid | null {
    const subset = collectGroupSubset(groupId, layers.all)
    if (subset.length <= 1) return null

    const hidden = hiddenGroupIds(subset)
    hidden.delete(groupId)
    const entries: CompositeEntry[] = []
    for (const layer of subset) {
      if (layer.parentId && hidden.has(layer.parentId)) continue
      if (isDrawableLayer(layer)) {
        entries.push({ kind: 'drawable', id: layer.id, visible: layer.visible, parentId: layer.parentId, grid: layer.grid })
      } else if (isReferenceLayer(layer)) {
        const resolved = resolveReference(layer.sourceLayerId, layer.offsetRow, layer.offsetCol, layers, visited, groupGridCache)
        if (resolved) {
          entries.push({ kind: 'reference', id: layer.id, visible: layer.visible, parentId: layer.parentId, sourceGrid: resolved.grid, offsetRow: resolved.offsetRow, offsetCol: resolved.offsetCol })
        }
      }
    }
    if (entries.length === 0) return null

    const clipMap = buildClipMaskMap(subset)
    const subMap = new Map(subset.map(l => [l.id, l]))
    let curR = 0, curC = 0
    const getCell = (entry: CompositeEntry) => {
      if (isCellClipped(entry, curR, curC, clipMap, subMap)) return null
      return getEntryCell(entry, curR, curC)
    }
    for (let r = 0; r < ANSI_ROWS; r++) {
      curR = r
      for (let c = 0; c < ANSI_COLS; c++) {
        curC = c
        const result = compositeCellCore(entries, getCell, true)
        const cell = target[r][c]
        cell.char = result.char
        cell.fg[0] = result.fg[0]; cell.fg[1] = result.fg[1]; cell.fg[2] = result.fg[2]
        cell.bg[0] = result.bg[0]; cell.bg[1] = result.bg[1]; cell.bg[2] = result.bg[2]
      }
    }
    return target
  }

  function resolveReference(
    sourceLayerId: string,
    offsetRow: number,
    offsetCol: number,
    layers: { map: Map<string, L>; all: L[] },
    visited?: Set<string>,
    groupGridCache?: Map<string, AnsiGrid>,
  ): { grid: AnsiGrid; offsetRow: number; offsetCol: number } | null {
    const seen = visited ?? new Set<string>()
    let currentId = sourceLayerId
    let accRow = offsetRow
    let accCol = offsetCol

    while (currentId && seen.size < 10) {
      if (seen.has(currentId)) return null
      seen.add(currentId)
      const source = layers.map.get(currentId)
      if (!source) return null
      if (isDrawableLayer(source)) {
        return { grid: source.grid, offsetRow: accRow, offsetCol: accCol }
      }
      if (isGroupLayer(source)) {
        const cached = groupGridCache?.get(currentId)
        if (cached) return { grid: cached, offsetRow: accRow, offsetCol: accCol }
        const target = createEmptyGrid()
        const grid = compositeGroupToGridInto(target, currentId, layers, seen, groupGridCache)
        if (!grid) return null
        groupGridCache?.set(currentId, grid)
        return { grid, offsetRow: accRow, offsetCol: accCol }
      }
      if (isReferenceLayer(source)) {
        accRow += source.offsetRow
        accCol += source.offsetCol
        currentId = source.sourceLayerId
        continue
      }
      return null
    }
    return null
  }

  function buildCompositeEntries(
    layers: L[], layerMap: Map<string, L>, groupGridCache?: Map<string, AnsiGrid>,
  ): CompositeEntry[] {
    const hidden = hiddenGroupIds(layers)
    const entries: CompositeEntry[] = []

    for (const layer of layers) {
      if (layer.parentId && hidden.has(layer.parentId)) continue

      if (isDrawableLayer(layer)) {
        entries.push({
          kind: 'drawable',
          id: layer.id,
          visible: layer.visible,
          parentId: layer.parentId,
          grid: layer.grid,
        })
      } else if (isReferenceLayer(layer)) {
        const resolved = resolveReference(
          layer.sourceLayerId, layer.offsetRow, layer.offsetCol,
          { map: layerMap, all: layers }, undefined, groupGridCache,
        )
        if (resolved) {
          entries.push({
            kind: 'reference',
            id: layer.id,
            visible: layer.visible,
            parentId: layer.parentId,
            sourceGrid: resolved.grid,
            offsetRow: resolved.offsetRow,
            offsetCol: resolved.offsetCol,
          })
        }
      }
    }
    return entries
  }

  function getEntryCell(entry: CompositeEntry, row: number, col: number): AnsiCell | null {
    if (!entry.visible) return null
    if (entry.kind === 'reference') {
      const srcRow = row - entry.offsetRow
      const srcCol = col - entry.offsetCol
      if (srcRow < 0 || srcRow >= ANSI_ROWS || srcCol < 0 || srcCol >= ANSI_COLS) return null
      return entry.sourceGrid[srcRow][srcCol]
    }
    if (row < 0 || row >= ANSI_ROWS || col < 0 || col >= ANSI_COLS) return null
    return entry.grid[row][col]
  }

  return {
    hiddenGroupIds,
    collectGroupSubset,
    resolveReference,
    buildCompositeEntries,
    getEntryCell,
    compositeGroupToGridInto,
  }
}
