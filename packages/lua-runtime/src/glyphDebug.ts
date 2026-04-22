/**
 * Single-glyph fillText rasterization used by the /glyph-debug page.
 * Keep separate from the hot-path renderer — this allocates per call
 * and returns both raw alpha and thresholded mask for inspection.
 */

import { getFontById } from './fontRegistry'

export interface GlyphDebugInfo {
  codepoint: number
  char: string
  cellW: number
  cellH: number
  /** Row-major alpha values (0..255) as produced by fillText. */
  rawAlpha: Uint8Array
  /** Binary mask after alpha ≥ 128 threshold. */
  mask: Uint8Array
  /** True iff any pixel of the mask is set. */
  hasContent: boolean
}

function emptyInfo(cp: number, cellW: number, cellH: number): GlyphDebugInfo {
  const zero = new Uint8Array(cellW * cellH)
  return {
    codepoint: cp,
    char: String.fromCodePoint(cp),
    cellW,
    cellH,
    rawAlpha: zero,
    mask: zero,
    hasContent: false,
  }
}

/**
 * Rasterize one glyph at the given font's native cell size via fillText
 * + alpha threshold. Used by the diagnostic page to show what xterm-path
 * rendering would look like for this codepoint. Non-browser environments
 * return an empty mask.
 */
export async function rasterizeGlyphForDebug(
  codepoint: number,
  fontId: string,
): Promise<GlyphDebugInfo> {
  const entry = getFontById(fontId)
  if (!entry) throw new Error(`rasterizeGlyphForDebug: unknown fontId "${fontId}"`)
  const { cellW, cellH, fontFamily } = entry

  if (typeof document === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return emptyInfo(codepoint, cellW, cellH)
  }

  try {
    if ('fonts' in document) await document.fonts.load(`${cellH}px ${fontFamily}`)
  } catch { /* non-browser, continue best-effort */ }

  const gc = new OffscreenCanvas(cellW, cellH)
  const ctx = gc.getContext('2d')
  if (!ctx) return emptyInfo(codepoint, cellW, cellH)

  ctx.textBaseline = 'top'
  ctx.font = `${cellH}px ${fontFamily}`
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.clearRect(0, 0, cellW, cellH)
  ctx.fillText(String.fromCodePoint(codepoint), 0, 0)

  const img = ctx.getImageData(0, 0, cellW, cellH)
  const total = cellW * cellH
  const rawAlpha = new Uint8Array(total)
  const mask = new Uint8Array(total)
  let hasContent = false
  for (let i = 0; i < total; i++) {
    const alpha = img.data[(i << 2) + 3]
    rawAlpha[i] = alpha
    if (alpha >= 128) { mask[i] = 1; hasContent = true }
  }
  return {
    codepoint,
    char: String.fromCodePoint(codepoint),
    cellW,
    cellH,
    rawAlpha,
    mask,
    hasContent,
  }
}
