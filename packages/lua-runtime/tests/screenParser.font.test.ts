import { describe, it, expect } from 'vitest'
import { parseScreen, getDisplaySettings } from '../src/screenParser'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_FG, type RGBColor } from '../src/screenTypes'

function makeV1Data(extras: Record<string, unknown> = {}): Record<string, unknown> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  return { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid, ...extras }
}

describe('getDisplaySettings', () => {
  it('returns IBM_VGA + useFontBlocks=true when fields are absent', () => {
    expect(getDisplaySettings({})).toEqual({ font: 'IBM_VGA', useFontBlocks: true })
  })

  it('returns the explicit fields when present', () => {
    expect(getDisplaySettings({ font: 'IBM_VGA', useFontBlocks: false }))
      .toEqual({ font: 'IBM_VGA', useFontBlocks: false })
  })

  it('falls back to IBM_VGA when font is not a registered ID', () => {
    expect(getDisplaySettings({ font: 'NOT_REAL' }).font).toBe('IBM_VGA')
  })

  it('falls back to true when useFontBlocks is not boolean', () => {
    expect(getDisplaySettings({ useFontBlocks: 'yes' as unknown }).useFontBlocks).toBe(true)
  })
})

describe('parseScreen with font + useFontBlocks', () => {
  it('returns defaults for files without the new fields', () => {
    const result = parseScreen(makeV1Data())
    expect(result.font).toBe('IBM_VGA')
    expect(result.useFontBlocks).toBe(true)
  })

  it('returns explicit useFontBlocks=false when authored', () => {
    const result = parseScreen(makeV1Data({ font: 'IBM_VGA', useFontBlocks: false }))
    expect(result.useFontBlocks).toBe(false)
    expect(result.font).toBe('IBM_VGA')
  })
})
