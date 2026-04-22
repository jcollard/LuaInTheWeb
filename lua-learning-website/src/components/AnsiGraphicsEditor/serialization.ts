import type { AnsiGrid, ClipLayer, Layer, LayerState, TextLayer, TextAlign, RGBColor, Rect, GroupLayer, ReferenceLayer } from './types'
import { DEFAULT_ANSI_COLS, DEFAULT_ANSI_ROWS, DEFAULT_FRAME_DURATION_MS, isGroupLayer, isClipLayer, isReferenceLayer } from './types'
import { renderTextLayerGrid } from './textLayerGrid'
import { buildPalette, encodeGrid, decodeGrid } from './v7Codec'
import type { Run } from './v7Codec'
import { luaStringify, luaParse } from './luaCodec'
import { DEFAULT_ANSI_FONT_ID, DEFAULT_USE_FONT_BLOCKS, normalizeAnsiFontId } from '@lua-learning/ansi-shared'

/** Extract `(cols, rows)` from a parsed file, falling back to 80×25 defaults. */
function extractDims(data: Record<string, unknown>): { cols: number; rows: number } {
  const cols = typeof data.width === 'number' && data.width > 0 ? Math.floor(data.width) : DEFAULT_ANSI_COLS
  const rows = typeof data.height === 'number' && data.height > 0 ? Math.floor(data.height) : DEFAULT_ANSI_ROWS
  return { cols, rows }
}

/** Read optional `font` / `useFontBlocks` display settings, applying defaults. */
function extractDisplaySettings(data: Record<string, unknown>): { font: string; useFontBlocks: boolean } {
  return {
    font: normalizeAnsiFontId(data.font),
    useFontBlocks: typeof data.useFontBlocks === 'boolean' ? data.useFontBlocks : DEFAULT_USE_FONT_BLOCKS,
  }
}

/** Copy non-default display settings into the serialized output map. */
function writeDisplaySettings(data: Record<string, unknown>, state: LayerState): void {
  const font = normalizeAnsiFontId(state.font)
  if (font !== DEFAULT_ANSI_FONT_ID) {
    data.font = font
  }
  if (state.useFontBlocks !== undefined && state.useFontBlocks !== DEFAULT_USE_FONT_BLOCKS) {
    data.useFontBlocks = state.useFontBlocks
  }
}

export function serializeGrid(grid: AnsiGrid): string {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const data = { version: 1, width: cols, height: rows, grid }
  return 'return ' + luaStringify(data)
}

export function deserializeGrid(lua: string): AnsiGrid {
  const stripped = lua.replace(/^return\s+/, '')
  const data = luaParse(stripped)
  if (data.version !== 1) {
    throw new Error(`Unsupported version: ${data.version}`)
  }
  if (!Array.isArray(data.grid)) {
    throw new Error('Missing grid field')
  }
  return data.grid as AnsiGrid
}

/** Apply optional parentId and tags fields common to all layer types. */
function addOptionalFields(serialized: Record<string, unknown>, layer: Layer): void {
  if (layer.parentId) serialized.parentId = layer.parentId
  if (layer.tags && layer.tags.length > 0) serialized.tags = layer.tags
}

