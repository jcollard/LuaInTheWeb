/**
 * V7 ANSI file format codec: palette building, sparse run encoding, and decoding.
 *
 * Provides 20-40x size reduction over v3-v6 by:
 * 1. Color palette — deduplicates RGB colors into a file-level array
 * 2. Sparse encoding — omits default cells (space + DEFAULT_FG + DEFAULT_BG)
 * 3. Run encoding — compresses consecutive cells with shared attributes
 */

import type { AnsiGrid, RGBColor } from './types'
import { DEFAULT_ANSI_COLS, DEFAULT_ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import { isDefaultCell, rgbEqual } from './layerUtils'

export interface PaletteResult {
  palette: RGBColor[]
  colorToIndex: Map<string, number>
  defaultFgIndex: number
  defaultBgIndex: number
}

/** Produce a canonical string key for an RGB color. */
export function colorKey(c: RGBColor): string {
  return `${c[0]},${c[1]},${c[2]}`
}

/**
 * Build a color palette from all grids.
 * DEFAULT_FG and DEFAULT_BG are guaranteed to be the first two entries.
 * Returns 1-based indices (Lua convention).
 */
export function buildPalette(grids: AnsiGrid[]): PaletteResult {
  const colorToIndex = new Map<string, number>()
  const palette: RGBColor[] = []

  function addColor(c: RGBColor): void {
    const key = colorKey(c)
    if (!colorToIndex.has(key)) {
      colorToIndex.set(key, palette.length + 1) // 1-based
      palette.push(c)
    }
  }

  addColor(DEFAULT_FG)
  addColor(DEFAULT_BG)

  for (const grid of grids) {
    for (const row of grid) {
      for (const cell of row) {
        addColor(cell.fg)
        addColor(cell.bg)
      }
    }
  }

  return {
    palette,
    colorToIndex,
    defaultFgIndex: colorToIndex.get(colorKey(DEFAULT_FG))!,
    defaultBgIndex: colorToIndex.get(colorKey(DEFAULT_BG))!,
  }
}

/** 5-element run: single cell (char length 1) or text run (char length > 1). */
export type Run5 = [number, number, string, number, number]
/** 6-element run: repeat run [row, col, count, char, fgIdx, bgIdx]. */
export type Run6 = [number, number, number, string, number, number]
/** Any run type (discriminated by tuple length). */
export type Run = Run5 | Run6

/**
 * Encode a grid into sparse run-encoded tuples.
 * Default cells (space + DEFAULT_FG + DEFAULT_BG) are omitted.
 * Row/col are 1-based (Lua convention).
 *
 * Greedy strategy per non-default cell:
 * 1. Repeat run: identical char+fg+bg (min length 2)
 * 2. Text run: same fg+bg, varying chars (min length 2; breaks on repeat opportunities)
 * 3. Single cell
 */
export function encodeGrid(
  grid: AnsiGrid,
  colorToIndex: Map<string, number>,
): Run[] {
  const runs: Run[] = []

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    let c = 0

    while (c < row.length) {
      const cell = row[c]
      if (isDefaultCell(cell)) { c++; continue }

      const fgIdx = colorToIndex.get(colorKey(cell.fg))!
      const bgIdx = colorToIndex.get(colorKey(cell.bg))!

      // 1. Try repeat run (min length 2)
      let repeatLen = 1
      while (c + repeatLen < row.length) {
        const next = row[c + repeatLen]
        if (next.char === cell.char && rgbEqual(next.fg, cell.fg) && rgbEqual(next.bg, cell.bg)) {
          repeatLen++
        } else {
          break
        }
      }

      if (repeatLen >= 2) {
        runs.push([r + 1, c + 1, repeatLen, cell.char, fgIdx, bgIdx] as Run6)
        c += repeatLen
        continue
      }

      // 2. Try text run (min length 2)
      let textLen = 1
      while (c + textLen < row.length) {
        const next = row[c + textLen]
        if (isDefaultCell(next)) break
        if (!rgbEqual(next.fg, cell.fg) || !rgbEqual(next.bg, cell.bg)) break
        // Break if a repeat opportunity of 2+ appears at this position
        if (c + textLen + 1 < row.length) {
          const afterNext = row[c + textLen + 1]
          if (next.char === afterNext.char &&
              rgbEqual(next.fg, afterNext.fg) && rgbEqual(next.bg, afterNext.bg)) {
            break
          }
        }
        textLen++
      }

      if (textLen >= 2) {
        const text = row.slice(c, c + textLen).map(cl => cl.char).join('')
        runs.push([r + 1, c + 1, text, fgIdx, bgIdx] as Run5)
        c += textLen
        continue
      }

      // 3. Single cell
      runs.push([r + 1, c + 1, cell.char, fgIdx, bgIdx] as Run5)
      c++
    }
  }

  return runs
}

/** Check that a 1-based palette index is within bounds. */
function isValidPaletteIndex(idx: number, palette: RGBColor[]): boolean {
  return idx >= 1 && idx <= palette.length
}

/**
 * Decode sparse run-encoded tuples into a grid of the given dimensions.
 * Defaults to 80×25 when `cols` / `rows` are omitted (legacy callers).
 * Empty runs array = fully default grid.
 */
export function decodeGrid(
  runs: Run[],
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

  const defaultFg = palette[defaultFgIndex - 1]
  const defaultBg = palette[defaultBgIndex - 1]

  const grid: AnsiGrid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      char: ' ',
      fg: [...defaultFg] as RGBColor,
      bg: [...defaultBg] as RGBColor,
    }))
  )

  // Handle empty Lua tables parsed as {} (empty object) by @kilcekru/lua-table
  if (!Array.isArray(runs) || runs.length === 0) return grid

  for (const run of runs) {
    if (run.length === 6) {
      // Repeat run: [row, col, count, char, fgIdx, bgIdx]
      const [row, col, count, char, fgIdx, bgIdx] = run
      if (!isValidPaletteIndex(fgIdx, palette) || !isValidPaletteIndex(bgIdx, palette)) continue
      if (row < 1 || row > rows) continue
      const fg = palette[fgIdx - 1]
      const bg = palette[bgIdx - 1]
      for (let i = 0; i < count; i++) {
        const c = col - 1 + i
        if (c >= 0 && c < cols) {
          grid[row - 1][c] = { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
        }
      }
    } else {
      // Single cell or text run: [row, col, charOrText, fgIdx, bgIdx]
      const [row, col, charOrText, fgIdx, bgIdx] = run
      if (!isValidPaletteIndex(fgIdx, palette) || !isValidPaletteIndex(bgIdx, palette)) continue
      if (row < 1 || row > rows) continue
      const fg = palette[fgIdx - 1]
      const bg = palette[bgIdx - 1]

      if (charOrText.length > 1) {
        // Text run
        for (let i = 0; i < charOrText.length; i++) {
          const c = col - 1 + i
          if (c >= 0 && c < cols) {
            grid[row - 1][c] = { char: charOrText[i], fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
          }
        }
      } else {
        // Single cell
        const c = col - 1
        if (c >= 0 && c < cols) {
          grid[row - 1][c] = { char: charOrText, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
        }
      }
    }
  }

  return grid
}
