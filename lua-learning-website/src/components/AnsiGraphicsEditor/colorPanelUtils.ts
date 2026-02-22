import type { RGBColor, PaletteEntry, PaletteType } from './types'
import { PALETTES } from './types'
import { hsvToRgb, rgbStyle } from './colorUtils'

export function isDynamicPalette(type: PaletteType): type is 'current' | 'layer' {
  return type === 'current' || type === 'layer'
}

export function resolvePalette(
  type: PaletteType,
  currentPalette: PaletteEntry[],
  layerPalette: PaletteEntry[],
): PaletteEntry[] {
  if (type === 'current') return currentPalette
  if (type === 'layer') return layerPalette
  return PALETTES[type]
}

export function colorAtPosition(canvas: HTMLCanvasElement, hue: number, clientX: number, clientY: number): RGBColor {
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const s = Math.max(0, Math.min(1, x / (canvas.width - 1)))
  const v = Math.max(0, Math.min(1, 1 - y / (canvas.height - 1)))
  return hsvToRgb(hue, s, v)
}

function strokeWithContrast(
  ctx: CanvasRenderingContext2D,
  drawPath: () => void,
  outerWidth: number,
): void {
  drawPath()
  ctx.strokeStyle = '#000'
  ctx.lineWidth = outerWidth
  ctx.stroke()
  drawPath()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.stroke()
}

export function drawSvGradient(canvas: HTMLCanvasElement | null, hue: number, marker?: { s: number; v: number }) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const s = x / (w - 1)
      const v = 1 - y / (h - 1)
      ctx.fillStyle = rgbStyle(hsvToRgb(hue, s, v))
      ctx.fillRect(x, y, 1, 1)
    }
  }
  if (marker) {
    const mx = marker.s * (w - 1)
    const my = (1 - marker.v) * (h - 1)
    strokeWithContrast(ctx, () => { ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2) }, 2)
  }
}

export function hueFromCanvasY(canvas: HTMLCanvasElement, clientY: number): number {
  const rect = canvas.getBoundingClientRect()
  const y = clientY - rect.top
  return Math.max(0, Math.min(360, (y / (canvas.height - 1)) * 360))
}

export function drawHueBar(canvas: HTMLCanvasElement | null, markerHue?: number) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const h = canvas.height
  for (let y = 0; y < h; y++) {
    const hueVal = (y / (h - 1)) * 360
    ctx.fillStyle = rgbStyle(hsvToRgb(hueVal, 1, 1))
    ctx.fillRect(0, y, canvas.width, 1)
  }
  if (markerHue !== undefined) {
    const my = (markerHue / 360) * (h - 1)
    strokeWithContrast(ctx, () => { ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(canvas.width, my) }, 3)
  }
}
