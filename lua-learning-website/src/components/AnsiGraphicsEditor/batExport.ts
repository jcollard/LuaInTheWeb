import type { AnsiCell, AnsiGrid } from './types'
import { unicodeToCp437, nearestCgaIndex, CGA_FG_SGR, CGA_BG_SGR } from './ansExport'

const ESC = 0x1b
const CR = 0x0d
const LF = 0x0a
const PERCENT = 0x25

const ECHO_PREFIX = 'echo '
const REM_LINE = 'REM Requires ANSI.SYS (DOS/9x) or a modern terminal (Win10+ cmd, ConEmu, ANSICON).'

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

function pushRow(bytes: number[], row: AnsiCell[]): void {
  pushAscii(bytes, ECHO_PREFIX)
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
