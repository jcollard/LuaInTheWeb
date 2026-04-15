/**
 * Types and constants for ANSI screen compositing.
 *
 * These are independent copies of the types from the website package's
 * AnsiGraphicsEditor, since lua-runtime cannot depend on the website.
 */

export type RGBColor = [number, number, number]

export interface AnsiCell {
  char: string
  fg: RGBColor
  bg: RGBColor
}

export type AnsiGrid = AnsiCell[][]

export interface Rect {
  r0: number
  c0: number
  r1: number
  c1: number
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

// --- Constants ---

/** Default ANSI canvas width used when a screen does not specify one. */
export const DEFAULT_ANSI_COLS = 80
/** Default ANSI canvas height used when a screen does not specify one. */
export const DEFAULT_ANSI_ROWS = 25
/** @deprecated Use {@link DEFAULT_ANSI_COLS} or derive from the grid itself. */
export const ANSI_COLS = DEFAULT_ANSI_COLS
/** @deprecated Use {@link DEFAULT_ANSI_ROWS} or derive from the grid itself. */
export const ANSI_ROWS = DEFAULT_ANSI_ROWS

export const DEFAULT_FG: RGBColor = [170, 170, 170]
export const DEFAULT_BG: RGBColor = [0, 0, 0]

export const DEFAULT_CELL: AnsiCell = {
  char: ' ',
  fg: [...DEFAULT_FG] as RGBColor,
  bg: [...DEFAULT_BG] as RGBColor,
}

/** Sentinel for transparent half-pixel in HALF_BLOCK cells. */
export const TRANSPARENT_HALF: RGBColor = [-1, -1, -1]

/** Sentinel for transparent background in text layer cells. */
export const TRANSPARENT_BG: RGBColor = [-2, -2, -2]

export const HALF_BLOCK = '\u2580'

export { DEFAULT_FRAME_DURATION_MS } from '@lua-learning/ansi-shared'

// --- Layer interfaces ---

export interface BaseLayerData {
  id: string
  name: string
  visible: boolean
  parentId?: string
  tags: string[]
  runtimeOffsetRow?: number
  runtimeOffsetCol?: number
}

interface GridLayerData extends BaseLayerData {
  grid: AnsiGrid
}

export interface DrawnLayerData extends GridLayerData {
  type: 'drawn'
  frames: AnsiGrid[]
  currentFrameIndex: number
  frameDurationMs: number
}

export interface TextLayerData extends GridLayerData {
  type: 'text'
  text: string
  bounds: Rect
  textFg: RGBColor
  textFgColors?: RGBColor[]
  textBg?: RGBColor
  textBgColors?: RGBColor[]
  textAlign?: TextAlign
}

export interface GroupLayerData extends BaseLayerData {
  type: 'group'
  collapsed: boolean
}

export interface ClipLayerData extends GridLayerData {
  type: 'clip'
}

export interface ReferenceLayerData extends BaseLayerData {
  type: 'reference'
  sourceLayerId: string   // ID of the layer to reference
  offsetRow: number       // positive = shift down
  offsetCol: number       // positive = shift right
}

export type DrawableLayerData = DrawnLayerData | TextLayerData

export type LayerData = DrawnLayerData | TextLayerData | GroupLayerData | ClipLayerData | ReferenceLayerData

// --- Type guards ---

export function isGroupLayer(layer: LayerData): layer is GroupLayerData {
  return layer.type === 'group'
}

export function isDrawableLayer(layer: LayerData): layer is DrawableLayerData {
  return layer.type === 'drawn' || layer.type === 'text'
}

export function isClipLayer(layer: LayerData): layer is ClipLayerData {
  return layer.type === 'clip'
}

export function isReferenceLayer(layer: LayerData): layer is ReferenceLayerData {
  return layer.type === 'reference'
}

// --- Helpers ---

export function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

/** Return the dimensions of an AnsiGrid. */
export function gridDims(grid: AnsiGrid): { cols: number; rows: number } {
  return { rows: grid.length, cols: grid[0]?.length ?? 0 }
}

/** Create a pre-allocated empty ANSI grid. Defaults to 80×25 when dims omitted. */
export function createEmptyGrid(cols: number = DEFAULT_ANSI_COLS, rows: number = DEFAULT_ANSI_ROWS): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): AnsiCell => ({
      char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor,
    }))
  )
}

/** Create a solid-fill grid with specified character and color. Defaults to 80×25. */
export function createFillGrid(
  char: string,
  color: RGBColor,
  cols: number = DEFAULT_ANSI_COLS,
  rows: number = DEFAULT_ANSI_ROWS,
): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): AnsiCell => ({
      char, fg: [...color] as RGBColor, bg: [...color] as RGBColor,
    }))
  )
}
