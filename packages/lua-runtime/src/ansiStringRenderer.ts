/**
 * Renders an AnsiGrid into a single ANSI escape string.
 *
 * The resulting string can be written directly to an xterm.js terminal
 * to display the grid as a background image.
 */

import type { AnsiGrid, RGBColor } from './screenTypes'
import { ANSI_ROWS, ANSI_COLS } from './screenTypes'

/**
 * Render an AnsiGrid into a single ANSI escape string.
 *
 * Positions cursor at (1,1), iterates all cells, and emits fg/bg color
 * changes only when they differ from the previous cell.
 */
export function renderGridToAnsiString(grid: AnsiGrid): string {
  const parts: string[] = []

  // Move cursor to top-left and reset attributes
  parts.push('\x1b[H\x1b[0m')

  let currentFg: RGBColor | null = null
  let currentBg: RGBColor | null = null

  const rows = Math.min(grid.length, ANSI_ROWS)

  for (let r = 0; r < rows; r++) {
    // Position cursor at start of each row
    parts.push(`\x1b[${r + 1};1H`)

    const row = grid[r]
    const cols = Math.min(row.length, ANSI_COLS)

    for (let c = 0; c < cols; c++) {
      const cell = row[c]

      // Emit fg color change if needed
      if (currentFg === null || currentFg[0] !== cell.fg[0] || currentFg[1] !== cell.fg[1] || currentFg[2] !== cell.fg[2]) {
        parts.push(`\x1b[38;2;${cell.fg[0]};${cell.fg[1]};${cell.fg[2]}m`)
        currentFg = cell.fg
      }

      // Emit bg color change if needed
      if (currentBg === null || currentBg[0] !== cell.bg[0] || currentBg[1] !== cell.bg[1] || currentBg[2] !== cell.bg[2]) {
        parts.push(`\x1b[48;2;${cell.bg[0]};${cell.bg[1]};${cell.bg[2]}m`)
        currentBg = cell.bg
      }

      parts.push(cell.char)
    }
  }

  // Reset attributes at end
  parts.push('\x1b[0m')

  return parts.join('')
}
