import { describe, it, expect } from 'vitest'
import { unicodeToCp437, CP437_TABLE, gridToAnsBytes, buildSauceRecord, exportAnsFile, nearestCgaIndex, cgaQuantize } from './ansExport'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_FG } from './types'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg, bg }
}

function makeDefaultGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => makeCell(' ', DEFAULT_FG, DEFAULT_BG))
  )
}

// ─── unicodeToCp437 ───

describe('unicodeToCp437', () => {
  it('maps printable ASCII (0x20-0x7E) via fast path', () => {
    expect(unicodeToCp437(' ')).toBe(0x20)
    expect(unicodeToCp437('A')).toBe(0x41)
    expect(unicodeToCp437('z')).toBe(0x7a)
    expect(unicodeToCp437('~')).toBe(0x7e)
    expect(unicodeToCp437('0')).toBe(0x30)
  })

  it('maps box-drawing characters', () => {
    // ═ is CP437 0xCD, ║ is 0xBA, ╔ is 0xC9
    expect(unicodeToCp437('═')).toBe(0xcd)
    expect(unicodeToCp437('║')).toBe(0xba)
    expect(unicodeToCp437('╔')).toBe(0xc9)
  })

  it('maps block characters', () => {
    // █ is CP437 0xDB, ▀ is 0xDF, ▄ is 0xDC
    expect(unicodeToCp437('█')).toBe(0xdb)
    expect(unicodeToCp437('▀')).toBe(0xdf)
    expect(unicodeToCp437('▄')).toBe(0xdc)
  })

  it('maps smiley faces from low CP437 range', () => {
    // ☺ is CP437 0x01, ☻ is 0x02
    expect(unicodeToCp437('☺')).toBe(0x01)
    expect(unicodeToCp437('☻')).toBe(0x02)
  })

  it('maps currency/special symbols', () => {
    // ¢ is CP437 0x9B, £ is 0x9C, ¥ is 0x9D
    expect(unicodeToCp437('¢')).toBe(0x9b)
    expect(unicodeToCp437('£')).toBe(0x9c)
    expect(unicodeToCp437('¥')).toBe(0x9d)
  })

  it('returns 0x20 (space) for unmapped Unicode characters', () => {
    expect(unicodeToCp437('你')).toBe(0x20)
    expect(unicodeToCp437('🎉')).toBe(0x20)
  })

  it('returns 0x20 for empty string', () => {
    expect(unicodeToCp437('')).toBe(0x20)
  })
})

describe('CP437_TABLE', () => {
  it('has exactly 256 entries', () => {
    expect(CP437_TABLE).toHaveLength(256)
  })

  it('contains space at position 0x20', () => {
    expect(CP437_TABLE[0x20]).toBe(' ')
  })

  it('contains printable ASCII at correct positions', () => {
    for (let i = 0x20; i <= 0x7e; i++) {
      expect(CP437_TABLE[i]).toBe(String.fromCharCode(i))
    }
  })
})

// ─── nearestCgaIndex ───

describe('nearestCgaIndex', () => {
  it('maps exact CGA palette colors to their index', () => {
    expect(nearestCgaIndex([0, 0, 0])).toBe(0)       // Black
    expect(nearestCgaIndex([0, 0, 170])).toBe(1)      // Blue
    expect(nearestCgaIndex([0, 170, 0])).toBe(2)      // Green
    expect(nearestCgaIndex([0, 170, 170])).toBe(3)    // Cyan
    expect(nearestCgaIndex([170, 0, 0])).toBe(4)      // Red
    expect(nearestCgaIndex([170, 0, 170])).toBe(5)    // Magenta
    expect(nearestCgaIndex([170, 85, 0])).toBe(6)     // Brown
    expect(nearestCgaIndex([170, 170, 170])).toBe(7)  // Light Gray
    expect(nearestCgaIndex([85, 85, 85])).toBe(8)     // Dark Gray
    expect(nearestCgaIndex([85, 85, 255])).toBe(9)    // Bright Blue
    expect(nearestCgaIndex([85, 255, 85])).toBe(10)   // Bright Green
    expect(nearestCgaIndex([85, 255, 255])).toBe(11)  // Bright Cyan
    expect(nearestCgaIndex([255, 85, 85])).toBe(12)   // Bright Red
    expect(nearestCgaIndex([255, 85, 255])).toBe(13)  // Bright Magenta
    expect(nearestCgaIndex([255, 255, 85])).toBe(14)  // Yellow
    expect(nearestCgaIndex([255, 255, 255])).toBe(15) // White
  })

  it('maps nearby colors to the closest CGA entry', () => {
    // Near-red → Red (index 4)
    expect(nearestCgaIndex([180, 10, 10])).toBe(4)
    // Pure blue (0,0,255) → closer to Bright Blue (85,85,255) than Blue (0,0,170)
    expect(nearestCgaIndex([0, 0, 255])).toBe(1)
    // Bright white-ish → White
    expect(nearestCgaIndex([250, 250, 250])).toBe(15)
  })
})

