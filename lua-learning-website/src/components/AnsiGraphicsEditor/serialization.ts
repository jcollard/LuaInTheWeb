import { stringify, parse } from '@kilcekru/lua-table'
import type { AnsiGrid, Layer, LayerState, TextLayer, TextAlign, RGBColor, Rect, GroupLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FRAME_DURATION_MS, isGroupLayer, isDrawableLayer } from './types'
import { renderTextLayerGrid } from './textLayerGrid'

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

function needsV5(state: LayerState): boolean {
  return state.layers.some(l => l.type === 'drawn' && l.frames.length > 1)
}

function needsV6(state: LayerState, availableTags?: string[]): boolean {
  if (availableTags && availableTags.length > 0) return true
  return state.layers.some(l => l.tags && l.tags.length > 0)
}

export function serializeLayers(state: LayerState, availableTags?: string[]): string {
  const hasGroups = state.layers.some(isGroupLayer)
  const hasParentId = state.layers.some(l => {
    if (isDrawableLayer(l) && l.parentId) return true
    if (isGroupLayer(l) && l.parentId) return true
    return false
  })
  let version = 3
  if (needsV6(state, availableTags)) version = 6
  else if (needsV5(state)) version = 5
  else if (hasGroups || hasParentId) version = 4
  const layers = state.layers.map(layer => {
    if (isGroupLayer(layer)) {
      const serialized: Record<string, unknown> = {
        type: 'group',
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        collapsed: layer.collapsed,
      }
      if (layer.parentId) serialized.parentId = layer.parentId
      if (layer.tags && layer.tags.length > 0) serialized.tags = layer.tags
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
      if (layer.parentId) serialized.parentId = layer.parentId
      if (layer.tags && layer.tags.length > 0) serialized.tags = layer.tags
      return serialized
    }
    const serialized: Record<string, unknown> = {
      type: 'drawn',
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      grid: layer.grid,
    }
    if (layer.frames.length > 1) {
      serialized.frames = layer.frames
      serialized.currentFrameIndex = layer.currentFrameIndex
      serialized.frameDurationMs = layer.frameDurationMs
    }
    if (layer.parentId) serialized.parentId = layer.parentId
    if (layer.tags && layer.tags.length > 0) serialized.tags = layer.tags
    return serialized
  })
  const data: Record<string, unknown> = {
    version,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: state.activeLayerId,
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
      if (!l.id || !l.name || l.visible === undefined) {
        throw new Error(`Invalid layer at index ${i}: missing required fields (id, name, visible)`)
      }
      const tags = l.tags && l.tags.length > 0 ? l.tags : undefined
      if (l.type === 'group') {
        const groupLayer: GroupLayer = {
          type: 'group',
          id: l.id,
          name: l.name,
          visible: l.visible,
          collapsed: l.collapsed ?? false,
          parentId: l.parentId,
          tags,
        }
        return groupLayer
      }
      if (l.type === 'text') {
        if (!l.text || !l.bounds || !l.textFg) {
          throw new Error(`Invalid text layer "${l.name}": missing text, bounds, or textFg`)
        }
        const textFgColors = l.textFgColors && l.textFgColors.length > 0 ? l.textFgColors : undefined
        const textAlign = l.textAlign as TextAlign | undefined
        const textLayer: TextLayer = {
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
        return textLayer
      }
      if (!l.grid && (!l.frames || l.frames.length === 0)) {
        throw new Error(`Invalid drawn layer "${l.name}": missing grid`)
      }
      const frames = l.frames && l.frames.length > 0 ? l.frames : [l.grid!]
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
