import { describe, it, expect } from 'vitest'
import { exportBatFile, exportAnimatedBatFile } from './batExport'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_FG } from './types'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg, bg }
}

function make1x1Grid(cell: AnsiCell): AnsiGrid {
  return [[cell]]
}

function makeDefaultGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => makeCell(' ', DEFAULT_FG, DEFAULT_BG))
  )
}

/** Decode a Uint8Array byte-for-byte into a string (latin-1 is 1:1 for 0x00-0xFF). */
function bytesToStr(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes)
}

const ESC = '\x1b'

// ─── exportBatFile ───

describe('exportBatFile', () => {
  it('begins with @echo off and CRLF', () => {
    const result = bytesToStr(exportBatFile(make1x1Grid(makeCell('A', DEFAULT_FG, DEFAULT_BG))))
    expect(result.startsWith('@echo off\r\n')).toBe(true)
  })

  it('includes an ANSI.SYS compatibility REM header', () => {
    const result = bytesToStr(exportBatFile(make1x1Grid(makeCell('A', DEFAULT_FG, DEFAULT_BG))))
    expect(result).toMatch(/^@echo off\r\nREM [^\r\n]*ANSI\.SYS/)
  })

  it('clears the screen with cls after the REM header', () => {
    const result = bytesToStr(exportBatFile(make1x1Grid(makeCell('A', DEFAULT_FG, DEFAULT_BG))))
    expect(result).toContain('\r\ncls\r\n')
  })

  it('begins each row line with "echo " and ends with CRLF', () => {
    const grid: AnsiGrid = [
      [makeCell('A', DEFAULT_FG, DEFAULT_BG)],
      [makeCell('B', DEFAULT_FG, DEFAULT_BG)],
    ]
    const result = bytesToStr(exportBatFile(grid))
    const rowLines = result.split('\r\n').filter(l => l.startsWith('echo '))
    expect(rowLines.length).toBeGreaterThanOrEqual(2)
  })

  it('emits CGA SGR for red fg / blue bg as \\x1b[0;31;44m', () => {
    const grid = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 255]))
    const result = bytesToStr(exportBatFile(grid))
    // [255,0,0] → CGA index 4 (Red [170,0,0]); [0,0,255] → CGA index 1 (Blue [0,0,170])
    expect(result).toContain(`${ESC}[0;31;44m`)
  })

  it('adds bold attribute (1) for bright foreground (idx >= 8)', () => {
    const grid = make1x1Grid(makeCell('A', [255, 255, 255], DEFAULT_BG))
    const result = bytesToStr(exportBatFile(grid))
    // white → idx 15; fg SGR 37 with bold → \x1b[0;1;37;40m
    expect(result).toContain(`${ESC}[0;1;37;40m`)
  })

  it('adds blink attribute (5) for bright background (idx >= 8)', () => {
    const grid = make1x1Grid(makeCell('A', DEFAULT_FG, [255, 255, 255]))
    const result = bytesToStr(exportBatFile(grid))
    // white bg → idx 15; fg light-gray → idx 7 (no bold); bg SGR 47 with blink
    expect(result).toContain(`${ESC}[0;5;37;47m`)
  })

  it('omits bold and blink for plain (idx 0-7) fg and bg', () => {
    const grid = make1x1Grid(makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const result = bytesToStr(exportBatFile(grid))
    // SGR should be `\x1b[0;37;40m` — no 1 (bold), no 5 (blink)
    expect(result).toContain(`${ESC}[0;37;40m`)
    expect(result).not.toContain(`${ESC}[0;1;37;40m`)
    expect(result).not.toContain(`${ESC}[0;5;37;40m`)
  })

  it('skips redundant SGR when consecutive cells share fg and bg indices', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [255, 0, 0], [0, 0, 0]),
      makeCell('B', [255, 0, 0], [0, 0, 0]),
    ]]
    const result = bytesToStr(exportBatFile(grid))
    const sgr = `${ESC}[0;31;40m`
    const first = result.indexOf(sgr)
    const second = result.indexOf(sgr, first + sgr.length)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(second).toBe(-1)
  })

  it('re-emits SGR when fg changes but bg stays the same', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [170, 0, 0], DEFAULT_BG),       // red fg / black bg
      makeCell('B', [0, 170, 0], DEFAULT_BG),       // green fg / black bg
    ]]
    const result = bytesToStr(exportBatFile(grid))
    expect(result).toContain(`${ESC}[0;31;40m`) // red
    expect(result).toContain(`${ESC}[0;32;40m`) // green
  })

  it('re-emits SGR when bg changes but fg stays the same', () => {
    const grid: AnsiGrid = [[
      makeCell('A', DEFAULT_FG, [0, 0, 0]),         // gray fg / black bg
      makeCell('B', DEFAULT_FG, [0, 0, 170]),       // gray fg / blue bg
    ]]
    const result = bytesToStr(exportBatFile(grid))
    expect(result).toContain(`${ESC}[0;37;40m`) // gray / black
    expect(result).toContain(`${ESC}[0;37;44m`) // gray / blue
  })

  it('emits reset at the end of each row', () => {
    const grid: AnsiGrid = [
      [makeCell('A', DEFAULT_FG, DEFAULT_BG)],
      [makeCell('B', DEFAULT_FG, DEFAULT_BG)],
    ]
    const result = bytesToStr(exportBatFile(grid))
    const matches = result.match(new RegExp(`${ESC}\\[0m\\r\\n`, 'g'))
    // 2 rows, each ending with reset + CRLF
    expect(matches?.length).toBe(2)
  })

  it('doubles the % byte inside echo lines to suppress cmd variable expansion', () => {
    const grid = make1x1Grid(makeCell('%', DEFAULT_FG, DEFAULT_BG))
    const result = bytesToStr(exportBatFile(grid))
    expect(result).toContain('%%')
    // No lone % should remain once all doubled %% are stripped.
    expect(result.replace(/%%/g, '')).not.toContain('%')
  })

  it('emits CP437 bytes (not UTF-8) for glyphs above 0x7F', () => {
    const grid = make1x1Grid(makeCell('█', DEFAULT_FG, DEFAULT_BG)) // U+2588 → CP437 0xDB
    const bytes = exportBatFile(grid)
    expect(Array.from(bytes)).toContain(0xdb)
  })

  it('ends with `pause >nul` + CRLF', () => {
    const grid = make1x1Grid(makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const result = bytesToStr(exportBatFile(grid))
    expect(result.endsWith('pause >nul\r\n')).toBe(true)
  })

  it('has an echo line per grid row', () => {
    const grid = makeDefaultGrid()
    const result = bytesToStr(exportBatFile(grid))
    const echoLines = result.split('\r\n').filter(l => l.startsWith('echo '))
    expect(echoLines.length).toBe(ANSI_ROWS)
  })
})