// ─── cgaQuantize ───

describe('cgaQuantize', () => {
  it('maps exact CGA palette colors to themselves', () => {
    expect(cgaQuantize([0, 0, 0])).toEqual([0, 0, 0])           // Black
    expect(cgaQuantize([0, 0, 170])).toEqual([0, 0, 170])        // Blue
    expect(cgaQuantize([255, 255, 255])).toEqual([255, 255, 255]) // White
    expect(cgaQuantize([170, 85, 0])).toEqual([170, 85, 0])      // Brown
  })

  it('maps nearby colors to the nearest CGA palette RGB', () => {
    // Near-red → CGA Red (170, 0, 0)
    expect(cgaQuantize([180, 10, 10])).toEqual([170, 0, 0])
    // Bright white-ish → CGA White (255, 255, 255)
    expect(cgaQuantize([250, 250, 250])).toEqual([255, 255, 255])
  })

  it('returns a valid RGBColor tuple', () => {
    const result = cgaQuantize([128, 128, 128])
    expect(result).toHaveLength(3)
    expect(result.every(c => typeof c === 'number')).toBe(true)
  })
})

// ─── gridToAnsBytes ───

describe('gridToAnsBytes', () => {
  it('produces output ending with reset sequence', () => {
    const grid = makeDefaultGrid()
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    expect(str.endsWith('\x1b[0m')).toBe(true)
  })

  it('includes CRLF line endings between rows', () => {
    const grid = makeDefaultGrid()
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    const lines = str.split('\r\n')
    // 25 rows means 25 CRLF-terminated lines (last line before final reset)
    expect(lines.length).toBeGreaterThanOrEqual(ANSI_ROWS)
  })

  it('emits reset at start of each row', () => {
    const grid = makeDefaultGrid()
    // Set a non-default color on the last cell of row 0
    grid[0][ANSI_COLS - 1] = makeCell('X', [255, 85, 85], [0, 0, 170])
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // After the CRLF of row 0, row 1 should start with a reset
    const row1Start = str.indexOf('\r\n') + 2
    expect(str.substring(row1Start, row1Start + 4)).toBe('\x1b[0m')
  })

  it('does not re-emit SGR when adjacent cells have the same CGA colors', () => {
    const grid = makeDefaultGrid()
    // Both cells map to CGA 12 (Bright Red) fg, CGA 0 (Black) bg
    grid[0][0] = makeCell('A', [255, 85, 85], [0, 0, 0])
    grid[0][1] = makeCell('B', [255, 85, 85], [0, 0, 0])
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // Find the first 'A' character — the SGR before it should not repeat before 'B'
    const aIdx = str.indexOf('A')
    expect(aIdx).toBeGreaterThanOrEqual(0)
    // Between 'A' and 'B' there should be no escape sequence
    const between = str.substring(aIdx + 1, str.indexOf('B'))
    expect(between).not.toContain('\x1b')
  })

  it('uses standard 16-color SGR codes (not 24-bit truecolor)', () => {
    const grid = makeDefaultGrid()
    grid[0][0] = makeCell('A', [255, 85, 85], [0, 0, 170])
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // Should NOT contain 24-bit truecolor sequences
    expect(str).not.toContain('38;2;')
    expect(str).not.toContain('48;2;')
    // Should contain standard SGR codes: 31 (red fg), 1 (bold for bright), 44 (blue bg)
    expect(str).toContain('1;')  // bold for bright red
    expect(str).toContain('31')  // red fg
    expect(str).toContain('44')  // blue bg
  })

  it('emits bold attribute for bright foreground colors', () => {
    const grid = makeDefaultGrid()
    // White (CGA 15) = bold + SGR 37
    grid[0][0] = makeCell('W', [255, 255, 255], [0, 0, 0])
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // Should contain bold (1) and white fg (37)
    expect(str).toContain('\x1b[0;1;37;40m')
  })

  it('does not emit bold for dark foreground colors', () => {
    const grid = makeDefaultGrid()
    // Red (CGA 4) = SGR 31, no bold
    grid[0][0] = makeCell('R', [170, 0, 0], [0, 0, 0])
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // Should contain fg 31 and bg 40 without bold
    expect(str).toContain('\x1b[0;31;40m')
  })

  it('emits blink attribute for bright background colors (iCE mode)', () => {
    const grid = makeDefaultGrid()
    // Bright Cyan bg (CGA 11) = blink(5) + SGR 46
    grid[0][0] = makeCell('C', [0, 0, 0], [85, 255, 255])
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // Should contain blink (5) for bright background
    expect(str).toContain('\x1b[0;5;30;46m')
  })

  it('encodes characters as CP437 bytes', () => {
    const grid = makeDefaultGrid()
    grid[0][0] = makeCell('█', [255, 255, 255], [0, 0, 0])
    const bytes = gridToAnsBytes(grid)
    // █ is CP437 0xDB — find it in the byte output
    expect(bytes.includes(0xdb)).toBe(true)
  })

  it('emits correct SGR for default colors (light gray on black)', () => {
    const grid = makeDefaultGrid()
    const bytes = gridToAnsBytes(grid)
    const str = new TextDecoder('latin1').decode(bytes)
    // Default fg = Light Gray (CGA 7) = SGR 37, Default bg = Black (CGA 0) = SGR 40
    // First cell after reset should emit: \x1b[0;37;40m
    expect(str).toContain('\x1b[0;37;40m')
  })
})

