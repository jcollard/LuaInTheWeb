import type { AnsiGrid, RGBColor } from './types'
import { DEFAULT_ANSI_COLS, DEFAULT_ANSI_ROWS, HALF_BLOCK, DEFAULT_CELL, TRANSPARENT_HALF } from './types'
import { rgbEqual } from './layerUtils'

export interface ScaledSize {
  width: number
  height: number
}

/**
 * Compute dimensions that fit within maxW x maxH while preserving aspect ratio.
 * Never upscales — if src is smaller, returns src dimensions unchanged.
 */
export function computeScaledSize(
  srcW: number, srcH: number, maxW: number, maxH: number,
): ScaledSize {
  if (srcW <= 0 || srcH <= 0) return { width: 0, height: 0 }
  if (srcW <= maxW && srcH <= maxH) return { width: srcW, height: srcH }
  const scale = Math.min(maxW / srcW, maxH / srcH)
  return {
    width: Math.round(srcW * scale),
    height: Math.round(srcH * scale),
  }
}

/**
 * Convert an RGBA pixel buffer to an AnsiGrid using HALF_BLOCK encoding.
 * Each cell encodes two vertical pixels: fg = top pixel, bg = bottom pixel.
 * Pixels with alpha < 128 are treated as transparent (TRANSPARENT_HALF).
 * Cells where both halves are transparent become DEFAULT_CELL (transparent in layer system).
 *
 * `cols`/`rows` control the output grid size and pixel bounds. Defaults to 80×25.
 */
export function rgbaToAnsiGrid(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  cols: number = DEFAULT_ANSI_COLS,
  rows: number = DEFAULT_ANSI_ROWS,
): AnsiGrid {
  const grid: AnsiGrid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...DEFAULT_CELL }))
  )

  for (let py = 0; py < height; py += 2) {
    const row = py >> 1
    if (row >= rows) break
    for (let px = 0; px < width; px++) {
      if (px >= cols) break

      const topIdx = (py * width + px) * 4
      const topAlpha = rgba[topIdx + 3]
      const topColor: RGBColor = topAlpha >= 128
        ? [rgba[topIdx], rgba[topIdx + 1], rgba[topIdx + 2]]
        : [...TRANSPARENT_HALF]

      let bottomColor: RGBColor = [...TRANSPARENT_HALF]
      if (py + 1 < height) {
        const botIdx = ((py + 1) * width + px) * 4
        const botAlpha = rgba[botIdx + 3]
        if (botAlpha >= 128) {
          bottomColor = [rgba[botIdx], rgba[botIdx + 1], rgba[botIdx + 2]]
        }
      }

      if (rgbEqual(topColor, TRANSPARENT_HALF) && rgbEqual(bottomColor, TRANSPARENT_HALF)) {
        continue // leave as DEFAULT_CELL
      }

      grid[row][px] = { char: HALF_BLOCK, fg: topColor, bg: bottomColor }
    }
  }

  return grid
}

export interface PngPixels {
  rgba: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Load a PNG file, decode it, scale to fit the given pixel bounds, and return the RGBA buffer.
 * `cols`/`rows` control the max dimensions (rows are doubled for half-block encoding).
 * Uses createImageBitmap + OffscreenCanvas for browser-native decoding.
 */
export async function loadPngPixels(
  file: File,
  cols: number = DEFAULT_ANSI_COLS,
  rows: number = DEFAULT_ANSI_ROWS,
): Promise<PngPixels> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(`Failed to decode image "${file.name}". The file may be corrupted or not a supported image format.`)
  }

  const { width, height } = computeScaledSize(bitmap.width, bitmap.height, cols, rows * 2)

  if (width === 0 || height === 0) {
    bitmap.close()
    return { rgba: new Uint8ClampedArray(0), width: 0, height: 0 }
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Failed to create 2D canvas context for image processing.')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, width, height)
  return { rgba: imageData.data, width, height }
}
