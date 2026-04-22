#!/usr/bin/env node
/**
 * Extract native-ppem EBDT bitmap strikes from every registered font and
 * emit `src/glyphAtlas.generated.ts` as a `FONT_ATLASES: Map<id, FontAtlas>`.
 * Canvas `fillText` won't honor embedded bitmap strikes (§4.4 of the renderer
 * plan), so the pixel renderer paints from these pre-extracted masks.
 *
 * fontkit 2.x's EBLC parser silently drops all but the first indexSubTable
 * per strike — we walk EBLC by hand and use fontkit only for cmap lookups.
 *
 * The FONTS array below must stay in sync with `src/fontRegistry.ts`. The
 * vitest test asserts every registry entry has a non-empty atlas.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as fontkit from 'fontkit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(PACKAGE_ROOT, 'src')
const OUTPUT_TS = join(OUTPUT_DIR, 'glyphAtlas.generated.ts')

const FONTS = [
  { id: 'IBM_CGA_8x8',   ttfPath: 'scripts/fonts/MxPlus_IBM_CGA.ttf',       cellW: 8, cellH: 8,  nativePpem: 8  },
  { id: 'IBM_VGA_8x16',  ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_8x16.ttf',  cellW: 8, cellH: 16, nativePpem: 16 },
  { id: 'IBM_VGA_9x16',  ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_9x16.ttf',  cellW: 9, cellH: 16, nativePpem: 16 },
]

const CODEPOINTS = (() => {
  const out = []
  for (let c = 0x20; c <= 0x7e; c++) out.push(c)          // printable ASCII
  for (let c = 0xa0; c <= 0xff; c++) out.push(c)          // Latin-1 supplement
  for (let c = 0x2500; c <= 0x257f; c++) out.push(c)      // Box drawing
  for (let c = 0x2580; c <= 0x259f; c++) out.push(c)      // Block elements
  for (let c = 0x25a0; c <= 0x25ff; c++) out.push(c)      // Geometric shapes
  for (let c = 0x2190; c <= 0x21ff; c++) out.push(c)      // Arrows
  for (let c = 0x2660; c <= 0x266f; c++) out.push(c)      // Card suits / misc
  return out
})()

function parseBitmapStrike(fontBuf, fontkitFont, ppem) {
  const eblcEntry = fontkitFont.directory.tables.EBLC
  const ebdtEntry = fontkitFont.directory.tables.EBDT
  if (!eblcEntry || !ebdtEntry) throw new Error('no EBLC/EBDT tables')
  const eblc = fontBuf.subarray(eblcEntry.offset, eblcEntry.offset + eblcEntry.length)
  const ebdt = fontBuf.subarray(ebdtEntry.offset, ebdtEntry.offset + ebdtEntry.length)

  const numSizes = eblc.readUInt32BE(4)
  const available = []
  let cursor = 8
  for (let s = 0; s < numSizes; s++) {
    const strikeBase = cursor
    const indexSubTableArrayOffset = eblc.readUInt32BE(strikeBase + 0)
    const numberOfIndexSubTables = eblc.readUInt32BE(strikeBase + 8)
    const strikePpemX = eblc.readUInt8(strikeBase + 44)
    const strikePpemY = eblc.readUInt8(strikeBase + 45)
    cursor += 48
    available.push(strikePpemY)
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
      // indexFormat=2 stores one shared imageSize at subOff+8.
      const imageSize = indexFormat === 2 ? eblc.readUInt32BE(subOff + 8) : 0
      subtables.push({ firstGlyph, lastGlyph, indexFormat, imageFormat, imageDataOffset, imageSize })
    }
    return { ebdt, subtables }
  }
  throw new Error(`no strike at ${ppem}ppem (available: ${available.join(', ') || 'none'})`)
}

/**
 * Unpack bit-aligned (imageFormat=5) bytes into a per-pixel mask.
 * Bits are MSB-first, packed across the full cellW*cellH bitmap with
 * no row padding.
 */
function extractGlyphBytes(strike, glyphId, bytesPerGlyph) {
  const sub = strike.subtables.find((t) => glyphId >= t.firstGlyph && glyphId <= t.lastGlyph)
  if (!sub) return null
  // Only indexFormat=2 + imageFormat=5 (fixed row-major 1-bit) is supported.
  // See docs/ansi/renderer-implementation-plan.md §A.3.
  if (sub.indexFormat !== 2 || sub.imageFormat !== 5) return null
  if (sub.imageSize !== bytesPerGlyph) return null
  const off = sub.imageDataOffset + (glyphId - sub.firstGlyph) * sub.imageSize
  if (off + sub.imageSize > strike.ebdt.length) return null
  return strike.ebdt.subarray(off, off + sub.imageSize)
}

