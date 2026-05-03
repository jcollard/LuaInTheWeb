/**
 * Render an AnsiGrid as a pixel-perfect PNG matching the editor's
 * pixel renderer. Uses the same font atlases and block-element
 * fallbacks as `PixelAnsiRenderer` so the screenshot looks identical
 * to the editor canvas.
 *
 * Codepoints absent from both the atlas and the block-element
 * fallback table render as a blank cell (background only). The live
 * pixel renderer has an extra fillText fallback for the rest of its
 * default codepoint set; we omit it here to keep export sync and
 * avoid waiting on font loading. In practice the atlas covers all
 * common ANSI-art characters.
 */

import {
  FONT_ATLASES,
  getFontById,
  getMissingBlockFallbacks,
  DEFAULT_FONT_ID,
} from '@lua-learning/lua-runtime'
import type { AnsiGrid } from './types'

export interface PngDimensions {
  width: number
  height: number
}

export function gridPngDimensions(grid: AnsiGrid, cellW: number, cellH: number): PngDimensions {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  return { width: cols * cellW, height: rows * cellH }
}

/** Output PNG dimensions for the given grid + font + integer scale (defaults to 1). */
export function scaledPngDimensions(grid: AnsiGrid, fontId: string, scale: number = 1): PngDimensions {
  const fontEntry = getFontById(fontId)
  if (!fontEntry) return { width: 0, height: 0 }
  const s = clampScale(scale)
  const { width, height } = gridPngDimensions(grid, fontEntry.cellW, fontEntry.cellH)
  return { width: width * s, height: height * s }
}

/** Allowed export scales — keep in sync with PngExportDialog's selector. */
export const PNG_EXPORT_SCALES = [1, 2, 3] as const
export type PngExportScale = typeof PNG_EXPORT_SCALES[number]

function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1
  return Math.max(1, Math.floor(scale))
}

export interface CellSize { w: number; h: number }

/**
 * Fill an entire RGBA image buffer with the rasterized grid.
 * For each cell, the glyph mask (1 = fg, 0 = bg) drives pixel color;
 * cells whose codepoint isn't in the mask map render as background only.
 *
 * One contiguous buffer + one putImageData beats per-cell putImageData
 * by ~3 orders of magnitude on a typical 80×25 grid.
 */
export function paintGridIntoBuffer(
  data: Uint8ClampedArray,
  grid: AnsiGrid,
  masks: ReadonlyMap<number, Uint8Array>,
  cell: CellSize,
  imgWidth: number,
): void {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const cw = cell.w
  const ch = cell.h
  // Reusable color lookup keyed by the mask byte: lut[0..2] = bg RGB, lut[4..6] = fg RGB.
  // Replaces per-pixel ternaries with branch-free `data[p] = lut[on*4 + chan]`.
  const lut = new Uint8ClampedArray(8)
  lut[3] = 255
  lut[7] = 255
  for (let y = 0; y < rows; y++) {
    const row = grid[y]
    const originY = y * ch
    for (let x = 0; x < cols; x++) {
      const c = row[x]
      const fg = c.fg
      const bg = c.bg
      lut[0] = bg[0]; lut[1] = bg[1]; lut[2] = bg[2]
      lut[4] = fg[0]; lut[5] = fg[1]; lut[6] = fg[2]
      const mask = masks.get(c.char.codePointAt(0) ?? 0x20)
      const originX = x * cw
      for (let py = 0; py < ch; py++) {
        let p = ((originY + py) * imgWidth + originX) * 4
        const maskRowBase = py * cw
        for (let px = 0; px < cw; px++) {
          const li = mask ? mask[maskRowBase + px] << 2 : 0
          data[p++] = lut[li]
          data[p++] = lut[li + 1]
          data[p++] = lut[li + 2]
          data[p++] = lut[li + 3]
        }
      }
    }
  }
}

function buildMaskMap(
  atlasGlyphs: ReadonlyMap<number, Uint8Array>,
  cellW: number,
  cellH: number,
): Map<number, Uint8Array> {
  const masks = new Map<number, Uint8Array>(atlasGlyphs)
  for (const [cp, mask] of getMissingBlockFallbacks(cellW, cellH, c => masks.has(c))) {
    masks.set(cp, mask)
  }
  return masks
}

function createCanvasCtx(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('pngExport: failed to get 2D context')
  ctx.imageSmoothingEnabled = false
  return { canvas, ctx }
}

function upscaleCanvas(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const w = src.width * scale
  const h = src.height * scale
  const { canvas, ctx } = createCanvasCtx(w, h)
  if (src.width > 0 && src.height > 0) ctx.drawImage(src, 0, 0, w, h)
  return canvas
}

/**
 * Paint the full grid into a fresh HTMLCanvasElement and return it.
 * `scale` upscales the output via nearest-neighbor (`drawImage` with
 * smoothing disabled). Defaults to 1× (native cell size).
 */
export function paintGridToCanvas(
  grid: AnsiGrid,
  fontId: string = DEFAULT_FONT_ID,
  scale: number = 1,
): HTMLCanvasElement {
  const fontEntry = getFontById(fontId)
  if (!fontEntry) throw new Error(`pngExport: unknown fontId "${fontId}"`)
  const atlas = FONT_ATLASES.get(fontEntry.id)
  if (!atlas) throw new Error(`pngExport: no atlas for fontId "${fontEntry.id}"`)

  const cellW = fontEntry.cellW
  const cellH = fontEntry.cellH
  const { width, height } = gridPngDimensions(grid, cellW, cellH)
  const masks = buildMaskMap(atlas.glyphs, cellW, cellH)

  const native = createCanvasCtx(width, height)
  if (width > 0 && height > 0) {
    const img = native.ctx.createImageData(width, height)
    paintGridIntoBuffer(img.data, grid, masks, { w: cellW, h: cellH }, width)
    native.ctx.putImageData(img, 0, 0)
  }

  const s = clampScale(scale)
  return s === 1 ? native.canvas : upscaleCanvas(native.canvas, s)
}

/** Render the grid and return a PNG `Blob`. Rejects if encoding fails. */
export async function gridToPngBlob(
  grid: AnsiGrid,
  fontId: string = DEFAULT_FONT_ID,
  scale: number = 1,
): Promise<Blob> {
  const canvas = paintGridToCanvas(grid, fontId, scale)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('pngExport: canvas.toBlob returned null')),
      'image/png',
    )
  })
}
