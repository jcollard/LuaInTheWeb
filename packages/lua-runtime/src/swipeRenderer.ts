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

export type SwipeDirection = 'right' | 'left' | 'down' | 'up' | 'down-right' | 'down-left' | 'up-right' | 'up-left'

/**
 * Build the desired grid for the current swipe progress and direction.
 * Cells past the sweep boundary show target, others show source.
 * Mutates output grid in place.
 */
export function buildSwipeGrid(target: AnsiGrid, source: AnsiGrid, progress: number, direction: SwipeDirection, output: AnsiGrid): void {
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const showTarget = isSwiped(r, c, progress, direction)
      const src = showTarget ? target[r][c] : source[r][c]
      const out = output[r][c]
      out.char = src.char
      out.fg[0] = src.fg[0]; out.fg[1] = src.fg[1]; out.fg[2] = src.fg[2]
      out.bg[0] = src.bg[0]; out.bg[1] = src.bg[1]; out.bg[2] = src.bg[2]
    }
  }
}

function isSwiped(r: number, c: number, t: number, dir: SwipeDirection): boolean {
  if (t <= 0) return false
  if (t >= 1) return true
  switch (dir) {
    case 'right': return c < t * ANSI_COLS
    case 'left': return c >= (1 - t) * ANSI_COLS
    case 'down': return r < t * ANSI_ROWS
    case 'up': return r >= (1 - t) * ANSI_ROWS
    case 'down-right': return (r / ANSI_ROWS + c / ANSI_COLS) / 2 < t
    case 'up-left': return ((ANSI_ROWS - 1 - r) / ANSI_ROWS + (ANSI_COLS - 1 - c) / ANSI_COLS) / 2 < t
    case 'down-left': return (r / ANSI_ROWS + (ANSI_COLS - 1 - c) / ANSI_COLS) / 2 < t
    case 'up-right': return ((ANSI_ROWS - 1 - r) / ANSI_ROWS + c / ANSI_COLS) / 2 < t
  }
}

/** Mulberry32 PRNG — fast, deterministic, 32-bit state. */
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate shuffled cell indices [0..ROWS*COLS-1] using seeded Fisher-Yates. */
export function generateDitherOrder(seed: number): number[] {
  const total = ANSI_ROWS * ANSI_COLS
  const order = Array.from({ length: total }, (_, i) => i)
  const rng = mulberry32(seed)
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp
  }
  return order
}

/**
 * Build desired grid for dither transition at given progress.
 * First floor(total * progress) cells in ditherOrder show target, rest show source.
 */
export function buildDitherGrid(target: AnsiGrid, source: AnsiGrid, progress: number, ditherOrder: number[], output: AnsiGrid): void {
  const t = progress < 0 ? 0 : progress > 1 ? 1 : progress
  const total = ANSI_ROWS * ANSI_COLS
  const count = Math.floor(total * t)
  const isTarget = new Uint8Array(total)
  for (let i = 0; i < count; i++) isTarget[ditherOrder[i]] = 1
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      const src = isTarget[r * ANSI_COLS + c] ? target[r][c] : source[r][c]
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