// ─── buildSauceRecord ───

describe('buildSauceRecord', () => {
  it('produces exactly 128 bytes', () => {
    const record = buildSauceRecord('Test', 100)
    expect(record.byteLength).toBe(128)
  })

  it('starts with SAUCE magic', () => {
    const record = buildSauceRecord('Test', 100)
    const magic = new TextDecoder('ascii').decode(record.slice(0, 5))
    expect(magic).toBe('SAUCE')
  })

  it('has version 00 at offset 5', () => {
    const record = buildSauceRecord('Test', 100)
    const version = new TextDecoder('ascii').decode(record.slice(5, 7))
    expect(version).toBe('00')
  })

  it('pads title to 35 bytes with spaces', () => {
    const record = buildSauceRecord('Hi', 100)
    const title = new TextDecoder('ascii').decode(record.slice(7, 42))
    expect(title).toBe('Hi' + ' '.repeat(33))
  })

  it('truncates title longer than 35 characters', () => {
    const longTitle = 'A'.repeat(50)
    const record = buildSauceRecord(longTitle, 100)
    const title = new TextDecoder('ascii').decode(record.slice(7, 42))
    expect(title).toBe('A'.repeat(35))
  })

  it('has empty author field (20 spaces) at offset 42', () => {
    const record = buildSauceRecord('Test', 100)
    const author = new TextDecoder('ascii').decode(record.slice(42, 62))
    expect(author).toBe(' '.repeat(20))
  })

  it('has empty group field (20 spaces) at offset 62', () => {
    const record = buildSauceRecord('Test', 100)
    const group = new TextDecoder('ascii').decode(record.slice(62, 82))
    expect(group).toBe(' '.repeat(20))
  })

  it('has YYYYMMDD date at offset 82', () => {
    const record = buildSauceRecord('Test', 100)
    const date = new TextDecoder('ascii').decode(record.slice(82, 90))
    // Should match YYYYMMDD pattern
    expect(date).toMatch(/^\d{8}$/)
  })

  it('stores fileSize as little-endian 32-bit at offset 90', () => {
    const record = buildSauceRecord('Test', 0x12345678)
    const view = new DataView(record.buffer, record.byteOffset)
    expect(view.getUint32(90, true)).toBe(0x12345678)
  })

  it('has DataType=1 at offset 94', () => {
    const record = buildSauceRecord('Test', 100)
    expect(record[94]).toBe(1)
  })

  it('has FileType=1 at offset 95', () => {
    const record = buildSauceRecord('Test', 100)
    expect(record[95]).toBe(1)
  })

  it('has TInfo1=80 (width) as LE 16-bit at offset 96', () => {
    const record = buildSauceRecord('Test', 100)
    const view = new DataView(record.buffer, record.byteOffset)
    expect(view.getUint16(96, true)).toBe(80)
  })

  it('has TInfo2=25 (height) as LE 16-bit at offset 98', () => {
    const record = buildSauceRecord('Test', 100)
    const view = new DataView(record.buffer, record.byteOffset)
    expect(view.getUint16(98, true)).toBe(25)
  })

  it('has TFlags=0x01 (iCE colors) at offset 105', () => {
    const record = buildSauceRecord('Test', 100)
    expect(record[105]).toBe(0x01)
  })

  it('has TInfoS starting with "IBM VGA" at offset 106', () => {
    const record = buildSauceRecord('Test', 100)
    const tinfos = new TextDecoder('ascii').decode(record.slice(106, 113))
    expect(tinfos).toBe('IBM VGA')
  })

  it('null-pads TInfoS to 22 bytes at offset 106', () => {
    const record = buildSauceRecord('Test', 100)
    // After "IBM VGA" (7 chars), remaining 15 bytes should be 0
    for (let i = 113; i < 128; i++) {
      expect(record[i]).toBe(0)
    }
  })
})