export function serializeLayers(state: LayerState, availableTags?: string[]): string {
  // Build palette from all drawn and clip layer grids
  const allGrids: AnsiGrid[] = []
  for (const layer of state.layers) {
    if (layer.type === 'drawn') {
      for (const frame of layer.frames) {
        allGrids.push(frame)
      }
    } else if (isClipLayer(layer)) {
      allGrids.push(layer.grid)
    }
  }
  // Prefer explicit project dims from state; otherwise derive from the first
  // sized grid so the written width/height match the actual content instead
  // of silently defaulting to 80×25 when a caller forgets to thread dims.
  const firstGrid = allGrids[0]
  const cols = state.cols ?? firstGrid?.[0]?.length ?? DEFAULT_ANSI_COLS
  const rows = state.rows ?? firstGrid?.length ?? DEFAULT_ANSI_ROWS
  const { palette, colorToIndex, defaultFgIndex, defaultBgIndex } = buildPalette(allGrids)

  let hasReferenceLayer = false
  const layers = state.layers.map(layer => {
    if (isGroupLayer(layer)) {
      const serialized: Record<string, unknown> = {
        type: 'group',
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        collapsed: layer.collapsed,
      }
      addOptionalFields(serialized, layer)
      return serialized
    }
    if (isClipLayer(layer)) {
      const serialized: Record<string, unknown> = {
        type: 'clip',
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        cells: encodeGrid(layer.grid, colorToIndex),
      }
      addOptionalFields(serialized, layer)
      return serialized
    }
    if (isReferenceLayer(layer)) {
      hasReferenceLayer = true
      const serialized: Record<string, unknown> = {
        type: 'reference',
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        sourceLayerId: layer.sourceLayerId,
        offsetRow: layer.offsetRow,
        offsetCol: layer.offsetCol,
      }
      addOptionalFields(serialized, layer)
      return serialized
    }
    if (layer.type === 'text') {
      const serialized: Record<string, unknown> = {
        type: 'text',
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        text: layer.text,
        bounds: layer.bounds,
        textFg: layer.textFg,
        // grid is NOT serialized — recomputed on load
      }
      if (layer.textFgColors && layer.textFgColors.length > 0) {
        serialized.textFgColors = layer.textFgColors
      }
      if (layer.textBg) {
        serialized.textBg = layer.textBg
      }
      if (layer.textBgColors && layer.textBgColors.length > 0) {
        serialized.textBgColors = layer.textBgColors
      }
      if (layer.textAlign && layer.textAlign !== 'left') {
        serialized.textAlign = layer.textAlign
      }
      addOptionalFields(serialized, layer)
      return serialized
    }
    // Drawn layer — v7 sparse run encoding
    const serialized: Record<string, unknown> = {
      type: 'drawn',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
    }
    if (layer.frames.length > 1) {
      serialized.frameCells = layer.frames.map(frame =>
        encodeGrid(frame, colorToIndex)
      )
      serialized.currentFrameIndex = layer.currentFrameIndex
      serialized.frameDurationMs = layer.frameDurationMs
    } else {
      serialized.cells = encodeGrid(layer.grid, colorToIndex)
    }
    addOptionalFields(serialized, layer)
    return serialized
  })

  const data: Record<string, unknown> = {
    version: hasReferenceLayer ? 8 : 7,
    width: cols,
    height: rows,
    activeLayerId: state.activeLayerId,
    palette,
    defaultFg: defaultFgIndex,
    defaultBg: defaultBgIndex,
    layers,
  }
  if (availableTags && availableTags.length > 0) {
    data.availableTags = availableTags
  }
  // Only write display settings when they differ from defaults so files
  // authored without touching the picker stay byte-identical to their
  // v7/v8 predecessors on disk.
  writeDisplaySettings(data, state)
  return 'return ' + luaStringify(data)
}

interface RawLayer {
  type?: string
  id: string
  name: string
  visible: boolean
  grid?: AnsiGrid
  frames?: AnsiGrid[]
  cells?: Run[]
  frameCells?: Run[][]
  currentFrameIndex?: number
  frameDurationMs?: number
  text?: string
  bounds?: Rect
  textFg?: RGBColor
  textFgColors?: RGBColor[]
  textBg?: RGBColor
  textBgColors?: RGBColor[]
  textAlign?: string
  parentId?: string
  collapsed?: boolean
  tags?: string[]
  sourceLayerId?: string
  offsetRow?: number
  offsetCol?: number
}

/* ------------------------------------------------------------------ */
/*  Private helpers shared by v3-v6 and v7 deserialization blocks      */
/* ------------------------------------------------------------------ */

const VALID_LAYER_TYPES = new Set(['drawn', 'text', 'group', 'clip', 'reference'])

/** Validate that a raw layer has the required base fields and a known type. */
function validateRawLayer(l: RawLayer, i: number): void {
  if (!l.id || !l.name || l.visible === undefined) {
    throw new Error(`Invalid layer at index ${i}: missing required fields (id, name, visible)`)
  }
  if (l.type !== undefined && !VALID_LAYER_TYPES.has(l.type)) {
    throw new Error(`Invalid layer at index ${i}: unknown layer type "${l.type}"`)
  }
}