// ─── exportAnimatedBatFile ───

describe('exportAnimatedBatFile', () => {
  const f1 = make1x1Grid(makeCell('A', [255, 0, 0], DEFAULT_BG))
  const f2 = make1x1Grid(makeCell('B', [0, 255, 0], DEFAULT_BG))

  it('contains :loop label and goto loop terminator', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2], 100))
    expect(result).toContain('\r\n:loop\r\n')
    expect(result.endsWith('goto loop\r\n')).toBe(true)
  })

  it('emits cursor-hide ESC[?25l before the loop', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2], 100))
    const hideIdx = result.indexOf(`${ESC}[?25l`)
    const loopIdx = result.indexOf(':loop')
    expect(hideIdx).toBeGreaterThan(0)
    expect(hideIdx).toBeLessThan(loopIdx)
  })

  it('prepends ESC[H to the first row of every frame', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2], 100))
    // 2 frames × 1 row each → 2 cursor-home prefixes on echo lines
    const matches = result.match(new RegExp(`echo ${ESC}\\[H`, 'g'))
    expect(matches?.length).toBe(2)
  })

  it('prepends ESC[H only to the first row of a multi-row frame', () => {
    const multiRow: AnsiGrid = [
      [makeCell('A', DEFAULT_FG, DEFAULT_BG)],
      [makeCell('B', DEFAULT_FG, DEFAULT_BG)],
      [makeCell('C', DEFAULT_FG, DEFAULT_BG)],
    ]
    const result = bytesToStr(exportAnimatedBatFile([multiRow, multiRow], 100))
    // 2 frames × 3 rows = 6 echo lines, but only 2 cursor-home prefixes (one per frame).
    const matches = result.match(new RegExp(`echo ${ESC}\\[H`, 'g'))
    expect(matches?.length).toBe(2)
  })

  it('emits a ping delay with the exact millisecond value between frames', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2], 250))
    expect(result).toContain('ping -n 1 -w 250 192.0.2.1 >nul\r\n')
  })

  it('rounds fractional durations to whole milliseconds', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2], 83.4))
    expect(result).toContain('ping -n 1 -w 83 192.0.2.1 >nul\r\n')
  })

  it('clamps sub-1ms durations to at least 1ms', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2], 0))
    expect(result).toContain('ping -n 1 -w 1 192.0.2.1 >nul\r\n')
  })

  it('falls back to the static exporter when given a single frame', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1], 100))
    expect(result).not.toContain(':loop')
    expect(result).not.toContain('goto loop')
    expect(result.endsWith('pause >nul\r\n')).toBe(true)
  })

  it('falls back to an empty grid when given zero frames', () => {
    const result = bytesToStr(exportAnimatedBatFile([], 100))
    expect(result.startsWith('@echo off\r\n')).toBe(true)
    expect(result.endsWith('pause >nul\r\n')).toBe(true)
  })

  it('emits one ping delay per frame', () => {
    const result = bytesToStr(exportAnimatedBatFile([f1, f2, f1], 100))
    const pings = result.match(/ping -n 1 -w 100 192\.0\.2\.1 >nul\r\n/g)
    expect(pings?.length).toBe(3)
  })
})
