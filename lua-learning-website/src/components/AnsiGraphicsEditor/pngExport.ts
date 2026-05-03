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
import type { AnsiGrid, RGBColor } from './types'

export interface PngDimensions {
  width: number
  height: number
}

export function gridPngDimensions(grid: AnsiGrid, cellW: number, cellH: number): PngDimensions {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  return { width: cols * cellW, height: rows * cellH }
}

/**
 * Paint a single cell into a `cellW × cellH` ImageData buffer.
 * Pixels where `mask[i] === 1` get foreground; the rest get background.
 * If `mask` is undefined the whole cell is painted with background
 * (used for codepoints with no available glyph).
 */
export function paintCellInto(
  data: Uint8ClampedArray,
  mask: Uint8Array | undefined,
  fg: RGBColor,
  bg: RGBColor,
  cellW: number,
  cellH: number,
): void {
  const len = cellW * cellH
  let p = 0
  for (let i = 0; i < len; i++) {
    const on = mask ? mask[i] : 0
    data[p] = on ? fg[0] : bg[0]
    data[p + 1] = on ? fg[1] : bg[1]
    data[p + 2] = on ? fg[2] : bg[2]
    data[p + 3] = 255
    p += 4
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

/** Paint the full grid into a fresh HTMLCanvasElement and return it. */
export function paintGridToCanvas(grid: AnsiGrid, fontId: string = DEFAULT_FONT_ID): HTMLCanvasElement {
  const fontEntry = getFontById(fontId)
  if (!fontEntry) throw new Error(`pngExport: unknown fontId "${fontId}"`)
  const atlas = FONT_ATLASES.get(fontEntry.id)
  if (!atlas) throw new Error(`pngExport: no atlas for fontId "${fontEntry.id}"`)

  const cellW = fontEntry.cellW
  const cellH = fontEntry.cellH
  const { width, height } = gridPngDimensions(grid, cellW, cellH)
  const masks = buildMaskMap(atlas.glyphs, cellW, cellH)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('pngExport: failed to get 2D context')
  ctx.imageSmoothingEnabled = false

  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (rows === 0 || cols === 0) return canvas

  const cellImg = ctx.createImageData(cellW, cellH)
  for (let y = 0; y < rows; y++) {
    const row = grid[y]
    for (let x = 0; x < cols; x++) {
      const cell = row[x]
      const code = cell.char.codePointAt(0) ?? 0x20
      paintCellInto(cellImg.data, masks.get(code), cell.fg, cell.bg, cellW, cellH)
      ctx.putImageData(cellImg, x * cellW, y * cellH)
    }
  }
  return canvas
}

/** Render the grid and return a PNG `Blob`. Rejects if encoding fails. */
export async function gridToPngBlob(grid: AnsiGrid, fontId: string = DEFAULT_FONT_ID): Promise<Blob> {
  const canvas = paintGridToCanvas(grid, fontId)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('pngExport: canvas.toBlob returned null')),
      'image/png',
    )
  })
}