/** Build a GroupLayer from a validated raw layer. */
function buildGroupLayer(l: RawLayer, tags: string[] | undefined): GroupLayer {
  return {
    type: 'group',
    id: l.id,
    name: l.name,
    visible: l.visible,
    collapsed: l.collapsed ?? false,
    parentId: l.parentId,
    tags,
  }
}

/** Build a TextLayer from a validated raw layer (includes text-field validation). */
function buildTextLayer(
  l: RawLayer,
  tags: string[] | undefined,
  cols: number,
  rows: number,
): TextLayer {
  if (l.text == null || !l.bounds || !l.textFg) {
    throw new Error(`Invalid text layer "${l.name}": missing text, bounds, or textFg`)
  }
  const textFgColors = l.textFgColors && l.textFgColors.length > 0 ? l.textFgColors : undefined
  const textBg = l.textBg
  const textBgColors = l.textBgColors && l.textBgColors.length > 0 ? l.textBgColors : undefined
  const textAlign = l.textAlign as TextAlign | undefined
  return {
    type: 'text',
    id: l.id,
    name: l.name,
    visible: l.visible,
    text: l.text,
    bounds: l.bounds,
    textFg: l.textFg,
    textFgColors,
    textBg,
    textBgColors,
    textAlign,
    grid: renderTextLayerGrid(l.text, l.bounds, l.textFg, textFgColors, textAlign, textBg, textBgColors, cols, rows),
    parentId: l.parentId,
    tags,
  }
}

/** Build a ClipLayer from a validated raw layer and decoded grid. */
function buildClipLayer(l: RawLayer, grid: AnsiGrid, tags: string[] | undefined): ClipLayer {
  return {
    type: 'clip',
    id: l.id,
    name: l.name,
    visible: l.visible,
    grid,
    parentId: l.parentId,
    tags,
  }
}

/** Build a DrawnLayer from a validated raw layer and pre-loaded frames. */
function buildDrawnLayer(l: RawLayer, frames: AnsiGrid[], tags: string[] | undefined): Layer {
  const currentFrameIndex = l.currentFrameIndex ?? 0
  const grid = frames[currentFrameIndex]
  return {
    type: 'drawn' as const,
    id: l.id,
    name: l.name,
    visible: l.visible,
    grid,
    frames,
    currentFrameIndex,
    frameDurationMs: l.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
    parentId: l.parentId,
    tags,
  }
}

/** Build a ReferenceLayer from a validated raw layer. */
function buildReferenceLayer(l: RawLayer, tags: string[] | undefined): ReferenceLayer {
  if (!l.sourceLayerId) {
    throw new Error(`Invalid reference layer "${l.name}": missing sourceLayerId`)
  }
  return {
    type: 'reference',
    id: l.id,
    name: l.name,
    visible: l.visible,
    sourceLayerId: l.sourceLayerId,
    offsetRow: l.offsetRow ?? 0,
    offsetCol: l.offsetCol ?? 0,
    parentId: l.parentId,
    tags,
  }
}

