import { describe, it, expect } from 'vitest'
import { CGA_PALETTE, EGA_PALETTE, VGA_PALETTE, PALETTES } from './types'

function rgbKey(rgb: [number, number, number]): string {
  return `${rgb[0]},${rgb[1]},${rgb[2]}`
}

describe('palette data', () => {
  it('CGA_PALETTE has 16 entries', () => {
    expect(CGA_PALETTE).toHaveLength(16)
  })

  it('EGA_PALETTE has 64 entries', () => {
    expect(EGA_PALETTE).toHaveLength(64)
  })

  it('EGA_PALETTE has no duplicate colors', () => {
    const keys = new Set(EGA_PALETTE.map(e => rgbKey(e.rgb)))
    expect(keys.size).toBe(64)
  })

  it('VGA_PALETTE has 256 entries (16 + 216 + 24)', () => {
    expect(VGA_PALETTE).toHaveLength(256)
  })

  it('VGA_PALETTE first 16 entries match CGA_PALETTE', () => {
    for (let i = 0; i < 16; i++) {
      expect(VGA_PALETTE[i].rgb).toEqual(CGA_PALETTE[i].rgb)
    }
  })

  it('PALETTES record contains all three palettes', () => {
    expect(PALETTES.cga).toBe(CGA_PALETTE)
    expect(PALETTES.ega).toBe(EGA_PALETTE)
    expect(PALETTES.vga).toBe(VGA_PALETTE)
  })

  it('all EGA colors use only levels 0, 85, 170, 255', () => {
    const validLevels = new Set([0, 85, 170, 255])
    for (const entry of EGA_PALETTE) {
      for (const ch of entry.rgb) {
        expect(validLevels.has(ch), `unexpected level ${ch} in ${entry.name}`).toBe(true)
      }
    }
  })

  it('VGA grayscale ramp has 24 entries from 8 to 238', () => {
    const grayscale = VGA_PALETTE.slice(16 + 216)
    expect(grayscale).toHaveLength(24)
    expect(grayscale[0].rgb).toEqual([8, 8, 8])
    expect(grayscale[23].rgb).toEqual([238, 238, 238])
  })
})
