import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { CGA_PALETTE } from './types'
import { unicodeToCp437, nearestCgaIndex, CGA_FG_SGR, CGA_BG_SGR } from './ansExport'

const ESC = 0x1b
const CR = 0x0d
const LF = 0x0a
const PERCENT = 0x25

const ECHO_PREFIX = 'echo '
const REM_LINE = 'REM Requires ANSI.SYS (DOS/9x) or a modern terminal supporting 16-color ANSI.'

/**
 * Background color quantization restricted to the 8 low-intensity CGA indices.
 *
 * DOS/ANSI.SYS interprets SGR 5 as the real blink attribute — unlike .ans
 * viewers that re-purpose it as an iCE-colors bright-bg bit via SAUCE TFlags.
 * A BAT file has no SAUCE, so we avoid SGR 5 entirely by never producing a
 * bright (idx 8–15) background.
 */
const CGA_LOW_COLORS: RGBColor[] = CGA_PALETTE.slice(0, 8).map(e => e.rgb)

function nearestCga8BgIndex(color: RGBColor): number {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < 8; i++) {
    const c = CGA_LOW_COLORS[i]
    const dr = color[0] - c[0]
    const dg = color[1] - c[1]
    const db = color[2] - c[2]
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

function pushAscii(bytes: number[], s: string): void {
  for (let i = 0; i < s.length; i++) {
    bytes.push(s.charCodeAt(i))
  }
}

function pushCrlf(bytes: number[]): void {
  bytes.push(CR, LF)
}

/**
 * Emit a combined CGA SGR: `\x1b[0;{bold?};{fg};{bg}m`.
 * Bold (SGR 1) expresses bright-fg intensity (idx 8–15). Bg is always low-intensity
 * (idx 0–7) in this exporter so SGR 5 (blink) is never emitted.
 */
function pushCgaSgr(bytes: number[], fgIdx: number, bgIdx: number): void {
  const parts: number[] = [0]
  if (fgIdx >= 8) parts.push(1)
  parts.push(CGA_FG_SGR[fgIdx])
  parts.push(CGA_BG_SGR[bgIdx])
  bytes.push(ESC)
  pushAscii(bytes, `[${parts.join(';')}m`)
}

function pushReset(bytes: number[]): void {
  bytes.push(ESC)
  pushAscii(bytes, '[0m')
}

/** Emit one CP437 glyph, doubling `%` so cmd.exe's `echo` does not expand it as a variable. */
function pushCellChar(bytes: number[], cell: AnsiCell): void {
  const b = unicodeToCp437(cell.char)
  if (b === PERCENT) bytes.push(PERCENT, PERCENT)
  else bytes.push(b)
}

/**
 * Emit one row as a BAT `echo` line.
 *
 * Prepends an explicit cursor-position `ESC[R;1H` so the row always lands on
 * its intended line regardless of `echo`'s trailing CRLF or terminal auto-wrap
 * at col 80 (the two together otherwise produce a blank line between rows).
 * Trailing `ESC[H` parks the cursor at (1,1) before the CRLF fires so the last
 * row's CRLF doesn't scroll the screen.
 */
function pushRow(bytes: number[], row: AnsiCell[], rowIdx: number): void {
  pushAscii(bytes, ECHO_PREFIX)
  bytes.push(ESC)
  pushAscii(bytes, `[${rowIdx + 1};1H`)
  let curFgIdx = -1
  let curBgIdx = -1
  for (let c = 0; c < row.length; c++) {
    const cell = row[c]
    const fgIdx = nearestCgaIndex(cell.fg)
    const bgIdx = nearestCga8BgIndex(cell.bg)
    if (fgIdx !== curFgIdx || bgIdx !== curBgIdx) {
      pushCgaSgr(bytes, fgIdx, bgIdx)
      curFgIdx = fgIdx
      curBgIdx = bgIdx
    }
    pushCellChar(bytes, cell)
  }
  pushReset(bytes)
  bytes.push(ESC)
  pushAscii(bytes, '[H')
}

function pushHeader(bytes: number[]): void {
  pushAscii(bytes, '@echo off')
  pushCrlf(bytes)
  pushAscii(bytes, REM_LINE)
  pushCrlf(bytes)
  pushAscii(bytes, 'cls')
  pushCrlf(bytes)
}

/** Generate a static DOS BAT script that paints a single grid and waits for a keypress. */
export function exportBatFile(grid: AnsiGrid): Uint8Array {
  const bytes: number[] = []
  pushHeader(bytes)
  for (let r = 0; r < grid.length; r++) {
    pushRow(bytes, grid[r], r)
    pushCrlf(bytes)
  }
  pushAscii(bytes, 'pause >nul')
  pushCrlf(bytes)
  return new Uint8Array(bytes)
}
