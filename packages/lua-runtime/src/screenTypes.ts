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

export const ANSI_COLS = 80
export const ANSI_ROWS = 25

export const DEFAULT_FG: RGBColor = [170, 170, 170]
export const DEFAULT_BG: RGBColor = [0, 0, 0]

export const DEFAULT_CELL: AnsiCell = {
  char: ' ',
  fg: DEFAULT_FG,
  bg: DEFAULT_BG,
}

/** Sentinel for transparent half-pixel in HALF_BLOCK cells. */
export const TRANSPARENT_HALF: RGBColor = [-1, -1, -1]

/** Sentinel for transparent background in text layer cells. */
export const TRANSPARENT_BG: RGBColor = [-2, -2, -2]

export const HALF_BLOCK = '\u2580'

export const DEFAULT_FRAME_DURATION_MS = 100

// --- Layer interfaces ---

interface BaseLayerData {
  id: string
  name: string
  visible: boolean
  grid: AnsiGrid
  parentId?: string
}

export interface DrawnLayerData extends BaseLayerData {
  type: 'drawn'
  frames: AnsiGrid[]
  currentFrameIndex: number
  frameDurationMs: number
}

export interface TextLayerData extends BaseLayerData {
  type: 'text'
  text: string
  bounds: Rect
  textFg: RGBColor
  textFgColors?: RGBColor[]
  textAlign?: TextAlign
}

export interface GroupLayerData {
  type: 'group'
  id: string
  name: string
  visible: boolean
  collapsed: boolean
  parentId?: string
}

export type DrawableLayerData = DrawnLayerData | TextLayerData

export type LayerData = DrawnLayerData | TextLayerData | GroupLayerData

// --- Type guards ---

export function isGroupLayer(layer: LayerData): layer is GroupLayerData {
  return layer.type === 'group'
}

export function isDrawableLayer(layer: LayerData): layer is DrawableLayerData {
  return layer.type === 'drawn' || layer.type === 'text'
}

// --- Helpers ---

export function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}
