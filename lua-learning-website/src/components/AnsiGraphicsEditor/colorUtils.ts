import type { RGBColor, AnsiGrid, Layer, PaletteEntry } from './types'
import { TRANSPARENT_HALF } from './types'
import { isDefaultCell, rgbEqual } from './layerUtils'

/** Format an RGB color as a comma-separated key string (e.g. "255,0,128"). */
export function rgbKey(color: RGBColor): string {
  return `${color[0]},${color[1]},${color[2]}`
}

/** Format an RGB color as a CSS rgb() string (e.g. "rgb(255,0,128)"). */
export function rgbStyle(color: RGBColor): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`
}

/** Convert HSV (h: 0-360, s: 0-1, v: 0-1) to RGB (each 0-255). */
export function hsvToRgb(h: number, s: number, v: number): RGBColor {
  h = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r1: number, g1: number, b1: number
  if (h < 60)       { r1 = c; g1 = x; b1 = 0 }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0 }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c }
  else              { r1 = c; g1 = 0; b1 = x }
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ]
}

/** Convert RGB (each 0-255) to HSV (h: 0-360, s: 0-1, v: 0-1). */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn)      h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else                 h = 60 * ((rn - gn) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : d / max
  return [Math.round(h), Math.round(s * 1000) / 1000, Math.round(max * 1000) / 1000]
}

/** Convert RGB tuple to hex string (e.g. "#ff0000"). */
export function rgbToHex(rgb: RGBColor): string {
  return '#' + rgb.map(ch => ch.toString(16).padStart(2, '0')).join('')
}

/** Parse hex color string to RGB tuple, or null if invalid. */
export function hexToRgb(hex: string): RGBColor | null {
  let h = hex.startsWith('#') ? hex.slice(1) : hex
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Collect all unique non-default, non-transparent colors from the given grids, sorted by hex. */
function collectUniqueColors(grids: AnsiGrid[]): PaletteEntry[] {
  const seen = new Set<string>()
  const entries: PaletteEntry[] = []

  for (const grid of grids) {
    for (const row of grid) {
      for (const cell of row) {
        if (isDefaultCell(cell)) continue
        for (const color of [cell.fg, cell.bg]) {
          if (rgbEqual(color, TRANSPARENT_HALF)) continue
          const key = rgbKey(color)
          if (seen.has(key)) continue
          seen.add(key)
          entries.push({ name: rgbToHex(color), rgb: [...color] as RGBColor })
        }
      }
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

/** Extract all unique colors used in a single grid, sorted by hex. */
export function extractGridColors(grid: AnsiGrid): PaletteEntry[] {
  return collectUniqueColors([grid])
}

/** Extract all unique colors from all layers, sorted by hex. */
export function extractAllLayerColors(layers: Layer[]): PaletteEntry[] {
  return collectUniqueColors(layers.map(l => l.grid))
}

/** Squared Euclidean distance between two RGB colors. */
function colorDistanceSq(a: RGBColor, b: RGBColor): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return dr * dr + dg * dg + db * db
}

/**
 * Reduce a palette to targetCount colors by iteratively merging closest pairs.
 * Returns the reduced palette and a mapping from original "r,g,b" keys to new colors.
 * Only changed colors appear in the mapping.
 */
export function simplifyPalette(
  colors: PaletteEntry[],
  targetCount: number,
): { reduced: PaletteEntry[]; mapping: Map<string, RGBColor> } {
  if (colors.length === 0) return { reduced: [], mapping: new Map() }
  const target = Math.max(1, targetCount)
  if (target >= colors.length) return { reduced: [...colors], mapping: new Map() }

  // Working list: each entry tracks which original indices map to it
  const working: { rgb: RGBColor; origIndices: number[] }[] = colors.map((c, i) => ({
    rgb: [...c.rgb] as RGBColor,
    origIndices: [i],
  }))

  while (working.length > target) {
    // Find closest pair
    let bestDist = Infinity
    let bestI = 0
    let bestJ = 1
    for (let i = 0; i < working.length; i++) {
      for (let j = i + 1; j < working.length; j++) {
        const d = colorDistanceSq(working[i].rgb, working[j].rgb)
        if (d < bestDist) {
          bestDist = d
          bestI = i
          bestJ = j
        }
      }
    }
    // Merge: average the two colors
    const a = working[bestI]
    const b = working[bestJ]
    const merged: RGBColor = [
      Math.round((a.rgb[0] + b.rgb[0]) / 2),
      Math.round((a.rgb[1] + b.rgb[1]) / 2),
      Math.round((a.rgb[2] + b.rgb[2]) / 2),
    ]
    working[bestI] = { rgb: merged, origIndices: [...a.origIndices, ...b.origIndices] }
    working.splice(bestJ, 1)
  }

  // Build reduced palette and mapping
  const reduced: PaletteEntry[] = working.map(w => ({
    name: rgbToHex(w.rgb),
    rgb: w.rgb,
  }))

  const mapping = new Map<string, RGBColor>()
  for (const w of working) {
    for (const origIdx of w.origIndices) {
      const orig = colors[origIdx].rgb
      if (!rgbEqual(orig, w.rgb)) {
        mapping.set(rgbKey(orig), w.rgb)
      }
    }
  }

  return { reduced, mapping }
}

/**
 * Return a new grid with fg/bg colors replaced according to the mapping.
 * Mapping keys are "r,g,b" strings.
 */
export function replaceColorsInGrid(
  grid: AnsiGrid,
  mapping: Map<string, RGBColor>,
): AnsiGrid {
  return grid.map(row =>
    row.map(cell => {
      const newFg = mapping.get(rgbKey(cell.fg))
      const newBg = mapping.get(rgbKey(cell.bg))
      if (!newFg && !newBg) return cell
      return {
        char: cell.char,
        fg: newFg ? [...newFg] as RGBColor : [...cell.fg] as RGBColor,
        bg: newBg ? [...newBg] as RGBColor : [...cell.bg] as RGBColor,
      }
    })
  )
}
