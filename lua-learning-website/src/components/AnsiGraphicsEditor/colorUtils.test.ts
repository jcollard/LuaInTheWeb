import { describe, it, expect } from 'vitest'
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb } from './colorUtils'

describe('hsvToRgb', () => {
  it('converts pure red', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual([255, 0, 0])
  })

  it('converts pure green', () => {
    expect(hsvToRgb(120, 1, 1)).toEqual([0, 255, 0])
  })

  it('converts pure blue', () => {
    expect(hsvToRgb(240, 1, 1)).toEqual([0, 0, 255])
  })

  it('converts white (s=0, v=1)', () => {
    expect(hsvToRgb(0, 0, 1)).toEqual([255, 255, 255])
  })

  it('converts black (v=0)', () => {
    expect(hsvToRgb(0, 0, 0)).toEqual([0, 0, 0])
  })

  it('converts yellow (h=60)', () => {
    expect(hsvToRgb(60, 1, 1)).toEqual([255, 255, 0])
  })

  it('converts cyan (h=180)', () => {
    expect(hsvToRgb(180, 1, 1)).toEqual([0, 255, 255])
  })

  it('converts magenta (h=300)', () => {
    expect(hsvToRgb(300, 1, 1)).toEqual([255, 0, 255])
  })

  it('converts 50% gray', () => {
    expect(hsvToRgb(0, 0, 0.5)).toEqual([128, 128, 128])
  })

  it('wraps hue at 360', () => {
    expect(hsvToRgb(360, 1, 1)).toEqual([255, 0, 0])
  })
})

describe('rgbToHsv', () => {
  it('converts pure red', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual([0, 1, 1])
  })

  it('converts pure green', () => {
    expect(rgbToHsv(0, 255, 0)).toEqual([120, 1, 1])
  })

  it('converts pure blue', () => {
    expect(rgbToHsv(0, 0, 255)).toEqual([240, 1, 1])
  })

  it('converts white', () => {
    expect(rgbToHsv(255, 255, 255)).toEqual([0, 0, 1])
  })

  it('converts black', () => {
    expect(rgbToHsv(0, 0, 0)).toEqual([0, 0, 0])
  })

  it('round-trips through hsvToRgb', () => {
    const testCases: [number, number, number][] = [
      [255, 0, 0], [0, 255, 0], [0, 0, 255],
      [170, 85, 0], [85, 255, 255], [128, 128, 128],
    ]
    for (const [r, g, b] of testCases) {
      const [h, s, v] = rgbToHsv(r, g, b)
      const result = hsvToRgb(h, s, v)
      expect(result, `round-trip failed for rgb(${r},${g},${b})`).toEqual([r, g, b])
    }
  })
})

describe('rgbToHex', () => {
  it('converts black', () => {
    expect(rgbToHex([0, 0, 0])).toBe('#000000')
  })

  it('converts white', () => {
    expect(rgbToHex([255, 255, 255])).toBe('#ffffff')
  })

  it('converts red', () => {
    expect(rgbToHex([255, 0, 0])).toBe('#ff0000')
  })

  it('converts arbitrary color', () => {
    expect(rgbToHex([170, 85, 0])).toBe('#aa5500')
  })
})

describe('hexToRgb', () => {
  it('parses #000000', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })

  it('parses #ffffff', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
  })

  it('parses #ff0000', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
  })

  it('parses without # prefix', () => {
    expect(hexToRgb('aa5500')).toEqual([170, 85, 0])
  })

  it('parses 3-character shorthand', () => {
    expect(hexToRgb('#f00')).toEqual([255, 0, 0])
  })

  it('parses 3-character shorthand without #', () => {
    expect(hexToRgb('fff')).toEqual([255, 255, 255])
  })

  it('returns null for invalid input', () => {
    expect(hexToRgb('xyz')).toBeNull()
    expect(hexToRgb('')).toBeNull()
    expect(hexToRgb('#gg0000')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(hexToRgb('#AA5500')).toEqual([170, 85, 0])
    expect(hexToRgb('#Ff0000')).toEqual([255, 0, 0])
  })
})
