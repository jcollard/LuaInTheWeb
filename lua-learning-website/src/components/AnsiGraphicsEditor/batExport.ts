import type { AnsiCell, AnsiGrid } from './types'
import { unicodeToCp437, nearestCgaIndex, CGA_FG_SGR, CGA_BG_SGR } from './ansExport'

const ESC = 0x1b
const CR = 0x0d
const LF = 0x0a
const PERCENT = 0x25

const ECHO_PREFIX = 'echo '
const REM_LINE = 'REM Requires ANSI.SYS (DOS/9x) or a modern terminal (Win10+ cmd, ConEmu, ANSICON).'
const PING_PREFIX = 'ping -n 1 -w '
const PING_SUFFIX = ' 192.0.2.1 >nul'

/** ESC[H cursor-home prefix prepended to the first row of each animated frame. */
const HOME_PREFIX = new Uint8Array([ESC, 0x5b, 0x48])

function pushAscii(bytes: number[], s: string): void {
  for (let i = 0; i < s.length; i++) {
    bytes.push(s.charCodeAt(i))
  }
}

function pushCrlf(bytes: number[]): void {
  bytes.push(CR, LF)
}

/** Emit a combined CGA SGR: `\x1b[0;{bold?};{blink?};{fg};{bg}m`. */
function pushCgaSgr(bytes: number[], fgIdx: number, bgIdx: number): void {
  const parts: number[] = [0]
  if (fgIdx >= 8) parts.push(1)
  if (bgIdx >= 8) parts.push(5)
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

function pushRow(bytes: number[], row: AnsiCell[], prefix?: Uint8Array): void {
  pushAscii(bytes, ECHO_PREFIX)
  if (prefix) {
    for (let i = 0; i < prefix.length; i++) bytes.push(prefix[i])
  }
  let curFgIdx = -1
  let curBgIdx = -1
  for (let c = 0; c < row.length; c++) {
    const cell = row[c]
    const fgIdx = nearestCgaIndex(cell.fg)
    const bgIdx = nearestCgaIndex(cell.bg)
    if (fgIdx !== curFgIdx || bgIdx !== curBgIdx) {
      pushCgaSgr(bytes, fgIdx, bgIdx)
      curFgIdx = fgIdx
      curBgIdx = bgIdx
    }
    pushCellChar(bytes, cell)
  }
  pushReset(bytes)
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
  for (const row of grid) {
    pushRow(bytes, row)
    pushCrlf(bytes)
  }
  pushAscii(bytes, 'pause >nul')
  pushCrlf(bytes)
  return new Uint8Array(bytes)
}

/** Generate an animated DOS BAT script that loops frames until Ctrl+C. */
export function exportAnimatedBatFile(frames: AnsiGrid[], durationMs: number): Uint8Array {
  if (frames.length <= 1) return exportBatFile(frames[0] ?? [])
  const waitMs = Math.max(1, Math.round(durationMs))
  const bytes: number[] = []
  pushHeader(bytes)
  pushAscii(bytes, ECHO_PREFIX)
  bytes.push(ESC)
  pushAscii(bytes, '[?25l')
  pushCrlf(bytes)
  pushAscii(bytes, ':loop')
  pushCrlf(bytes)
  for (const frame of frames) {
    for (let r = 0; r < frame.length; r++) {
      pushRow(bytes, frame[r], r === 0 ? HOME_PREFIX : undefined)
      pushCrlf(bytes)
    }
    pushAscii(bytes, `${PING_PREFIX}${waitMs}${PING_SUFFIX}`)
    pushCrlf(bytes)
  }
  pushAscii(bytes, 'goto loop')
  pushCrlf(bytes)
  return new Uint8Array(bytes)
}
