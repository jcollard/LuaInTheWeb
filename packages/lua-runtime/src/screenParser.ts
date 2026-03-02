/**
 * Parses a data table (JS object from wasmoon Lua table) into a composited AnsiGrid.
 *
 * Supports all 6 versions of the ANSI file format. Text layers without a grid
 * field are regenerated via renderTextLayerGrid(). The final grid is composited
 * from all visible layers.
 */

import type { AnsiGrid, ClipLayerData, DrawnLayerData, GroupLayerData, LayerData, RGBColor, Rect, TextAlign, TextLayerData } from './screenTypes'
import { DEFAULT_FRAME_DURATION_MS } from './screenTypes'
import { renderTextLayerGrid } from './textLayerGrid'
import { compositeGrid } from './screenCompositor'
import { decodeV7Grid, parseV7Palette } from './v7Decode'

/**
 * Raw layer shape from a Lua table (wasmoon converts tables to plain objects/arrays).
 * All fields are optional since different versions have different fields.
 */
interface RawLayer {
  type?: string
  id: string
  name: string
  visible: boolean
  grid?: AnsiGrid
  frames?: AnsiGrid[]
  cells?: unknown        // v7: sparse run-encoded grid (wasmoon format)
  frameCells?: unknown   // v7: array of sparse grids (wasmoon format)
  currentFrameIndex?: number
  frameDurationMs?: number
  text?: string
  bounds?: Rect
  textFg?: RGBColor
  textFgColors?: RGBColor[]
  textAlign?: string
  parentId?: string
  collapsed?: boolean
  tags?: unknown
}

/**
 * Convert a wasmoon Lua table (1-indexed, may be object-like) to a proper JS array.
 * Wasmoon represents Lua arrays as objects with numeric string keys starting at "1".
 */
export function luaArrayToJsArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    const obj = value as Record<string, T>
    const result: T[] = []
    let i = 1
    while (obj[i] !== undefined) {
      result.push(obj[i])
      i++
    }
    return result
  }
  return []
}

/**
 * Convert a raw grid from Lua table format to proper AnsiGrid.
 * Handles both already-array grids and object-keyed grids from wasmoon.
 */
function normalizeGrid(raw: unknown): AnsiGrid {
  const rows = luaArrayToJsArray<unknown>(raw)
  return rows.map(row => {
    const cells = luaArrayToJsArray<Record<string, unknown>>(row)
    return cells.map(cell => ({
      char: String(cell.char ?? ' '),
      fg: normalizeRgb(cell.fg),
      bg: normalizeRgb(cell.bg),
    }))
  })
}

export function normalizeRgb(raw: unknown): RGBColor {
  if (Array.isArray(raw)) return [raw[0] ?? 0, raw[1] ?? 0, raw[2] ?? 0]
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, number>
    // Lua tables from wasmoon use 1-indexed string keys ("1", "2", "3")
    if (obj[1] !== undefined) return [obj[1], obj[2] ?? 0, obj[3] ?? 0]
    return [obj[0] ?? 0, obj[1] ?? 0, obj[2] ?? 0]
  }
  return [0, 0, 0]
}

function normalizeRect(raw: unknown): Rect {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, number>
    return { r0: obj.r0 ?? 0, c0: obj.c0 ?? 0, r1: obj.r1 ?? 0, c1: obj.c1 ?? 0 }
  }
  return { r0: 0, c0: 0, r1: 0, c1: 0 }
}

function normalizeRgbArray(raw: unknown): RGBColor[] | undefined {
  if (!raw) return undefined
  const arr = luaArrayToJsArray<unknown>(raw)
  if (arr.length === 0) return undefined
  return arr.map(normalizeRgb)
}

function parseTags(raw: unknown): string[] {
  if (!raw) return []
  return luaArrayToJsArray<string>(raw).map(String)
}

function parseV1(data: Record<string, unknown>): LayerData[] {
  const grid = normalizeGrid(data.grid)
  return [{
    type: 'drawn',
    id: 'v1-background',
    name: 'Background',
    visible: true,
    grid,
    frames: [grid],
    currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    tags: [],
  }]
}

function parseV2(data: Record<string, unknown>): LayerData[] {
  const rawLayers = luaArrayToJsArray<Record<string, unknown>>(data.layers)
  return rawLayers.map((l): DrawnLayerData => {
    const grid = normalizeGrid(l.grid)
    return {
      type: 'drawn',
      id: String(l.id),
      name: String(l.name),
      visible: Boolean(l.visible),
      grid,
      frames: [grid],
      currentFrameIndex: 0,
      frameDurationMs: DEFAULT_FRAME_DURATION_MS,
      tags: [],
    }
  })
}