// ─── exportAnsFile ───

describe('exportAnsFile', () => {
  it('contains EOF marker 0x1A between ANS data and SAUCE', () => {
    const grid = makeDefaultGrid()
    const result = exportAnsFile(grid, 'Test')
    // SAUCE record is always the last 128 bytes
    const sauceStart = result.byteLength - 128
    // EOF marker should be at sauceStart - 1
    expect(result[sauceStart - 1]).toBe(0x1a)
  })

  it('ends with a valid SAUCE record', () => {
    const grid = makeDefaultGrid()
    const result = exportAnsFile(grid, 'Test')
    const sauce = result.slice(result.byteLength - 128)
    const magic = new TextDecoder('ascii').decode(sauce.slice(0, 5))
    expect(magic).toBe('SAUCE')
  })

  it('SAUCE fileSize matches ANS data length (before EOF)', () => {
    const grid = makeDefaultGrid()
    const result = exportAnsFile(grid, 'Test')
    const sauceStart = result.byteLength - 128
    const ansDataLength = sauceStart - 1 // exclude EOF byte
    const view = new DataView(result.buffer, result.byteOffset)
    expect(view.getUint32(sauceStart + 90, true)).toBe(ansDataLength)
  })

  it('uses "untitled" as default title', () => {
    const grid = makeDefaultGrid()
    const result = exportAnsFile(grid)
    const sauceStart = result.byteLength - 128
    const title = new TextDecoder('ascii').decode(result.slice(sauceStart + 7, sauceStart + 42))
    expect(title.trimEnd()).toBe('untitled')
  })

  it('passes provided title to SAUCE record', () => {
    const grid = makeDefaultGrid()
    const result = exportAnsFile(grid, 'My Art')
    const sauceStart = result.byteLength - 128
    const title = new TextDecoder('ascii').decode(result.slice(sauceStart + 7, sauceStart + 42))
    expect(title.trimEnd()).toBe('My Art')
  })

  it('total size = ANS data + 1 (EOF) + 128 (SAUCE)', () => {
    const grid = makeDefaultGrid()
    const ansBytes = gridToAnsBytes(grid)
    const result = exportAnsFile(grid)
    expect(result.byteLength).toBe(ansBytes.byteLength + 1 + 128)
  })
})