function extractAtlas(entry) {
  const ttfAbs = join(PACKAGE_ROOT, entry.ttfPath)
  if (!existsSync(ttfAbs)) throw new Error(`[${entry.id}] TTF not found: ${ttfAbs}`)
  const fontBuf = readFileSync(ttfAbs)
  const font = fontkit.openSync(ttfAbs)

  // imageFormat=5 stores glyph bits packed across the entire cellW*cellH
  // bitmap with NO row-padding bits. For 8-wide glyphs this coincides with
  // bytesPerRow*cellH (each row is exactly 8 bits). For 9-wide glyphs,
  // rows span byte boundaries — a 9x16 glyph is 144 bits = 18 bytes, not
  // 2 bytes per row * 16 = 32.
  const bytesPerGlyph = Math.ceil((entry.cellW * entry.cellH) / 8)

  let strike
  try {
    strike = parseBitmapStrike(fontBuf, font, entry.nativePpem)
  } catch (err) {
    throw new Error(`[${entry.id}] ${err.message}`)
  }

  const glyphs = []
  let missing = 0
  for (const cp of CODEPOINTS) {
    const glyph = font.glyphForCodePoint(cp)
    if (!glyph || glyph.id === 0) { missing++; continue }
    const raw = extractGlyphBytes(strike, glyph.id, bytesPerGlyph)
    if (!raw) { missing++; continue }
    const hex = Array.from(raw, (v) => v.toString(16).padStart(2, '0')).join('')
    glyphs.push([cp, hex])
  }

  if (glyphs.length === 0) {
    throw new Error(`[${entry.id}] extracted zero glyphs — is this really a bitmap font at ${entry.nativePpem}ppem?`)
  }

  console.log(`  [${entry.id}] ${glyphs.length} glyphs, ${missing} missing (fall back at runtime)`)
  return glyphs
}

function emit(atlases) {
  const lines = []
  lines.push('/* eslint-disable max-lines */')
  lines.push('/**')
  lines.push(' * AUTO-GENERATED from the registered fonts\' native-ppem EBDT strikes.')
  lines.push(' * Regenerate: npm run build:glyph-atlas -w @lua-learning/lua-runtime')
  lines.push(' *')
  lines.push(' * Hex is bit-packed across the entire cellW*cellH bitmap, MSB-first,')
  lines.push(' * with NO row-padding bits. A 9x16 glyph is exactly 144 bits = 18 bytes.')
  lines.push(' */')
  lines.push('')
  lines.push('export interface FontAtlas {')
  lines.push('  readonly id: string')
  lines.push('  readonly cellW: number')
  lines.push('  readonly cellH: number')
  lines.push('  /** codepoint → row-major binary mask (1 byte per pixel, length cellW*cellH) */')
  lines.push('  readonly glyphs: ReadonlyMap<number, Uint8Array>')
  lines.push('}')
  lines.push('')
  lines.push('interface RawAtlas {')
  lines.push('  id: string')
  lines.push('  cellW: number')
  lines.push('  cellH: number')
  lines.push('  hex: readonly (readonly [number, string])[]')
  lines.push('}')
  lines.push('')
  lines.push('const RAW: readonly RawAtlas[] = [')
  for (const { entry, glyphs } of atlases) {
    lines.push('  {')
    lines.push(`    id: ${JSON.stringify(entry.id)},`)
    lines.push(`    cellW: ${entry.cellW},`)
    lines.push(`    cellH: ${entry.cellH},`)
    lines.push('    hex: [')
    for (const [cp, hex] of glyphs) {
      lines.push(`      [0x${cp.toString(16).toUpperCase().padStart(4, '0')}, '${hex}'],`)
    }
    lines.push('    ],')
    lines.push('  },')
  }
  lines.push('] as const')
  lines.push('')
  lines.push('function decode(raw: RawAtlas): FontAtlas {')
  lines.push('  const totalPixels = raw.cellW * raw.cellH')
  lines.push('  const cells = new Map<number, Uint8Array>()')
  lines.push('  for (const [cp, hex] of raw.hex) {')
  lines.push('    const mask = new Uint8Array(totalPixels)')
  lines.push('    for (let p = 0; p < totalPixels; p++) {')
  lines.push('      const byteIdx = p >> 3')
  lines.push('      const bitIdx = 7 - (p & 7)')
  lines.push('      const byte = parseInt(hex.slice(byteIdx * 2, byteIdx * 2 + 2), 16)')
  lines.push('      mask[p] = (byte >> bitIdx) & 1')
  lines.push('    }')
  lines.push('    cells.set(cp, mask)')
  lines.push('  }')
  lines.push('  return { id: raw.id, cellW: raw.cellW, cellH: raw.cellH, glyphs: cells }')
  lines.push('}')
  lines.push('')
  lines.push('export const FONT_ATLASES: ReadonlyMap<string, FontAtlas> = new Map(')
  lines.push('  RAW.map((r) => [r.id, decode(r)] as const),')
  lines.push(')')
  lines.push('')
  return lines.join('\n')
}

function main() {
  console.log(`Generating glyph atlas for ${FONTS.length} fonts...`)
  const out = []
  for (const entry of FONTS) {
    out.push({ entry, glyphs: extractAtlas(entry) })
  }
  const ts = emit(out)
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_TS, ts)
  console.log(`Wrote ${OUTPUT_TS} (${(ts.length / 1024).toFixed(1)} KB)`)
}

main()
