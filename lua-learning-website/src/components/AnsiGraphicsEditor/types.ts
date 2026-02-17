/**
 * Data model and constants for the ANSI Graphics Editor.
 *
 * The editor maintains its own backing cell buffer (AnsiGrid) as the
 * source of truth. xterm.js is used purely as a render target — we
 * write escape sequences to it but never read cell data back.
 */

export type RGBColor = [number, number, number]

export interface AnsiCell {
  char: string
  fg: RGBColor
  bg: RGBColor
}

/**
 * Backing buffer: 25 rows x 80 cols, 0-based indexing.
 * This is the authoritative state for all cell data.
 */
export type AnsiGrid = AnsiCell[][]

export interface BrushSettings {
  char: string
  fg: RGBColor
  bg: RGBColor
}

export const ANSI_COLS = 80
export const ANSI_ROWS = 25

export const DEFAULT_FG: RGBColor = [170, 170, 170]
export const DEFAULT_BG: RGBColor = [0, 0, 0]

export const DEFAULT_CELL: AnsiCell = {
  char: ' ',
  fg: DEFAULT_FG,
  bg: DEFAULT_BG,
}

/**
 * Standard CGA/VGA 16-color palette matching `ansi.colors` from the Lua runtime.
 * Layout: dark row (0-7) then bright row (8-15).
 */
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
