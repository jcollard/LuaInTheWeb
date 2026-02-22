import type { AnsiCell, AnsiGrid, RGBColor } from './types'

/**
 * Escape a character for safe embedding inside a single-quoted printf argument.
 * - `%` → `%%` (printf format specifier)
 * - `\` → `\\\\` (double-escaped for printf interpretation)
 * - `'` → `'\\''` (end quote, escaped quote, start quote)
 */
function escapeChar(char: string): string {
  if (char === '%') return '%%'
  if (char === '\\') return '\\\\\\\\'
  if (char === "'") return "'\\''"
  return char
}

function rgbEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

/**
 * Render a single row of cells as a printf-safe escape string.
 * Skips redundant fg/bg SGR codes and appends `\033[0m\n`.
 */
function renderRow(row: AnsiCell[]): string {
  const parts: string[] = []
  let curFg: RGBColor | null = null
  let curBg: RGBColor | null = null

  for (let c = 0; c < row.length; c++) {
    const cell = row[c]

    if (curFg === null || !rgbEqual(curFg, cell.fg)) {
      parts.push(`\\033[38;2;${cell.fg[0]};${cell.fg[1]};${cell.fg[2]}m`)
      curFg = cell.fg
    }
    if (curBg === null || !rgbEqual(curBg, cell.bg)) {
      parts.push(`\\033[48;2;${cell.bg[0]};${cell.bg[1]};${cell.bg[2]}m`)
      curBg = cell.bg
    }

    parts.push(escapeChar(cell.char))
  }

  parts.push('\\033[0m\\n')
  return parts.join('')
}

/**
 * Convert an AnsiGrid to a string of printf-safe escape sequences using 24-bit truecolor.
 * Each row ends with `\033[0m\n`. Redundant fg/bg SGR codes are skipped.
 */
export function gridToShString(grid: AnsiGrid): string {
  return grid.map(renderRow).join('')
}

/** Generate a static bash script that displays the grid using printf. */
export function exportShFile(grid: AnsiGrid): string {
  const lines: string[] = [
    '#!/bin/bash',
    "printf '\\033[2J\\033[H'",
  ]

  for (const row of grid) {
    lines.push(`printf '${renderRow(row)}'`)
  }

  lines.push("printf '\\033[0m'")
  lines.push('')

  return lines.join('\n')
}

/** Generate an animated bash script that loops through frames with sleep. */
export function exportAnimatedShFile(frames: AnsiGrid[], durationMs: number): string {
  if (frames.length <= 1) {
    return exportShFile(frames[0] ?? [])
  }

  const sleepSec = durationMs / 1000

  const lines: string[] = [
    '#!/bin/bash',
    "trap 'printf \"\\033[?25h\\033[0m\"; exit' INT",
    "printf '\\033[2J'",
    "printf '\\033[?25l'",
    'while true; do',
  ]

  for (const frame of frames) {
    lines.push("  printf '\\033[H'")
    for (const row of frame) {
      lines.push(`  printf '${renderRow(row)}'`)
    }
    lines.push(`  sleep ${sleepSec}`)
  }

  lines.push('done')
  lines.push('')

  return lines.join('\n')
}