function parseV3to6(data: Record<string, unknown>): LayerData[] {
  const rawLayers = luaArrayToJsArray<RawLayer>(data.layers)
  return rawLayers.map((l): LayerData => {
    if (l.type === 'group') return parseGroupLayerData(l)
    if (l.type === 'text') return parseTextLayerData(l)
    if (l.type === 'clip') return parseClipLayerData(l, normalizeGrid(l.grid))

    // Drawn layer (default for v3 where type may be unset)
    const rawFrames = l.frames ? luaArrayToJsArray<unknown>(l.frames) : null
    const frames = rawFrames && rawFrames.length > 0
      ? rawFrames.map(f => normalizeGrid(f))
      : [normalizeGrid(l.grid)]
    const currentFrameIndex = l.currentFrameIndex ?? 0
    const grid = frames[currentFrameIndex] ?? frames[0]
    const drawn: DrawnLayerData = {
      type: 'drawn',
      id: l.id,
      name: l.name,
      visible: l.visible,
      grid,
      frames,
      currentFrameIndex,
      frameDurationMs: l.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
      parentId: l.parentId,
      tags: parseTags(l.tags),
    }
    return drawn
  })
}

function parseGroupLayerData(l: RawLayer): GroupLayerData {
  return {
    type: 'group',
    id: l.id,
    name: l.name,
    visible: l.visible,
    collapsed: l.collapsed ?? false,
    parentId: l.parentId,
    tags: parseTags(l.tags),
  }
}

function parseClipLayerData(l: RawLayer, grid: AnsiGrid): ClipLayerData {
  return {
    type: 'clip',
    id: l.id,
    name: l.name,
    visible: l.visible,
    grid,
    parentId: l.parentId,
    tags: parseTags(l.tags),
  }
}

function parseTextLayerData(l: RawLayer): TextLayerData {
  const bounds = normalizeRect(l.bounds)
  const textFg = normalizeRgb(l.textFg)
  const textFgColors = normalizeRgbArray(l.textFgColors)
  const textAlign = l.textAlign as TextAlign | undefined
  const grid = renderTextLayerGrid(l.text ?? '', bounds, textFg, textFgColors, textAlign)
  return {
    type: 'text',
    id: l.id,
    name: l.name,
    visible: l.visible,
    text: l.text ?? '',
    bounds,
    textFg,
    textFgColors,
    textAlign,
    grid,
    parentId: l.parentId,
    tags: parseTags(l.tags),
  }
}

function parseV7(data: Record<string, unknown>): LayerData[] {
  const palette = parseV7Palette(data.palette)
  const defaultFgIndex = Number(data.defaultFg)
  const defaultBgIndex = Number(data.defaultBg)

  const rawLayers = luaArrayToJsArray<RawLayer>(data.layers)
  return rawLayers.map((l): LayerData => {
    if (l.type === 'group') {
      return parseGroupLayerData(l)
    }

    if (l.type === 'text') {
      return parseTextLayerData(l)
    }

    if (l.type === 'clip') {
      const grid = decodeV7Grid(l.cells, palette, defaultFgIndex, defaultBgIndex)
      return parseClipLayerData(l, grid)
    }

    // Drawn layer — decode v7 sparse grids
    const rawFrameCells = l.frameCells ? luaArrayToJsArray<unknown>(l.frameCells) : null
    let frames: AnsiGrid[]
    if (rawFrameCells && rawFrameCells.length > 0) {
      frames = rawFrameCells.map(rawGrid => decodeV7Grid(rawGrid, palette, defaultFgIndex, defaultBgIndex))
    } else {
      frames = [decodeV7Grid(l.cells, palette, defaultFgIndex, defaultBgIndex)]
    }
    const currentFrameIndex = l.currentFrameIndex ?? 0
    const grid = frames[currentFrameIndex] ?? frames[0]
    return {
      type: 'drawn',
      id: l.id,
      name: l.name,
      visible: l.visible,
      grid,
      frames,
      currentFrameIndex,
      frameDurationMs: l.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
      parentId: l.parentId,
      tags: parseTags(l.tags),
    }
  })
}

/**
 * Parse a data table (from wasmoon) into an array of LayerData.
 *
 * @param data - The parsed data object (version, grid/layers, etc.)
 * @returns The parsed layers (not yet composited)
 */
export function parseScreenLayers(data: Record<string, unknown>): LayerData[] {
  const version = Number(data.version)

  if (version === 1) {
    return parseV1(data)
  } else if (version === 2) {
    return parseV2(data)
  } else if (version >= 3 && version <= 6) {
    return parseV3to6(data)
  } else if (version === 7) {
    return parseV7(data)
  } else {
    throw new Error(`Unsupported ANSI file version: ${version}`)
  }
}

/**
 * Parse a data table (from wasmoon) into a composited AnsiGrid.
 *
 * @param data - The parsed data object (version, grid/layers, etc.)
 * @returns The composited AnsiGrid ready for rendering
 */
export function parseScreenData(data: Record<string, unknown>): AnsiGrid {
  return compositeGrid(parseScreenLayers(data))
}
