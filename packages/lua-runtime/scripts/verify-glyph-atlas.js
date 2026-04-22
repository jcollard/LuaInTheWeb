#!/usr/bin/env node
/**
 * Verify that the generated glyph atlas matches the source font's EBDT
 * bitmap strike byte-for-byte.
 *
 * The atlas generator (generate-glyph-atlas.js) post-processes glyphs for
 * 9-wide fonts: `replicateLastColumnIfNeeded` copies col (cellW-2) into
 * col (cellW-1) for codepoints U+2500..U+259F. That divergence is the
 * IBM VGA "line graphics enable" emulation — it's intentional, but it
 * means the atlas no longer matches the authored bitmap.
 *
 * This tool re-extracts the raw EBDT bytes, diffs them against the
 * post-processed atlas, and reports every divergence. Exits non-zero
 * when the atlas differs from the source font.
 *
 * Flags:
 *   --font <id>        Restrict verification to one font id
 *   --cp <hex>         Restrict to one codepoint (e.g. --cp 2592)
 *   --visual           Print before/after glyph bitmaps for divergences
 *   --max <n>          Cap the number of per-glyph details printed (default 20)
 */
/* eslint-disable no-console */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as fontkit from 'fontkit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_ROOT = join(__dirname, '..')
const ATLAS_PATH = join(PACKAGE_ROOT, 'src', 'glyphAtlas.generated.ts')

const FONTS = [
  { id: 'IBM_CGA_8x8',   ttfPath: 'scripts/fonts/MxPlus_IBM_CGA.ttf',       cellW: 8, cellH: 8,  nativePpem: 8  },
  { id: 'IBM_VGA_8x16',  ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_8x16.ttf',  cellW: 8, cellH: 16, nativePpem: 16 },
  { id: 'IBM_VGA_9x16',  ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_9x16.ttf',  cellW: 9, cellH: 16, nativePpem: 16 },
]

function parseFlags(argv) {
  const flags = { font: null, cp: null, visual: false, max: 20 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--font') flags.font = argv[++i]
    else if (a === '--cp') flags.cp = parseInt(argv[++i], 16)
    else if (a === '--visual') flags.visual = true
    else if (a === '--max') flags.max = parseInt(argv[++i], 10)
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0) }
    else { console.error(`unknown flag: ${a}`); process.exit(2) }
  }
  return flags
}

function printHelp() {
  console.log(`verify-glyph-atlas — diff generated atlas against source font EBDT

Usage: node scripts/verify-glyph-atlas.js [--font <id>] [--cp <hex>] [--visual] [--max <n>]`)
}

function parseBitmapStrike(fontBuf, fontkitFont, ppem) {
  const eblcEntry = fontkitFont.directory.tables.EBLC
  const ebdtEntry = fontkitFont.directory.tables.EBDT
  if (!eblcEntry || !ebdtEntry) throw new Error('no EBLC/EBDT tables')
  const eblc = fontBuf.subarray(eblcEntry.offset, eblcEntry.offset + eblcEntry.length)
  const ebdt = fontBuf.subarray(ebdtEntry.offset, ebdtEntry.offset + ebdtEntry.length)

  const numSizes = eblc.readUInt32BE(4)
  let cursor = 8
  for (let s = 0; s < numSizes; s++) {
    const indexSubTableArrayOffset = eblc.readUInt32BE(cursor + 0)
    const numberOfIndexSubTables = eblc.readUInt32BE(cursor + 8)
    const strikePpemX = eblc.readUInt8(cursor + 44)
    const strikePpemY = eblc.readUInt8(cursor + 45)
    cursor += 48
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
      const imageSize = indexFormat === 2 ? eblc.readUInt32BE(subOff + 8) : 0
      subtables.push({ firstGlyph, lastGlyph, indexFormat, imageFormat, imageDataOffset, imageSize })
    }
    return { ebdt, subtables }
  }
  throw new Error(`no strike at ${ppem}ppem`)
}

function extractGlyphBytes(strike, glyphId, bytesPerGlyph) {
  const sub = strike.subtables.find((t) => glyphId >= t.firstGlyph && glyphId <= t.lastGlyph)
  if (!sub) return null
  if (sub.indexFormat !== 2 || sub.imageFormat !== 5) return null
  if (sub.imageSize !== bytesPerGlyph) return null
  const off = sub.imageDataOffset + (glyphId - sub.firstGlyph) * sub.imageSize
  if (off + sub.imageSize > strike.ebdt.length) return null
  return strike.ebdt.subarray(off, off + sub.imageSize)
}

function bytesToMask(bytes, cellW, cellH) {
  const total = cellW * cellH
  const mask = new Uint8Array(total)
  for (let p = 0; p < total; p++) {
    mask[p] = (bytes[p >> 3] >> (7 - (p & 7))) & 1
  }
  return mask
}

/**
 * Parse glyphAtlas.generated.ts and extract the raw hex table for each
 * registered font. We read the file as text and pull the (cp, hex) pairs
 * out of the RAW array literal — avoids needing TS compile/loader here.
 */
