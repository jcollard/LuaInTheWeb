/**
 * Hand-coded 8×16 binary patterns for the Unicode "Block Elements"
 * range (U+2580–U+259F). These are the canonical pixel layouts as
 * drawn on an IBM VGA 8×16 cell — used as a reference for the
 * /glyph-debug page and, if needed, as a fallback when the font's
 * rasterization is incorrect.
 *
 * Mask layout: row-major Uint8Array of length 128 (8 cols × 16 rows),
 * 1 = foreground pixel, 0 = background. mask[y * 8 + x].
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

// ── Horizontal half / partial blocks (lower/upper fractions) ──

/** U+2580 ▀ UPPER HALF BLOCK — top 8 rows filled. */
const upperHalf = mask((_x, y) => (y < 8 ? 1 : 0))
/** U+2584 ▄ LOWER HALF BLOCK — bottom 8 rows filled. */
const lowerHalf = mask((_x, y) => (y >= 8 ? 1 : 0))
/** U+2588 █ FULL BLOCK — every pixel on. */
const fullBlock = mask(() => 1)

/** Helper for "lower N-eighths filled" (N = 1..8). */
function lowerEighths(n: number): Uint8Array {
  const filledRows = Math.round((n / 8) * H)
  return mask((_x, y) => (y >= H - filledRows ? 1 : 0))
}
/** Helper for "upper one eighth" and similar horizontal stripes. */
function upperEighths(n: number): Uint8Array {
  const filledRows = Math.round((n / 8) * H)
  return mask((_x, y) => (y < filledRows ? 1 : 0))
}

// ── Vertical half / partial blocks (left/right fractions) ──

/** U+258C ▌ LEFT HALF BLOCK — left 4 columns filled. */
const leftHalf = mask((x) => (x < 4 ? 1 : 0))
/** U+2590 ▐ RIGHT HALF BLOCK — right 4 columns filled. */
const rightHalf = mask((x) => (x >= 4 ? 1 : 0))

function leftEighths(n: number): Uint8Array {
  const filledCols = Math.round((n / 8) * W)
  return mask((x) => (x < filledCols ? 1 : 0))
}
function rightEighths(n: number): Uint8Array {
  const filledCols = Math.round((n / 8) * W)
  return mask((x) => (x >= W - filledCols ? 1 : 0))
}

// ── Shades (classic CGA dither) ──

// Bayer-like 4×4 dither matrix (threshold values 0..15). A pixel is
// "on" when threshold(x,y) < density. This gives visually-uniform
// coverage and matches how IBM VGA draws the classic ░▒▓ patterns.
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

/** U+2591 ░ LIGHT SHADE — 25% fill. */
const lightShade = shade(4)
/** U+2592 ▒ MEDIUM SHADE — 50% fill (checkerboard). */
const mediumShade = shade(8)
/** U+2593 ▓ DARK SHADE — 75% fill. */
const darkShade = shade(12)

// ── Quadrant blocks (U+2596..U+259F) ──
// Each quadrant is 4×8 pixels. Cell is divided into:
//   UL = (x<4, y<8), UR = (x>=4, y<8), LL = (x<4, y>=8), LR = (x>=4, y>=8)

function quadrants(ul: boolean, ur: boolean, ll: boolean, lr: boolean): Uint8Array {
  return mask((x, y) => {
    const top = y < 8, left = x < 4
    if (top && left) return ul ? 1 : 0
    if (top && !left) return ur ? 1 : 0
    if (!top && left) return ll ? 1 : 0
    return lr ? 1 : 0
  })
}

/**
 * Reference pattern table. Keys are Unicode codepoints; values are row-
 * major 128-byte masks. Only the Block Elements range is populated.
 */
export const BLOCK_GLYPH_REFERENCE: Map<number, Uint8Array> = new Map<number, Uint8Array>([
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
  [0x2596, quadrants(false, false, true,  false)],  // ▖ lower-left
  [0x2597, quadrants(false, false, false, true)],   // ▗ lower-right
  [0x2598, quadrants(true,  false, false, false)],  // ▘ upper-left
  [0x2599, quadrants(true,  false, true,  true)],   // ▙ UL + LL + LR
  [0x259A, quadrants(true,  false, false, true)],   // ▚ UL + LR
  [0x259B, quadrants(true,  true,  true,  false)],  // ▛ UL + UR + LL
  [0x259C, quadrants(true,  true,  false, true)],   // ▜ UL + UR + LR
  [0x259D, quadrants(false, true,  false, false)],  // ▝ upper-right
  [0x259E, quadrants(false, true,  true,  false)],  // ▞ UR + LL
  [0x259F, quadrants(false, true,  true,  true)],   // ▟ UR + LL + LR
])

