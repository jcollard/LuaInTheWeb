import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, RGBColor, AnsiGrid } from './types'
import { ANSI_ROWS, ANSI_COLS } from './types'
import type { ColorTransform } from './gridUtils'

interface BufferCell {
  char: string
  fg: RGBColor
  bg: RGBColor
}

/** Sentinel value that never matches any real cell, forcing first flush to write everything. */
const SENTINEL: BufferCell = { char: '\x00', fg: [-1, -1, -1], bg: [-1, -1, -1] }

function cellsEqual(a: BufferCell, b: BufferCell): boolean {
  return a.char === b.char
    && a.fg[0] === b.fg[0] && a.fg[1] === b.fg[1] && a.fg[2] === b.fg[2]
    && a.bg[0] === b.bg[0] && a.bg[1] === b.bg[1] && a.bg[2] === b.bg[2]
}

function formatCell(row: number, col: number, fg: RGBColor, bg: RGBColor, char: string): string {
  return `\x1b[${row + 1};${col + 1}H\x1b[38;2;${fg[0]};${fg[1]};${fg[2]}m\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m${char}\x1b[0m`
}

/**
 * Double-buffer for the ANSI terminal display.
 *
 * Maintains a shadow copy of what's currently on screen. All writes go through
 * the buffer, which diffs against the shadow and emits only changed cells.
 * Colors stored in the buffer are **post-transform** (after CGA quantization etc.).
 */
export class TerminalBuffer {
  private shadow: BufferCell[][]
  private handle: AnsiTerminalHandle | null = null
  private dirty = true

  constructor() {
    this.shadow = this.createSentinelGrid()
  }

  private createSentinelGrid(): BufferCell[][] {
    return Array.from({ length: ANSI_ROWS }, () =>
      Array.from({ length: ANSI_COLS }, () => ({ ...SENTINEL, fg: [...SENTINEL.fg] as RGBColor, bg: [...SENTINEL.bg] as RGBColor }))
    )
  }

  /** Bind to a terminal handle. Marks the buffer dirty so next flush writes everything. */
  attach(handle: AnsiTerminalHandle): void {
    this.handle = handle
    this.dirty = true
    this.shadow = this.createSentinelGrid()
  }

  /** Unbind from the terminal handle. Prevents further writes. */
  detach(): void {
    this.handle = null
  }

  /** Force a full rewrite on the next flush. */
  invalidate(): void {
    this.shadow = this.createSentinelGrid()
    this.dirty = true
  }

  /**
   * Write a single cell to the terminal, skipping if unchanged.
   * Updates the shadow buffer so subsequent flushes don't re-emit this cell.
   */
  writeCell(row: number, col: number, cell: AnsiCell, colorTransform?: ColorTransform): void {
    if (!this.handle) return
    const fg = colorTransform ? colorTransform(cell.fg) : cell.fg
    const bg = colorTransform ? colorTransform(cell.bg) : cell.bg
    const transformed: BufferCell = { char: cell.char, fg, bg }

    if (cellsEqual(this.shadow[row][col], transformed)) return

    this.shadow[row][col] = { char: transformed.char, fg: [...transformed.fg] as RGBColor, bg: [...transformed.bg] as RGBColor }
    this.handle.write(formatCell(row, col, fg, bg, cell.char))
  }

  /**
   * Diff the full grid against the shadow and write only changed cells.
   * Batches all ANSI sequences into a single `handle.write()` call.
   */
  flush(grid: AnsiGrid, colorTransform?: ColorTransform): void {
    if (!this.handle) return

    let batch = ''
    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        const cell = grid[r][c]
        const fg = colorTransform ? colorTransform(cell.fg) : cell.fg
        const bg = colorTransform ? colorTransform(cell.bg) : cell.bg
        const transformed: BufferCell = { char: cell.char, fg, bg }

        if (!this.dirty && cellsEqual(this.shadow[r][c], transformed)) continue

        this.shadow[r][c] = { char: transformed.char, fg: [...transformed.fg] as RGBColor, bg: [...transformed.bg] as RGBColor }
        batch += formatCell(r, c, fg, bg, cell.char)
      }
    }

    this.dirty = false
    if (batch.length > 0) {
      this.handle.write(batch)
    }
  }
}