function loadAtlasHex() {
  if (!existsSync(ATLAS_PATH)) {
    throw new Error(`atlas not found at ${ATLAS_PATH} — run: npm run build:glyph-atlas -w @lua-learning/lua-runtime`)
  }
  const src = readFileSync(ATLAS_PATH, 'utf8')
  const atlases = {}
  const blockRe = /\{\s*id:\s*"([^"]+)",\s*cellW:\s*(\d+),\s*cellH:\s*(\d+),\s*hex:\s*\[([\s\S]*?)\],\s*\},/g
  const entryRe = /\[0x([0-9A-Fa-f]+),\s*'([0-9a-f]+)'\]/g
  let m
  while ((m = blockRe.exec(src)) !== null) {
    const [, id, cellW, cellH, body] = m
    const glyphs = new Map()
    let e
    while ((e = entryRe.exec(body)) !== null) {
      glyphs.set(parseInt(e[1], 16), e[2])
    }
    atlases[id] = { cellW: +cellW, cellH: +cellH, glyphs }
  }
  return atlases
}

function renderGlyph(mask, cellW, cellH) {
  const lines = []
  for (let r = 0; r < cellH; r++) {
    let line = ''
    for (let c = 0; c < cellW; c++) line += mask[r * cellW + c] ? '█' : '·'
    lines.push(line)
  }
  return lines
}

function hexToMask(hex, cellW, cellH) {
  const total = cellW * cellH
  const mask = new Uint8Array(total)
  for (let p = 0; p < total; p++) {
    const byte = parseInt(hex.slice((p >> 3) * 2, (p >> 3) * 2 + 2), 16)
    mask[p] = (byte >> (7 - (p & 7))) & 1
  }
  return mask
}

function verifyFont(entry, atlasHex, flags) {
  const ttfAbs = join(PACKAGE_ROOT, entry.ttfPath)
  const fontBuf = readFileSync(ttfAbs)
  const font = fontkit.openSync(ttfAbs)
  const strike = parseBitmapStrike(fontBuf, font, entry.nativePpem)
  const bytesPerGlyph = Math.ceil((entry.cellW * entry.cellH) / 8)

  const atlas = atlasHex[entry.id]
  if (!atlas) {
    console.log(`  ${entry.id}: SKIP — no entry in generated atlas`)
    return { ok: true, checked: 0, diverged: [] }
  }
  if (atlas.cellW !== entry.cellW || atlas.cellH !== entry.cellH) {
    console.log(`  ${entry.id}: FAIL — cell size mismatch (atlas ${atlas.cellW}x${atlas.cellH} vs font ${entry.cellW}x${entry.cellH})`)
    return { ok: false, checked: 0, diverged: [] }
  }

  const diverged = []
  let checked = 0
  for (const [cp, atlasHexStr] of atlas.glyphs) {
    if (flags.cp !== null && cp !== flags.cp) continue
    const glyph = font.glyphForCodePoint(cp)
    if (!glyph || glyph.id === 0) continue
    const raw = extractGlyphBytes(strike, glyph.id, bytesPerGlyph)
    if (!raw) continue
    checked++
    const atlasMask = hexToMask(atlasHexStr, entry.cellW, entry.cellH)
    const fontMask = bytesToMask(raw, entry.cellW, entry.cellH)
    const diffCols = new Set()
    const diffRows = new Set()
    let diffPixels = 0
    for (let r = 0; r < entry.cellH; r++) {
      for (let c = 0; c < entry.cellW; c++) {
        const i = r * entry.cellW + c
        if (atlasMask[i] !== fontMask[i]) {
          diffCols.add(c); diffRows.add(r); diffPixels++
        }
      }
    }
    if (diffPixels > 0) diverged.push({ cp, diffPixels, diffCols, diffRows, atlasMask, fontMask })
  }

  return { ok: diverged.length === 0, checked, diverged }
}

function printDivergences(entry, diverged, flags) {
  const shown = diverged.slice(0, flags.max)
  for (const d of shown) {
    const cps = `U+${d.cp.toString(16).toUpperCase().padStart(4, '0')}`
    const cols = [...d.diffCols].sort((a, b) => a - b).join(',')
    console.log(`    ${cps} ${String.fromCodePoint(d.cp)}: ${d.diffPixels}px differ — cols [${cols}], rows [${d.diffRows.size}/${entry.cellH}]`)
    if (flags.visual) {
      const atlas = renderGlyph(d.atlasMask, entry.cellW, entry.cellH)
      const src = renderGlyph(d.fontMask, entry.cellW, entry.cellH)
      console.log(`      atlas${' '.repeat(Math.max(entry.cellW - 5, 0))}    source`)
      for (let r = 0; r < entry.cellH; r++) console.log(`      ${atlas[r]}    ${src[r]}`)
      console.log('')
    }
  }
  if (diverged.length > shown.length) {
    console.log(`    ... ${diverged.length - shown.length} more (pass --max ${diverged.length} to show all)`)
  }
}

function main() {
  const flags = parseFlags(process.argv.slice(2))
  const atlasHex = loadAtlasHex()

  let overallOk = true
  let totalChecked = 0
  let totalDiverged = 0

  for (const entry of FONTS) {
    if (flags.font && entry.id !== flags.font) continue
    console.log(`${entry.id} (${entry.cellW}×${entry.cellH}):`)
    const result = verifyFont(entry, atlasHex, flags)
    totalChecked += result.checked
    totalDiverged += result.diverged.length
    if (result.ok) {
      console.log(`  OK — ${result.checked} glyphs match source EBDT`)
    } else {
      overallOk = false
      console.log(`  DIVERGES — ${result.diverged.length}/${result.checked} glyphs differ from source EBDT`)
      printDivergences(entry, result.diverged, flags)
    }
  }

  console.log('')
  console.log(`Summary: checked ${totalChecked} glyphs, ${totalDiverged} diverge from source`)
  process.exit(overallOk ? 0 : 1)
}

main()
