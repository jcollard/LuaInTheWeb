/**
 * Hand-coded 8×16 binary patterns for the Unicode "Block Elements" range
 * (U+2580–U+259F). Diagnostic reference only — consumed by the
 * `/glyph-debug` page so users can compare the font's actual glyphs
 * against a canonical Bayer-dither / fractional-block interpretation.
 *
 * NOT used as a production fallback: font-author choices for shades
 * (e.g. Int10h's `1144` ░ Bayer phase) legitimately differ from this
 * reference, and users authoring ANSI art expect the font's glyphs.
 * See plan §4.5 (dead ends) for the rationale.
 *
 * Only 8×16 is supported. Other cell sizes get `undefined` from
 * `getBlockReference(cp, cellW, cellH)` and the GlyphDebug page shows
 * a "no reference available" placeholder.
 *
 * Mask layout: row-major Uint8Array of length 128 (8 cols × 16 rows).
 * 1 = foreground, 0 = background. Index = `y * 8 + x`.
 */

const W = 8
const H = 16

function mask(fn: (x: number, y: number) => 0 | 1): Uint8Array {
  const m = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      m[y * W + x] = fn(x, y)
    }
  }
  return m
}

// Horizontal halves / eighths
const upperHalf = mask((_x, y) => (y < 8 ? 1 : 0))
const lowerHalf = mask((_x, y) => (y >= 8 ? 1 : 0))
const fullBlock = mask(() => 1)

function lowerEighths(n: number): Uint8Array {
  const filledRows = Math.round((n / 8) * H)
  return mask((_x, y) => (y >= H - filledRows ? 1 : 0))
}
function upperEighths(n: number): Uint8Array {
  const filledRows = Math.round((n / 8) * H)
  return mask((_x, y) => (y < filledRows ? 1 : 0))
}

// Vertical halves / eighths
const leftHalf = mask((x) => (x < 4 ? 1 : 0))
const rightHalf = mask((x) => (x >= 4 ? 1 : 0))

function leftEighths(n: number): Uint8Array {
  const filledCols = Math.round((n / 8) * W)
  return mask((x) => (x < filledCols ? 1 : 0))
}
function rightEighths(n: number): Uint8Array {
  const filledCols = Math.round((n / 8) * W)
  return mask((x) => (x >= W - filledCols ? 1 : 0))
}

// Shades — 4×4 Bayer dither; "on" when threshold < density.
const BAYER_4X4: readonly number[] = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
]

function shade(density: number): Uint8Array {
  return mask((x, y) => {
    const t = BAYER_4X4[(y & 3) * 4 + (x & 3)]
    return t < density ? 1 : 0
  })
}

const lightShade = shade(4)
const mediumShade = shade(8)
const darkShade = shade(12)

// Quadrant blocks — cell split into UL / UR / LL / LR at (x=4, y=8).
function quadrants(ul: boolean, ur: boolean, ll: boolean, lr: boolean): Uint8Array {
  return mask((x, y) => {
    const top = y < 8
    const left = x < 4
    if (top && left) return ul ? 1 : 0
    if (top && !left) return ur ? 1 : 0
    if (!top && left) return ll ? 1 : 0
    return lr ? 1 : 0
  })
}

/**
 * Reference pattern table. Keys are Unicode codepoints; values are
 * row-major 8×16 masks (length 128). Only Block Elements are populated.
 */
export const BLOCK_GLYPH_REFERENCE_8X16: ReadonlyMap<number, Uint8Array> = new Map([
  [0x2580, upperHalf],          // ▀
  [0x2581, lowerEighths(1)],    // ▁
  [0x2582, lowerEighths(2)],    // ▂
  [0x2583, lowerEighths(3)],    // ▃
  [0x2584, lowerHalf],          // ▄
  [0x2585, lowerEighths(5)],    // ▅
  [0x2586, lowerEighths(6)],    // ▆
  [0x2587, lowerEighths(7)],    // ▇
  [0x2588, fullBlock],          // █
  [0x2589, leftEighths(7)],     // ▉
  [0x258A, leftEighths(6)],     // ▊
  [0x258B, leftEighths(5)],     // ▋
  [0x258C, leftHalf],           // ▌
  [0x258D, leftEighths(3)],     // ▍
  [0x258E, leftEighths(2)],     // ▎
  [0x258F, leftEighths(1)],     // ▏
  [0x2590, rightHalf],          // ▐
  [0x2591, lightShade],         // ░
  [0x2592, mediumShade],        // ▒
  [0x2593, darkShade],          // ▓
  [0x2594, upperEighths(1)],    // ▔
  [0x2595, rightEighths(1)],    // ▕
  [0x2596, quadrants(false, false, true,  false)],  // ▖
  [0x2597, quadrants(false, false, false, true)],   // ▗
  [0x2598, quadrants(true,  false, false, false)],  // ▘
  [0x2599, quadrants(true,  false, true,  true)],   // ▙
  [0x259A, quadrants(true,  false, false, true)],   // ▚
  [0x259B, quadrants(true,  true,  true,  false)],  // ▛
  [0x259C, quadrants(true,  true,  false, true)],   // ▜
  [0x259D, quadrants(false, true,  false, false)],  // ▝
  [0x259E, quadrants(false, true,  true,  false)],  // ▞
  [0x259F, quadrants(false, true,  true,  true)],   // ▟
])

/**
 * Look up a reference mask for a given codepoint at a given cell size.
 * Returns `undefined` when no reference is available (non-8×16 cell,
 * or codepoint outside the Block Elements range).
 */
export function getBlockReference(
  codepoint: number,
  cellW: number,
  cellH: number,
): Uint8Array | undefined {
  if (cellW !== W || cellH !== H) return undefined
  return BLOCK_GLYPH_REFERENCE_8X16.get(codepoint)
}
