/**
 * Fallback-path glyph rasterization used by both the hot-path renderer
 * (for codepoints missing from the atlas) and the `/glyph-debug` page.
 * Runs `fillText` into an offscreen canvas, thresholds the alpha channel
 * to a 1-bit mask. Note: `fillText` does NOT honor embedded bitmap
 * strikes, so shade / dither characters rasterize as blurry outlines —
 * that's the whole reason the atlas path exists.
 */

type GlyphContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function get2DContext(c: HTMLCanvasElement | OffscreenCanvas): GlyphContext2D | null {
  if (typeof OffscreenCanvas !== 'undefined' && c instanceof OffscreenCanvas) {
    return c.getContext('2d')
  }
  return (c as HTMLCanvasElement).getContext('2d')
}

/**
 * Build an off-screen 2D context sized at `cellW × cellH`, with the
 * requested font already set and image smoothing disabled. Awaits
 * `document.fonts.load` in browser environments so the first fillText
 * uses the real font rather than the fallback. Returns null when no
 * canvas is available (jsdom tests, SSR).
 */
export async function createGlyphContext(
  fontFamily: string,
  cellW: number,
  cellH: number,
): Promise<GlyphContext2D | null> {
  try {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.load(`${cellH}px ${fontFamily}`)
    }
  } catch { /* non-browser environment — continue with whatever is available */ }

  let gc: HTMLCanvasElement | OffscreenCanvas
  if (typeof OffscreenCanvas !== 'undefined') {
    gc = new OffscreenCanvas(cellW, cellH)
  } else if (typeof document !== 'undefined') {
    gc = document.createElement('canvas')
    gc.width = cellW
    gc.height = cellH
  } else {
    return null
  }
  const ctx = get2DContext(gc)
  if (!ctx) return null
  ctx.textBaseline = 'top'
  ctx.font = `${cellH}px ${fontFamily}`
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  return ctx
}

export interface RasterizedGlyph {
  /** Row-major binary mask, length `cellW * cellH`. */
  mask: Uint8Array
  /**
   * Row-major alpha (0..255) — only populated when the caller asked for
   * it via `keepRawAlpha`. Diagnostic use only; the hot-path renderer
   * does not need this.
   */
  rawAlpha?: Uint8Array
  /** True iff at least one pixel passed the α ≥ 128 threshold. */
  hasContent: boolean
}

/**
 * Rasterize one codepoint via `fillText` and threshold the alpha channel.
 * With `keepRawAlpha: true` the returned object also carries the raw
 * alpha buffer — used by `/glyph-debug` to show the pre-threshold AA.
 */
export function rasterizeGlyph(
  ctx: GlyphContext2D,
  codepoint: number,
  cellW: number,
  cellH: number,
  opts: { keepRawAlpha?: boolean } = {},
): RasterizedGlyph {
  ctx.clearRect(0, 0, cellW, cellH)
  ctx.fillText(String.fromCodePoint(codepoint), 0, 0)
  const img = ctx.getImageData(0, 0, cellW, cellH)
  const total = cellW * cellH
  const mask = new Uint8Array(total)
  const rawAlpha = opts.keepRawAlpha ? new Uint8Array(total) : undefined
  let hasContent = false
  for (let i = 0; i < total; i++) {
    const alpha = img.data[(i << 2) + 3]
    if (rawAlpha) rawAlpha[i] = alpha
    if (alpha >= 128) {
      mask[i] = 1
      hasContent = true
    }
  }
  return { mask, rawAlpha, hasContent }
}
