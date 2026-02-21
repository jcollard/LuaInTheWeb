import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'

export type RGBColor = [number, number, number]

export interface AnsiCell {
  char: string
  fg: RGBColor
  bg: RGBColor
}

export type AnsiGrid = AnsiCell[][]

export type BrushMode = 'brush' | 'pixel' | 'blend-pixel' | 'eraser'

export type DrawTool = 'pencil' | 'line' | 'rect-outline' | 'rect-filled' | 'oval-outline' | 'oval-filled' | 'border' | 'flood-fill' | 'select' | 'eyedropper' | 'text' | 'move'

export interface BorderStyle {
  tl: string
  t: string
  tr: string
  l: string
  r: string
  bl: string
  b: string
  br: string
}

export function borderStyleEqual(a: BorderStyle, b: BorderStyle): boolean {
  return a.tl === b.tl && a.t === b.t && a.tr === b.tr && a.l === b.l
    && a.r === b.r && a.bl === b.bl && a.b === b.b && a.br === b.br
}

export const BORDER_PRESETS: { name: string; style: BorderStyle }[] = [
  { name: 'ASCII',   style: { tl: '+', t: '-', tr: '+', l: '|', r: '|', bl: '+', b: '-', br: '+' } },
  { name: 'Single',  style: { tl: '┌', t: '─', tr: '┐', l: '│', r: '│', bl: '└', b: '─', br: '┘' } },
  { name: 'Double',  style: { tl: '╔', t: '═', tr: '╗', l: '║', r: '║', bl: '╚', b: '═', br: '╝' } },
  { name: 'Rounded', style: { tl: '╭', t: '─', tr: '╮', l: '│', r: '│', bl: '╰', b: '─', br: '╯' } },
  { name: 'Heavy',   style: { tl: '┏', t: '━', tr: '┓', l: '┃', r: '┃', bl: '┗', b: '━', br: '┛' } },
]

export const HALF_BLOCK = '\u2580'

export const DEFAULT_BLEND_RATIO = 0.25

export interface BrushSettings {
  char: string
  fg: RGBColor
  bg: RGBColor
  mode: BrushMode
  tool: DrawTool
  borderStyle?: BorderStyle
  blendRatio?: number  // 0..1, defaults to DEFAULT_BLEND_RATIO
}

export const ANSI_COLS = 80
export const ANSI_ROWS = 25

export const DEFAULT_FG: RGBColor = [170, 170, 170]
export const DEFAULT_BG: RGBColor = [0, 0, 0]

/**
 * Sentinel value marking a transparent half-pixel in HALF_BLOCK cells.
 * Uses values outside valid RGB range so it cannot be confused with any
 * real color (including black).  Must never reach rendering code — the
 * compositing layer resolves it to DEFAULT_BG before output.
 */
export const TRANSPARENT_HALF: RGBColor = [-1, -1, -1]

/**
 * Sentinel value marking a transparent background in text layer cells.
 * Text layer characters use this so the background from layers below shows through.
 * Must never reach rendering code — the compositing layer resolves it before output.
 */
export const TRANSPARENT_BG: RGBColor = [-2, -2, -2]

export const DEFAULT_CELL: AnsiCell = {
  char: ' ',
  fg: DEFAULT_FG,
  bg: DEFAULT_BG,
}

export interface Rect {
  r0: number
  c0: number
  r1: number
  c1: number
}

interface BaseLayer {
  id: string
  name: string
  visible: boolean
  grid: AnsiGrid
  parentId?: string
}

export const DEFAULT_FRAME_DURATION_MS = 100
export const MIN_FRAME_DURATION_MS = 16
export const MAX_FRAME_DURATION_MS = 10000

export interface DrawnLayer extends BaseLayer {
  type: 'drawn'
  frames: AnsiGrid[]
  currentFrameIndex: number
  frameDurationMs: number
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  bounds: Rect
  textFg: RGBColor
  textFgColors?: RGBColor[]
  textAlign?: TextAlign
}

export interface GroupLayer {
  type: 'group'
  id: string
  name: string
  visible: boolean
  collapsed: boolean
  parentId?: string
}

export type DrawableLayer = DrawnLayer | TextLayer

export type Layer = DrawnLayer | TextLayer | GroupLayer

export function isGroupLayer(layer: Layer): layer is GroupLayer {
  return layer.type === 'group'
}

export function isDrawableLayer(layer: Layer): layer is DrawableLayer {
  return layer.type === 'drawn' || layer.type === 'text'
}

/** Extract parentId from any Layer variant. All layer types carry an optional parentId. */
export function getParentId(layer: Layer): string | undefined {
  if (isGroupLayer(layer)) return layer.parentId
  if (isDrawableLayer(layer)) return layer.parentId
  return undefined
}

export interface LayerState {
  layers: Layer[]         // ordered bottom-to-top (index 0 = bottom)
  activeLayerId: string
}

