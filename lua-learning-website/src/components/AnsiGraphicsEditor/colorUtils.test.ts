import { describe, it, expect } from 'vitest'
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, extractGridColors, extractAllLayerColors } from './colorUtils'
import { createLayer } from './layerUtils'
import { DEFAULT_BG, TRANSPARENT_HALF, HALF_BLOCK } from './types'
import type { RGBColor, Layer } from './types'

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

describe('extractGridColors', () => {
  it('returns empty array for a blank grid', () => {
    const layer = createLayer('blank', 'test-blank')
    expect(extractGridColors(layer.grid)).toEqual([])
  })

  it('extracts fg and bg colors from non-default cells', () => {
    const layer = createLayer('test', 'test-1')
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    layer.grid[0][0] = { char: 'A', fg: red, bg: blue }
    const result = extractGridColors(layer.grid)
    const rgbs = result.map(e => e.rgb)
    expect(rgbs).toContainEqual(red)
    expect(rgbs).toContainEqual(blue)
  })

  it('deduplicates identical colors', () => {
    const layer = createLayer('test', 'test-2')
    const red: RGBColor = [255, 0, 0]
    layer.grid[0][0] = { char: 'A', fg: red, bg: red }
    layer.grid[0][1] = { char: 'B', fg: red, bg: DEFAULT_BG }
    const result = extractGridColors(layer.grid)
    const redEntries = result.filter(e => e.rgb[0] === 255 && e.rgb[1] === 0 && e.rgb[2] === 0)
    expect(redEntries).toHaveLength(1)
  })

  it('skips default cells (space + DEFAULT_FG + DEFAULT_BG)', () => {
    const layer = createLayer('test', 'test-3')
    // All cells are default — nothing should be extracted
    expect(extractGridColors(layer.grid)).toEqual([])
  })

  it('skips TRANSPARENT_HALF sentinel colors', () => {
    const layer = createLayer('test', 'test-4')
    const green: RGBColor = [0, 255, 0]
    layer.grid[0][0] = { char: HALF_BLOCK, fg: TRANSPARENT_HALF, bg: green }
    const result = extractGridColors(layer.grid)
    const rgbs = result.map(e => e.rgb)
    expect(rgbs).not.toContainEqual(TRANSPARENT_HALF)
    expect(rgbs).toContainEqual(green)
  })

  it('returns entries sorted by hex value', () => {
    const layer = createLayer('test', 'test-5')
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    const green: RGBColor = [0, 255, 0]
    layer.grid[0][0] = { char: 'A', fg: red, bg: blue }
    layer.grid[0][1] = { char: 'B', fg: green, bg: DEFAULT_BG }
    const result = extractGridColors(layer.grid)
    const hexes = result.map(e => e.name)
    const sorted = [...hexes].sort()
    expect(hexes).toEqual(sorted)
  })

  it('uses rgbToHex as the entry name', () => {
    const layer = createLayer('test', 'test-6')
    const color: RGBColor = [170, 85, 0]
    layer.grid[0][0] = { char: 'X', fg: color, bg: DEFAULT_BG }
    const result = extractGridColors(layer.grid)
    const entry = result.find(e => e.rgb[0] === 170)
    expect(entry?.name).toBe('#aa5500')
  })
})

describe('extractAllLayerColors', () => {
  it('returns empty array for layers with no non-default cells', () => {
    const layers: Layer[] = [
      createLayer('Layer 1', 'l1'),
      createLayer('Layer 2', 'l2'),
    ]
    expect(extractAllLayerColors(layers)).toEqual([])
  })

  it('collects colors from multiple layers', () => {
    const l1 = createLayer('Layer 1', 'l1')
    const l2 = createLayer('Layer 2', 'l2')
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    l1.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    l2.grid[0][0] = { char: 'B', fg: blue, bg: DEFAULT_BG }
    const result = extractAllLayerColors([l1, l2])
    const rgbs = result.map(e => e.rgb)
    expect(rgbs).toContainEqual(red)
    expect(rgbs).toContainEqual(blue)
  })

  it('deduplicates colors across layers', () => {
    const l1 = createLayer('Layer 1', 'l1')
    const l2 = createLayer('Layer 2', 'l2')
    const red: RGBColor = [255, 0, 0]
    l1.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
    l2.grid[0][0] = { char: 'B', fg: red, bg: DEFAULT_BG }
    const result = extractAllLayerColors([l1, l2])
    const redEntries = result.filter(e => e.rgb[0] === 255 && e.rgb[1] === 0 && e.rgb[2] === 0)
    expect(redEntries).toHaveLength(1)
  })

  it('returns empty array for empty layers array', () => {
    expect(extractAllLayerColors([])).toEqual([])
  })
})
