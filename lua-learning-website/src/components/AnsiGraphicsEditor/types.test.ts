import { describe, it, expect } from 'vitest'
import { CGA_PALETTE, EGA_PALETTE, VGA_PALETTE, PALETTES, isGroupLayer, isDrawableLayer, isClipLayer } from './types'
import type { ClipLayer, DrawnLayer, TextLayer, GroupLayer, RGBColor, AnsiGrid } from './types'
import { DEFAULT_FG, DEFAULT_BG, ANSI_ROWS, ANSI_COLS } from './types'

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

function makeEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }))
  )
}

function makeClipLayer(overrides?: Partial<ClipLayer>): ClipLayer {
  return {
    type: 'clip',
    id: 'clip-1',
    name: 'Clip Mask',
    visible: true,
    grid: makeEmptyGrid(),
    parentId: 'group-1',
    ...overrides,
  }
}

function makeDrawnLayer(): DrawnLayer {
  const grid = makeEmptyGrid()
  return { type: 'drawn', id: 'drawn-1', name: 'Layer 1', visible: true, grid, frames: [grid], currentFrameIndex: 0, frameDurationMs: 100 }
}

function makeTextLayer(): TextLayer {
  return {
    type: 'text', id: 'text-1', name: 'Text 1', visible: true,
    grid: makeEmptyGrid(), text: 'Hello', bounds: { r0: 0, c0: 0, r1: 1, c1: 10 },
    textFg: [255, 255, 255],
  }
}

function makeGroupLayer(): GroupLayer {
  return { type: 'group', id: 'group-1', name: 'Group 1', visible: true, collapsed: false }
}

describe('isClipLayer', () => {
  it('returns true for a clip layer', () => {
    const clip = makeClipLayer()
    expect(isClipLayer(clip)).toBe(true)
  })

  it('returns false for a drawn layer', () => {
    expect(isClipLayer(makeDrawnLayer())).toBe(false)
  })

  it('returns false for a text layer', () => {
    expect(isClipLayer(makeTextLayer())).toBe(false)
  })

  it('returns false for a group layer', () => {
    expect(isClipLayer(makeGroupLayer())).toBe(false)
  })
})

describe('isDrawableLayer with clip layers', () => {
  it('returns false for a clip layer', () => {
    expect(isDrawableLayer(makeClipLayer())).toBe(false)
  })

  it('still returns true for drawn layers', () => {
    expect(isDrawableLayer(makeDrawnLayer())).toBe(true)
  })

  it('still returns true for text layers', () => {
    expect(isDrawableLayer(makeTextLayer())).toBe(true)
  })
})

describe('isGroupLayer with clip layers', () => {
  it('returns false for a clip layer', () => {
    expect(isGroupLayer(makeClipLayer())).toBe(false)
  })
})
