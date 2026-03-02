import { stringify, parse } from '@kilcekru/lua-table'
import type { AnsiGrid, Layer, LayerState, TextLayer, TextAlign, RGBColor, Rect, GroupLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FRAME_DURATION_MS, isGroupLayer } from './types'
import { renderTextLayerGrid } from './textLayerGrid'
import { buildPalette, encodeGrid, decodeGrid } from './v7Codec'
import type { Run } from './v7Codec'

export function serializeGrid(grid: AnsiGrid): string {
  const data = { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid }
  return 'return ' + stringify(data)
}

export function deserializeGrid(lua: string): AnsiGrid {
  const stripped = lua.replace(/^return\s+/, '')
  const data = parse(stripped) as Record<string, unknown>
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
  // Build palette from all drawn layer grids
  const allGrids: AnsiGrid[] = []
  for (const layer of state.layers) {
    if (layer.type === 'drawn') {
      for (const frame of layer.frames) {
        allGrids.push(frame)
      }
    }
  }
  const { palette, colorToIndex, defaultFgIndex, defaultBgIndex } = buildPalette(allGrids)

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
    version: 7,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: state.activeLayerId,
    palette,
    defaultFg: defaultFgIndex,
    defaultBg: defaultBgIndex,
    layers,
  }
  if (availableTags && availableTags.length > 0) {
    data.availableTags = availableTags
  }
  return 'return ' + stringify(data)
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
  textAlign?: string
  parentId?: string
  collapsed?: boolean
  tags?: string[]
}

/* ------------------------------------------------------------------ */
/*  Private helpers shared by v3-v6 and v7 deserialization blocks      */
/* ------------------------------------------------------------------ */

const VALID_LAYER_TYPES = new Set(['drawn', 'text', 'group'])

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
function buildTextLayer(l: RawLayer, tags: string[] | undefined): TextLayer {
  if (!l.text || !l.bounds || !l.textFg) {
    throw new Error(`Invalid text layer "${l.name}": missing text, bounds, or textFg`)
  }
  const textFgColors = l.textFgColors && l.textFgColors.length > 0 ? l.textFgColors : undefined
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
    textAlign,
    grid: renderTextLayerGrid(l.text, l.bounds, l.textFg, textFgColors, textAlign),
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

export function deserializeLayers(lua: string): LayerState {
  const stripped = lua.replace(/^return\s+/, '')
  const data = parse(stripped) as Record<string, unknown>
  const version = data.version as number

  if (version === 1) {
    if (!Array.isArray(data.grid)) {
      throw new Error('Missing grid field')
    }
    const id = 'v1-background'
    const grid = data.grid as AnsiGrid
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
    }
  }

  if (version === 3 || version === 4 || version === 5 || version === 6) {
    const rawLayers = data.layers as RawLayer[]
    const rawAvailableTags = data.availableTags as string[] | undefined
    const layers: Layer[] = rawLayers.map((l, i) => {
      validateRawLayer(l, i)
      const tags = l.tags && l.tags.length > 0 ? l.tags : undefined
      if (l.type === 'group') return buildGroupLayer(l, tags)
      if (l.type === 'text') return buildTextLayer(l, tags)
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
    }
    if (rawAvailableTags && rawAvailableTags.length > 0) {
      result.availableTags = rawAvailableTags
    }
    return result
  }

  if (version === 7) {
    const rawPalette = data.palette as RGBColor[]
    const defaultFgIndex = data.defaultFg as number
    const defaultBgIndex = data.defaultBg as number
    const rawLayers = data.layers as RawLayer[]
    const rawAvailableTags = data.availableTags as string[] | undefined
    const layers: Layer[] = rawLayers.map((l, i) => {
      validateRawLayer(l, i)
      const tags = l.tags && l.tags.length > 0 ? l.tags : undefined
      if (l.type === 'group') return buildGroupLayer(l, tags)
      if (l.type === 'text') return buildTextLayer(l, tags)
      // Drawn layer — decode v7 sparse grids
      let frames: AnsiGrid[]
      const frameCells = Array.isArray(l.frameCells) ? l.frameCells : null
      if (frameCells && frameCells.length > 0) {
        frames = frameCells.map(runs =>
          decodeGrid(Array.isArray(runs) ? runs : [], rawPalette, defaultFgIndex, defaultBgIndex)
        )
      } else if (l.cells !== undefined) {
        const cellRuns = Array.isArray(l.cells) ? l.cells : []
        frames = [decodeGrid(cellRuns, rawPalette, defaultFgIndex, defaultBgIndex)]
      } else {
        throw new Error(`Invalid drawn layer "${l.name}": missing cells or frameCells`)
      }
      return buildDrawnLayer(l, frames, tags)
    })
    const result: LayerState = {
      layers,
      activeLayerId: data.activeLayerId as string,
    }
    if (rawAvailableTags && rawAvailableTags.length > 0) {
      result.availableTags = rawAvailableTags
    }
    return result
  }

  throw new Error(`Unsupported version: ${version}`)
}
