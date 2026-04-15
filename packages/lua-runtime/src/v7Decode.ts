/**
 * V7 ANSI file format decoder for the runtime (wasmoon format).
 *
 * Handles wasmoon's 1-indexed object format where Lua tables become
 * JS objects with numeric string keys: {1: val1, 2: val2, ...}.
 */

import type { AnsiGrid, RGBColor } from './screenTypes'
import { DEFAULT_ANSI_COLS, DEFAULT_ANSI_ROWS } from './screenTypes'
import { luaArrayToJsArray, normalizeRgb } from './screenParser'

/**
 * Parse a v7 palette from wasmoon format.
 * Input: Lua table {1: {1:R, 2:G, 3:B}, 2: {1:R, 2:G, 3:B}, ...}
 */
export function parseV7Palette(raw: unknown): RGBColor[] {
  return luaArrayToJsArray<unknown>(raw).map(normalizeRgb)
}

/** Build a default ANSI grid filled with the given fg/bg colors. */
function makeDefaultGrid(fg: RGBColor, bg: RGBColor, cols: number, rows: number): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      char: ' ',
      fg: [...fg] as RGBColor,
      bg: [...bg] as RGBColor,
    }))
  )
}

/** Check that a 1-based palette index is within bounds. */
function isValidPaletteIndex(idx: number, palette: RGBColor[]): boolean {
  return idx >= 1 && idx <= palette.length
}

/** Write a cell into the grid if within bounds (1-based row/col). */
function setCell(
  grid: AnsiGrid,
  row1: number,
  col1: number,
  char: string,
  fg: RGBColor,
  bg: RGBColor,
  cols: number,
  rows: number,
): void {
  const r = row1 - 1
  const c = col1 - 1
  if (r >= 0 && r < rows && c >= 0 && c < cols) {
    grid[r][c] = { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
  }
}

/**
 * Decode a v7 sparse run-encoded grid from wasmoon format.
 * `cols`/`rows` default to 80×25 when omitted (legacy callers).
 *
 * Run disambiguation:
 * - 6 elements: repeat run [row, col, count, char, fgIdx, bgIdx]
 * - 5 elements, string[2] length > 1: text run [row, col, text, fgIdx, bgIdx]
 * - 5 elements, string[2] length = 1: single cell [row, col, char, fgIdx, bgIdx]
 */
export function decodeV7Grid(
  rawRuns: unknown,
  palette: RGBColor[],
  defaultFgIndex: number,
  defaultBgIndex: number,
  cols: number = DEFAULT_ANSI_COLS,
  rows: number = DEFAULT_ANSI_ROWS,
): AnsiGrid {
  if (!isValidPaletteIndex(defaultFgIndex, palette)) {
    throw new RangeError(`defaultFgIndex ${defaultFgIndex} out of palette bounds [1..${palette.length}]`)
  }
  if (!isValidPaletteIndex(defaultBgIndex, palette)) {
    throw new RangeError(`defaultBgIndex ${defaultBgIndex} out of palette bounds [1..${palette.length}]`)
  }

  const grid = makeDefaultGrid(palette[defaultFgIndex - 1], palette[defaultBgIndex - 1], cols, rows)

  const runs = luaArrayToJsArray<unknown>(rawRuns)
  if (runs.length === 0) return grid

  for (const rawRun of runs) {
    const el = luaArrayToJsArray<unknown>(rawRun)
    const row = Number(el[0])
    const col = Number(el[1])

    if (el.length === 6) {
      // Repeat run: [row, col, count, char, fgIdx, bgIdx]
      const fgIdx = Number(el[4])
      const bgIdx = Number(el[5])
      if (!isValidPaletteIndex(fgIdx, palette) || !isValidPaletteIndex(bgIdx, palette)) continue
      const count = Number(el[2])
      const char = String(el[3])
      const fg = palette[fgIdx - 1]
      const bg = palette[bgIdx - 1]
      for (let i = 0; i < count; i++) {
        setCell(grid, row, col + i, char, fg, bg, cols, rows)
      }
    } else if (el.length === 5) {
      // Single cell or text run
      const fgIdx = Number(el[3])
      const bgIdx = Number(el[4])
      if (!isValidPaletteIndex(fgIdx, palette) || !isValidPaletteIndex(bgIdx, palette)) continue
      const charOrText = String(el[2])
      const fg = palette[fgIdx - 1]
      const bg = palette[bgIdx - 1]

      if (charOrText.length > 1) {
        for (let i = 0; i < charOrText.length; i++) {
          setCell(grid, row, col + i, charOrText[i], fg, bg, cols, rows)
        }
      } else {
        setCell(grid, row, col, charOrText, fg, bg, cols, rows)
      }
    }
  }

  return grid
}
