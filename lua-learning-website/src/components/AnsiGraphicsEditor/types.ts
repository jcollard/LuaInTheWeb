export type RGBColor = [number, number, number]

export interface AnsiCell {
  char: string
  fg: RGBColor
  bg: RGBColor
}

export type AnsiGrid = AnsiCell[][]

export type BrushMode = 'brush' | 'pixel' | 'eraser'

export type DrawTool = 'pencil' | 'line' | 'rect-outline' | 'rect-filled' | 'flood-fill' | 'select'

export const HALF_BLOCK = '\u2580'

export interface BrushSettings {
  char: string
  fg: RGBColor
  bg: RGBColor
  mode: BrushMode
  tool: DrawTool
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

export const DEFAULT_CELL: AnsiCell = {
  char: ' ',
  fg: DEFAULT_FG,
  bg: DEFAULT_BG,
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  grid: AnsiGrid
}

export interface LayerState {
  layers: Layer[]         // ordered bottom-to-top (index 0 = bottom)
  activeLayerId: string
}

import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'

export interface UseAnsiEditorReturn {
  // Canvas state
  grid: AnsiGrid
  brush: BrushSettings
  setBrushFg: (color: RGBColor) => void
  setBrushBg: (color: RGBColor) => void
  setBrushChar: (char: string) => void
  setBrushMode: (mode: BrushMode) => void
  setTool: (tool: DrawTool) => void
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
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  toggleVisibility: (id: string) => void
  importPngAsLayer: (file: File) => Promise<void>
}

export interface UseAnsiEditorOptions {
  initialGrid?: AnsiGrid
  initialLayerState?: LayerState
}

/** Standard CGA/VGA 16-color palette matching `ansi.colors` from the Lua runtime. */
export const CGA_PALETTE: { name: string; rgb: RGBColor }[] = [
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
