#!/usr/bin/env node
/**
 * Build-time atlas extractor: reads the EBDT/EBLC bitmap strike from a
 * TrueType font and writes a typed-array atlas for use by
 * PixelAnsiRenderer.
 *
 * Why: canvas fillText does NOT honor the font's embedded bitmap strike.
 * The runtime WOFF variant doesn't even ship the strike. Extracting the
 * 16ppem bitmap at build time and embedding it gives the renderer
 * pixel-exact glyphs without any runtime rasterization of the outline.
 *
 * Input: scripts/fonts/MxPlus_IBM_VGA_8x16.ttf (the pack's mixed
 * outline+bitmap variant — OTS-rejected by browsers, but perfectly
 * parseable in Node.js).
 *
 * Output: src/glyphAtlas.generated.ts with `export const GLYPH_ATLAS:
 * ReadonlyMap<number, Uint8Array>` — each value is a row-major 128-byte
 * binary mask (1 = foreground pixel, 0 = background).
 *
 * Run: `npm run build:glyph-atlas -w @lua-learning/lua-runtime`
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as fontkit from 'fontkit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const FONT_FILE = join(__dirname, 'fonts', 'MxPlus_IBM_VGA_8x16.ttf')
const OUTPUT_DIR = join(__dirname, '..', 'src')
const OUTPUT_TS = join(OUTPUT_DIR, 'glyphAtlas.generated.ts')

/** Target cell size. */
const CELL_W = 8
const CELL_H = 16
/** ppem we extract (must match the font's embedded strike + the renderer's cell size). */
const TARGET_PPEM = 16

/** Codepoints we need bitmaps for — same set the renderer pre-rasterizes. */
function defaultCodepointSet() {
  const out = []
  for (let c = 0x20; c <= 0x7e; c++) out.push(c)          // printable ASCII
  for (let c = 0xa0; c <= 0xff; c++) out.push(c)          // Latin-1 supplement
  for (let c = 0x2500; c <= 0x257f; c++) out.push(c)      // Box drawing
  for (let c = 0x2580; c <= 0x259f; c++) out.push(c)      // Block elements
  for (let c = 0x25a0; c <= 0x25ff; c++) out.push(c)      // Geometric shapes
  for (let c = 0x2190; c <= 0x21ff; c++) out.push(c)      // Arrows
  for (let c = 0x2660; c <= 0x266f; c++) out.push(c)      // Card suits / misc
  return out
}

/**
 * Parse the EBLC + EBDT tables manually. fontkit's built-in parser
 * only surfaces the first indexSubTable per strike, dropping glyph
 * ranges beyond ~240 — exactly the range we need for block-drawing
 * chars.
 */
function parseBitmapStrike(fontFileBuf, fontkitFont, ppem) {
  const eblcEntry = fontkitFont.directory.tables.EBLC
  const ebdtEntry = fontkitFont.directory.tables.EBDT
  if (!eblcEntry || !ebdtEntry) {
    throw new Error('Font has no EBLC/EBDT tables.')
  }
  const eblc = fontFileBuf.slice(eblcEntry.offset, eblcEntry.offset + eblcEntry.length)
  const ebdt = fontFileBuf.slice(ebdtEntry.offset, ebdtEntry.offset + ebdtEntry.length)

  const numSizes = eblc.readUInt32BE(4)
  let sizeTableOffset = 8
  for (let s = 0; s < numSizes; s++) {
    const strikeBase = sizeTableOffset
    const indexSubTableArrayOffset = eblc.readUInt32BE(strikeBase + 0)
    const numberOfIndexSubTables = eblc.readUInt32BE(strikeBase + 8)
    const strikePpemX = eblc.readUInt8(strikeBase + 44)
    const strikePpemY = eblc.readUInt8(strikeBase + 45)
    sizeTableOffset += 48
    if (strikePpemX !== ppem || strikePpemY !== ppem) continue

    // Walk subtables in this strike.
    const subtables = []
    for (let i = 0; i < numberOfIndexSubTables; i++) {
      const entryOff = indexSubTableArrayOffset + i * 8
      const firstGlyph = eblc.readUInt16BE(entryOff)
      const lastGlyph = eblc.readUInt16BE(entryOff + 2)
      const addOff = eblc.readUInt32BE(entryOff + 4)
      const subOff = indexSubTableArrayOffset + addOff
      const indexFormat = eblc.readUInt16BE(subOff)
      const imageFormat = eblc.readUInt16BE(subOff + 2)
      const imageDataOffset = eblc.readUInt32BE(subOff + 4)
      subtables.push({
        firstGlyph, lastGlyph, indexFormat, imageFormat, imageDataOffset, subOff,
      })
    }
    return { ebdt, subtables }
  }
  throw new Error(`Strike at ${ppem}ppem not found in EBLC.`)
}