export interface UseAnsiEditorReturn {
  // Canvas state
  grid: AnsiGrid
  brush: BrushSettings
  setBrushFg: (color: RGBColor) => void
  setBrushBg: (color: RGBColor) => void
  setBrushChar: (char: string) => void
  setBrushMode: (mode: BrushMode) => void
  setBlendRatio: (ratio: number) => void
  setTool: (tool: DrawTool) => void
  setBorderStyle: (style: BorderStyle) => void
  clearGrid: () => void
  // Persistence
  isDirty: boolean
  markClean: () => void
  isSaveDialogOpen: boolean
  openSaveDialog: () => void
  closeSaveDialog: () => void
  // Terminal
  onTerminalReady: (handle: AnsiTerminalHandle | null) => void
  cursorRef: React.RefObject<HTMLDivElement | null>
  dimensionRef: React.RefObject<HTMLDivElement | null>
  selectionRef: React.RefObject<HTMLDivElement | null>
  textBoundsRef: React.RefObject<HTMLDivElement | null>
  textCursorRef: React.RefObject<HTMLDivElement | null>
  // History
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  // Layers
  layers: Layer[]
  activeLayerId: string
  addLayer: () => void
  removeLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setActiveLayer: (id: string) => void
  reorderLayer: (id: string, newIndex: number, targetGroupId?: string | null) => void
  toggleVisibility: (id: string) => void
  mergeDown: (id: string) => void
  wrapInGroup: (layerId: string) => void
  removeFromGroup: (layerId: string) => void
  duplicateLayer: (id: string) => void
  toggleGroupCollapsed: (groupId: string) => void
  importPngAsLayer: (file: File) => Promise<void>
  simplifyColors: (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => void
  setTextAlign: (align: TextAlign) => void
  flipSelectionHorizontal: () => void
  flipSelectionVertical: () => void
  // Move tool
  activeLayerIsGroup: boolean
  isMoveDragging: boolean
  // CGA Preview
  cgaPreview: boolean
  setCgaPreview: (on: boolean) => void
  // Frame animation
  addFrame: () => void
  duplicateFrame: () => void
  removeFrame: () => void
  setCurrentFrame: (index: number) => void
  reorderFrame: (from: number, to: number) => void
  setFrameDuration: (ms: number) => void
  isPlaying: boolean
  togglePlayback: () => void
  activeLayerFrameCount: number
  activeLayerCurrentFrame: number
  activeLayerFrameDuration: number
}

export interface UseAnsiEditorOptions {
  initialGrid?: AnsiGrid
  initialLayerState?: LayerState
  onSave?: () => void
  onSaveAs?: () => void
  onOpenFileMenu?: () => void
  onShowToast?: (message: string) => void
}

export type StaticPaletteType = 'cga' | 'ega' | 'vga'
export type PaletteType = StaticPaletteType | 'current' | 'layer'

export interface PaletteEntry {
  name: string
  rgb: RGBColor
}

/** Standard CGA/VGA 16-color palette matching `ansi.colors` from the Lua runtime. */
export const CGA_PALETTE: PaletteEntry[] = [
  { name: 'Black',          rgb: [0, 0, 0] },
  { name: 'Blue',           rgb: [0, 0, 170] },
  { name: 'Green',          rgb: [0, 170, 0] },
  { name: 'Cyan',           rgb: [0, 170, 170] },
  { name: 'Red',            rgb: [170, 0, 0] },
  { name: 'Magenta',        rgb: [170, 0, 170] },
  { name: 'Brown',          rgb: [170, 85, 0] },
  { name: 'Light Gray',     rgb: [170, 170, 170] },
  { name: 'Dark Gray',      rgb: [85, 85, 85] },
  { name: 'Bright Blue',    rgb: [85, 85, 255] },
  { name: 'Bright Green',   rgb: [85, 255, 85] },
  { name: 'Bright Cyan',    rgb: [85, 255, 255] },
  { name: 'Bright Red',     rgb: [255, 85, 85] },
  { name: 'Bright Magenta', rgb: [255, 85, 255] },
  { name: 'Yellow',         rgb: [255, 255, 85] },
  { name: 'White',          rgb: [255, 255, 255] },
]

/** EGA 64-color palette: 4 intensity levels (0, 85, 170, 255) per channel. */
export const EGA_PALETTE: PaletteEntry[] = (() => {
  const levels = [0, 85, 170, 255]
  const entries: PaletteEntry[] = []
  for (const r of levels) {
    for (const g of levels) {
      for (const b of levels) {
        entries.push({ name: `rgb(${r},${g},${b})`, rgb: [r, g, b] })
      }
    }
  }
  return entries
})()

/** VGA 256-color palette: 16 CGA + 216 color cube (6x6x6) + 24 grayscale. */
export const VGA_PALETTE: PaletteEntry[] = (() => {
  const entries: PaletteEntry[] = CGA_PALETTE.map(e => ({ ...e }))
  // 216 color cube: 6 levels per channel
  const cubeLevels = [0, 51, 102, 153, 204, 255]
  for (const r of cubeLevels) {
    for (const g of cubeLevels) {
      for (const b of cubeLevels) {
        entries.push({ name: `rgb(${r},${g},${b})`, rgb: [r, g, b] })
      }
    }
  }
  // 24 grayscale ramp (8..238 in steps of 10)
  for (let i = 0; i < 24; i++) {
    const v = 8 + i * 10
    entries.push({ name: `gray(${v})`, rgb: [v, v, v] })
  }
  return entries
})()

export const PALETTES: Record<StaticPaletteType, PaletteEntry[]> = {
  cga: CGA_PALETTE,
  ega: EGA_PALETTE,
  vga: VGA_PALETTE,
}
