/**
 * Swipe transition renderer using the proven terminalBuffer.ts pattern.
 *
 * Key rendering rules (from the working ANSI editor):
 * 1. Explicit cursor position per cell
 * 2. Explicit fg + bg color per cell
 * 3. \x1b[0m reset after every character
 * 4. All cells batched into ONE string, ONE handle.write() call
 * 5. Shadow buffer tracks what's on screen — only write changed cells
 */

import type { AnsiGrid, AnsiCell, RGBColor } from './screenTypes'
import { ANSI_ROWS, ANSI_COLS } from './screenTypes'

/** Sentinel cell that never matches any real cell, forcing first diff to write everything. */
const SENTINEL: AnsiCell = { char: '\x00', fg: [-1, -1, -1], bg: [-1, -1, -1] }

function cellsEqual(a: AnsiCell, b: AnsiCell): boolean {
  return a.char === b.char
    && a.fg[0] === b.fg[0] && a.fg[1] === b.fg[1] && a.fg[2] === b.fg[2]
    && a.bg[0] === b.bg[0] && a.bg[1] === b.bg[1] && a.bg[2] === b.bg[2]
}

/**
 * Format a single cell for xterm.js — matches terminalBuffer.ts exactly.
 * cursor position + fg + bg + char + reset
 */
export function formatCell(row: number, col: number, fg: RGBColor, bg: RGBColor, char: string): string {
  return `\x1b[${row + 1};${col + 1}H\x1b[38;2;${fg[0]};${fg[1]};${fg[2]}m\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m${char}\x1b[0m`
}

/** Create a sentinel grid (forces first diff to write all cells). */
export function createSentinelGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, (): AnsiCell => ({
      char: SENTINEL.char, fg: [...SENTINEL.fg] as RGBColor, bg: [...SENTINEL.bg] as RGBColor,
    }))
  )
}

/**
 * Build the desired grid for the current swipe progress.
 * Columns < boundaryCol show target, columns >= boundaryCol show source.
 * Mutates output grid in place.
 */
export function buildSwipeGrid(target: AnsiGrid, source: AnsiGrid, boundaryCol: number, output: AnsiGrid): void {
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const src = c < boundaryCol ? target[r][c] : source[r][c]
      const out = output[r][c]
      out.char = src.char
      out.fg[0] = src.fg[0]; out.fg[1] = src.fg[1]; out.fg[2] = src.fg[2]
      out.bg[0] = src.bg[0]; out.bg[1] = src.bg[1]; out.bg[2] = src.bg[2]
    }
  }
}

/**
 * Diff desired grid against shadow, return batch string for changed cells.
 * Uses the proven formatCell pattern (cursor + colors + char + reset per cell).
 * Returns null if no cells changed.
 */
export function renderSwipeDiff(desired: AnsiGrid, shadow: AnsiGrid): string | null {
  let batch = ''
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const d = desired[r][c]
      const s = shadow[r][c]
      if (cellsEqual(d, s)) continue
      batch += formatCell(r, c, d.fg, d.bg, d.char)
    }
  }
  return batch.length > 0 ? batch : null
}

/**
 * Update shadow grid to match desired grid (deep copy of cell values).
 */
export function updateShadow(desired: AnsiGrid, shadow: AnsiGrid): void {
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const d = desired[r][c]
      const s = shadow[r][c]
      s.char = d.char
      s.fg[0] = d.fg[0]; s.fg[1] = d.fg[1]; s.fg[2] = d.fg[2]
      s.bg[0] = d.bg[0]; s.bg[1] = d.bg[1]; s.bg[2] = d.bg[2]
    }
  }
}