/**
 * Extract an 8×16 binary mask for the given glyph id.
 * Returns null if the glyph isn't in any subtable or is in a format we
 * don't support (we only handle indexFormat=2 + imageFormat=5: fixed
 * 8×16 bitmaps, row-major 1-bit packed, 16 bytes per glyph).
 */
function extractGlyphBitmap(strike, glyphId) {
  const sub = strike.subtables.find(
    (t) => glyphId >= t.firstGlyph && glyphId <= t.lastGlyph,
  )
  if (!sub) return null
  if (sub.indexFormat !== 2 || sub.imageFormat !== 5) return null
  // indexFormat 2 + imageFormat 5: fixed-size 8×16 1-bit bitmaps packed
  // row-major, MSB-first per byte. We already verified at probe time
  // that this font's 16ppem strike uses 16 bytes per glyph.
  const IMAGE_SIZE_BYTES = 16
  const dataOff = sub.imageDataOffset + (glyphId - sub.firstGlyph) * IMAGE_SIZE_BYTES
  if (dataOff + IMAGE_SIZE_BYTES > strike.ebdt.length) return null
  const mask = new Uint8Array(CELL_W * CELL_H)
  for (let row = 0; row < CELL_H; row++) {
    const byte = strike.ebdt[dataOff + row]
    for (let col = 0; col < CELL_W; col++) {
      // MSB of byte is column 0 (standard OpenType packing).
      mask[row * CELL_W + col] = (byte >> (7 - col)) & 1
    }
  }
  return mask
}

function main() {
  if (!existsSync(FONT_FILE)) {
    throw new Error(`Font not found at ${FONT_FILE}`)
  }
  const fontBuf = readFileSync(FONT_FILE)
  const font = fontkit.openSync(FONT_FILE)
  console.log(`Loaded font: ${font.fullName}`)

  const strike = parseBitmapStrike(fontBuf, font, TARGET_PPEM)
  console.log(`Found ${TARGET_PPEM}ppem strike with ${strike.subtables.length} index subtable(s).`)

  const codepoints = defaultCodepointSet()
  const atlas = new Map()
  let extracted = 0
  let fallback = 0
  for (const cp of codepoints) {
    const glyph = font.glyphForCodePoint(cp)
    if (!glyph || glyph.id === 0) { fallback++; continue }
    const mask = extractGlyphBitmap(strike, glyph.id)
    if (mask) {
      atlas.set(cp, mask)
      extracted++
    } else {
      fallback++
    }
  }

  console.log(`Extracted ${extracted} bitmap masks; ${fallback} codepoints have no bitmap (will fall back to font rasterization at runtime).`)

  // Serialize as a compact hex-encoded map. 16 bytes per glyph; hex keeps
  // the file deterministic and reasonably small (32 hex chars per entry).
  const entries = []
  for (const [cp, mask] of atlas) {
    // Pack 128-bit mask back into 16 bytes (row-major, MSB=col 0).
    const bytes = new Uint8Array(CELL_H)
    for (let row = 0; row < CELL_H; row++) {
      let b = 0
      for (let col = 0; col < CELL_W; col++) {
        if (mask[row * CELL_W + col]) b |= 1 << (7 - col)
      }
      bytes[row] = b
    }
    const hex = Array.from(bytes, (v) => v.toString(16).padStart(2, '0')).join('')
    entries.push(`  [0x${cp.toString(16).toUpperCase().padStart(4, '0')}, '${hex}'],`)
  }

  const ts = `/* eslint-disable max-lines */
/**
 * Auto-generated bitmap atlas extracted from the MxPlus IBM VGA 8x16
 * TTF's 16ppem EBDT strike.
 *
 * DO NOT EDIT THIS FILE DIRECTLY. Run:
 *   npm run build:glyph-atlas -w @lua-learning/lua-runtime
 *
 * Each entry is a 16-character hex string encoding 16 bytes (one per
 * row); each byte's bits are unpacked MSB-first into the row's 8
 * columns. The ${atlas.size} entries below are the font's exact
 * bitmap-strike pixels at 8×16 for the covered codepoints.
 */

const CELL_W = 8
const CELL_H = 16

const ATLAS_HEX: readonly [number, string][] = [
${entries.join('\n')}
]

function unpack(hex: string): Uint8Array {
  const mask = new Uint8Array(CELL_W * CELL_H)
  for (let row = 0; row < CELL_H; row++) {
    const byte = parseInt(hex.slice(row * 2, row * 2 + 2), 16)
    for (let col = 0; col < CELL_W; col++) {
      mask[row * CELL_W + col] = (byte >> (7 - col)) & 1
    }
  }
  return mask
}

/** Codepoint → row-major 8×16 binary mask (1 = fg, 0 = bg). */
export const GLYPH_ATLAS: ReadonlyMap<number, Uint8Array> = new Map(
  ATLAS_HEX.map(([cp, hex]) => [cp, unpack(hex)]),
)
`

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_TS, ts)
  console.log(`Wrote ${OUTPUT_TS} (${ts.length} bytes)`)
}

main()