export function deserializeLayers(lua: string): LayerState {
  const stripped = lua.replace(/^return\s+/, '')
  const data = luaParse(stripped)
  const version = data.version as number
  const { cols, rows } = extractDims(data)
  const { font, useFontBlocks } = extractDisplaySettings(data)

  if (version === 1) {
    if (!Array.isArray(data.grid)) {
      throw new Error('Missing grid field')
    }
    const id = 'v1-background'
    const grid = data.grid as AnsiGrid
    // v1 files predate stored dims; prefer actual grid size, fall back to extracted.
    const vCols = grid[0]?.length ?? cols
    const vRows = grid.length || rows
    return {
      layers: [{
        type: 'drawn' as const,
        id,
        name: 'Background',
        visible: true,
        grid,
        frames: [grid],
        currentFrameIndex: 0,
        frameDurationMs: DEFAULT_FRAME_DURATION_MS,
      }],
      activeLayerId: id,
      cols: vCols,
      rows: vRows,
      font,
      useFontBlocks,
    }
  }

  if (version === 2) {
    // v2 only had drawn layers (no groups or text layers)
    const rawLayers = data.layers as Array<{ id: string; name: string; visible: boolean; grid: AnsiGrid }>
    const layers: Layer[] = rawLayers.map(l => ({
      ...l, type: 'drawn' as const,
      frames: [l.grid], currentFrameIndex: 0, frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    }))
    return {
      layers,
      activeLayerId: data.activeLayerId as string,
      cols,
      rows,
      font,
      useFontBlocks,
    }
  }

  if (version === 3 || version === 4 || version === 5 || version === 6) {
    const rawLayers = data.layers as RawLayer[]
    const rawAvailableTags = data.availableTags as string[] | undefined
    const layers: Layer[] = rawLayers.map((l, i) => {
      validateRawLayer(l, i)
      const tags = l.tags && l.tags.length > 0 ? l.tags : undefined
      if (l.type === 'group') return buildGroupLayer(l, tags)
      if (l.type === 'text') return buildTextLayer(l, tags, cols, rows)
      // Drawn layer — raw grids (v3-v6)
      if (!l.grid && (!l.frames || l.frames.length === 0)) {
        throw new Error(`Invalid drawn layer "${l.name}": missing grid`)
      }
      const frames = l.frames && l.frames.length > 0 ? l.frames : [l.grid!]
      return buildDrawnLayer(l, frames, tags)
    })
    const result: LayerState = {
      layers,
      activeLayerId: data.activeLayerId as string,
      cols,
      rows,
      font,
      useFontBlocks,
    }
    if (rawAvailableTags && rawAvailableTags.length > 0) {
      result.availableTags = rawAvailableTags
    }
    return result
  }

  if (version === 7 || version === 8) {
    const rawPalette = data.palette as RGBColor[]
    const defaultFgIndex = data.defaultFg as number
    const defaultBgIndex = data.defaultBg as number
    const rawLayers = data.layers as RawLayer[]
    const rawAvailableTags = data.availableTags as string[] | undefined
    const layers: Layer[] = rawLayers.map((l, i) => {
      validateRawLayer(l, i)
      const tags = l.tags && l.tags.length > 0 ? l.tags : undefined
      if (l.type === 'group') return buildGroupLayer(l, tags)
      if (l.type === 'text') return buildTextLayer(l, tags, cols, rows)
      if (l.type === 'clip') {
        const cellRuns = Array.isArray(l.cells) ? l.cells : []
        const grid = decodeGrid(cellRuns, rawPalette, defaultFgIndex, defaultBgIndex, cols, rows)
        return buildClipLayer(l, grid, tags)
      }
      if (l.type === 'reference') return buildReferenceLayer(l, tags)
      // Drawn layer — decode v7 sparse grids
      let frames: AnsiGrid[]
      const frameCells = Array.isArray(l.frameCells) ? l.frameCells : null
      if (frameCells && frameCells.length > 0) {
        frames = frameCells.map(runs =>
          decodeGrid(Array.isArray(runs) ? runs : [], rawPalette, defaultFgIndex, defaultBgIndex, cols, rows)
        )
      } else if (l.cells !== undefined) {
        const cellRuns = Array.isArray(l.cells) ? l.cells : []
        frames = [decodeGrid(cellRuns, rawPalette, defaultFgIndex, defaultBgIndex, cols, rows)]
      } else {
        throw new Error(`Invalid drawn layer "${l.name}": missing cells or frameCells`)
      }
      return buildDrawnLayer(l, frames, tags)
    })
    const result: LayerState = {
      layers,
      activeLayerId: data.activeLayerId as string,
      cols,
      rows,
      font,
      useFontBlocks,
    }
    if (rawAvailableTags && rawAvailableTags.length > 0) {
      result.availableTags = rawAvailableTags
    }
    return result
  }

  throw new Error(`Unsupported version: ${version}`)
}
