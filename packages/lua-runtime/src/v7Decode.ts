/**
 * V7 ANSI file format decoder for the runtime (wasmoon format).
 *
 * Handles wasmoon's 1-indexed object format where Lua tables become
 * JS objects with numeric string keys: {1: val1, 2: val2, ...}.
 */

import type { AnsiGrid, RGBColor } from './screenTypes'
import { ANSI_COLS, ANSI_ROWS } from './screenTypes'
import { luaArrayToJsArray, normalizeRgb } from './screenParser'

/**
 * Parse a v7 palette from wasmoon format.
 * Input: Lua table {1: {1:R, 2:G, 3:B}, 2: {1:R, 2:G, 3:B}, ...}
 */
export function parseV7Palette(raw: unknown): RGBColor[] {
  return luaArrayToJsArray<unknown>(raw).map(normalizeRgb)
}

/**
 * Decode a v7 sparse run-encoded grid from wasmoon format.
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
): AnsiGrid {
  const defaultFg = palette[defaultFgIndex - 1]
  const defaultBg = palette[defaultBgIndex - 1]

  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...defaultFg] as RGBColor,
      bg: [...defaultBg] as RGBColor,
    }))
  )

  const runs = luaArrayToJsArray<unknown>(rawRuns)
  if (runs.length === 0) return grid

  for (const rawRun of runs) {
    const el = luaArrayToJsArray<unknown>(rawRun)

    if (el.length === 6) {
      // Repeat run: [row, col, count, char, fgIdx, bgIdx]
      const row = Number(el[0])
      const col = Number(el[1])
      const count = Number(el[2])
      const char = String(el[3])
      const fg = palette[Number(el[4]) - 1]
      const bg = palette[Number(el[5]) - 1]
      for (let i = 0; i < count; i++) {
        const c = col - 1 + i
        if (c < ANSI_COLS && row - 1 < ANSI_ROWS) {
          grid[row - 1][c] = { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
        }
      }
    } else if (el.length === 5) {
      // Single cell or text run
      const row = Number(el[0])
      const col = Number(el[1])
      const charOrText = String(el[2])
      const fg = palette[Number(el[3]) - 1]
      const bg = palette[Number(el[4]) - 1]

      if (charOrText.length > 1) {
        // Text run
        for (let i = 0; i < charOrText.length; i++) {
          const c = col - 1 + i
          if (c < ANSI_COLS && row - 1 < ANSI_ROWS) {
            grid[row - 1][c] = { char: charOrText[i], fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
          }
        }
      } else {
        // Single cell
        if (col - 1 < ANSI_COLS && row - 1 < ANSI_ROWS) {
          grid[row - 1][col - 1] = { char: charOrText, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
        }
      }
    }
  }

  return grid
}
