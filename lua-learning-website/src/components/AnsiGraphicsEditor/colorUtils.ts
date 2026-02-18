import type { RGBColor } from './types'

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
