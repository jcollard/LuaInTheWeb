#!/usr/bin/env node
/**
 * Extract the 16ppem EBDT bitmap strike from a TrueType font into a
 * runtime-importable atlas. Canvas `fillText` can't reproduce the
 * authored bitmap (the WOFF we ship at runtime doesn't even carry the
 * strike), so we read the pixels from the TTF at build time.
 *
 * fontkit 2.x's EBLC parser only surfaces the first indexSubTable per
 * strike, which silently drops block-drawing glyphs — we walk EBLC
 * manually and use fontkit only for cmap lookups.
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
      // indexFormat=2 stores a shared fixed imageSize at subOff+8.
      const imageSize = indexFormat === 2 ? eblc.readUInt32BE(subOff + 8) : 0
      subtables.push({
        firstGlyph, lastGlyph, indexFormat, imageFormat, imageDataOffset, imageSize, subOff,
      })
    }
    return { ebdt, subtables }
  }
  throw new Error(`Strike at ${ppem}ppem not found in EBLC.`)
}

/**
 * Extract the raw 16-byte row-packed bitmap for `glyphId`. Returns null
 * if the glyph isn't in any supported subtable (we handle indexFormat=2
 * + imageFormat=5: fixed row-major 1-bit bitmaps).
 */
function extractRawGlyphBytes(strike, glyphId, expectedImageSize) {
  const sub = strike.subtables.find(
    (t) => glyphId >= t.firstGlyph && glyphId <= t.lastGlyph,
  )
  if (!sub) return null
  if (sub.indexFormat !== 2 || sub.imageFormat !== 5) return null
  if (sub.imageSize !== expectedImageSize) return null
  const dataOff = sub.imageDataOffset + (glyphId - sub.firstGlyph) * sub.imageSize
  if (dataOff + sub.imageSize > strike.ebdt.length) return null
  return strike.ebdt.slice(dataOff, dataOff + sub.imageSize)
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
  const ROW_BYTES = CELL_H // 16 bytes per glyph = 16 rows × 1 byte (8 cols)
  const entries = []
  let fallback = 0
  for (const cp of codepoints) {
    const glyph = font.glyphForCodePoint(cp)
    if (!glyph || glyph.id === 0) { fallback++; continue }
    const raw = extractRawGlyphBytes(strike, glyph.id, ROW_BYTES)
    if (!raw) { fallback++; continue }
    const hex = Array.from(raw, (v) => v.toString(16).padStart(2, '0')).join('')
    entries.push(`  [0x${cp.toString(16).toUpperCase().padStart(4, '0')}, '${hex}'],`)
  }

  console.log(`Extracted ${entries.length} bitmap masks; ${fallback} codepoints fall back to font rasterization at runtime.`)

  // IIFE around the hex table so the strings are GC-able after the
  // decoded Uint8Array map is built.
  const ts = `/* eslint-disable max-lines */
/**
 * Auto-generated from MxPlus IBM VGA 8x16's 16ppem EBDT strike.
 * Run: npm run build:glyph-atlas -w @lua-learning/lua-runtime
 *
 * Each entry is 16 hex bytes (one per row, MSB = column 0).
 */

const CELL_W = 8
const CELL_H = 16

/** Codepoint → row-major 8×16 binary mask (1 = fg, 0 = bg). */
export const GLYPH_ATLAS: ReadonlyMap<number, Uint8Array> = (() => {
  const rows: readonly [number, string][] = [
${entries.join('\n')}
  ]
  const map = new Map<number, Uint8Array>()
  for (const [cp, hex] of rows) {
    const mask = new Uint8Array(CELL_W * CELL_H)
    for (let row = 0; row < CELL_H; row++) {
      const byte = parseInt(hex.slice(row * 2, row * 2 + 2), 16)
      for (let col = 0; col < CELL_W; col++) {
        mask[row * CELL_W + col] = (byte >> (7 - col)) & 1
      }
    }
    map.set(cp, mask)
  }
  return map
})()
`

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_TS, ts)
  console.log(`Wrote ${OUTPUT_TS} (${ts.length} bytes)`)
}

main()
