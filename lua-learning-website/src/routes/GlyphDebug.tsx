import { memo, useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  BITMAP_FONT_REGISTRY,
  DEFAULT_FONT_ID,
  FONT_ATLASES,
  getBlockReference,
  getFontById,
  rasterizeGlyphForDebug,
  type GlyphDebugInfo,
} from '@lua-learning/lua-runtime'
import styles from './GlyphDebug.module.css'

const DISPLAY_SCALE = 16

function blockElementCodepoints(): number[] {
  const out: number[] = []
  for (let c = 0x2580; c <= 0x259f; c++) out.push(c)
  return out
}

/**
 * Parse codepoint input. Accepts:
 *   - single character (literal) → its codePointAt(0)
 *   - "U+XXXX" / "u+XXXX" → hex
 *   - "0xXXXX" / "0XXXXX" → hex
 *   - "9730" → decimal
 * Falls back to U+2592 on bad input.
 */
function parseCodepoint(raw: string, fallback: number): number {
  const s = raw.trim()
  if (s.length === 0) return fallback
  const upper = s.toUpperCase()
  if (upper.startsWith('U+')) {
    const n = parseInt(upper.slice(2), 16)
    return Number.isFinite(n) ? n : fallback
  }
  if (upper.startsWith('0X')) {
    const n = parseInt(upper.slice(2), 16)
    return Number.isFinite(n) ? n : fallback
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : fallback
  }
  return s.codePointAt(0) ?? fallback
}

function hexCodepoint(cp: number): string {
  return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
}

function countOn(mask: Uint8Array): number {
  let n = 0
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++
  return n
}

function avgAlpha(raw: Uint8Array): number {
  let s = 0
  for (let i = 0; i < raw.length; i++) s += raw[i]
  return s / raw.length
}

interface PixelGridProps {
  /** Row-major; alphaMode=true: 0..255 per pixel. alphaMode=false: 0 or 1. */
  data: Uint8Array
  cellW: number
  cellH: number
  alphaMode: boolean
}

function pixelColor(v: number, alphaMode: boolean): string {
  if (alphaMode) return `rgba(255, 255, 255, ${(v / 255).toFixed(3)})`
  return v ? '#ffffff' : '#000000'
}

function pixelTitle(v: number, alphaMode: boolean): string {
  if (alphaMode) return `alpha ${v}`
  return v ? 'on' : 'off'
}

const PixelGrid = memo(function PixelGrid({ data, cellW, cellH, alphaMode }: PixelGridProps) {
  const cells: ReactElement[] = []
  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < cellW; x++) {
      const v = data[y * cellW + x] ?? 0
      cells.push(
        <div
          key={`${x},${y}`}
          className={styles.pixel}
          style={{ backgroundColor: pixelColor(v, alphaMode) }}
          title={pixelTitle(v, alphaMode)}
        />,
      )
    }
  }
  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${cellW}, ${DISPLAY_SCALE}px)`,
        gridTemplateRows: `repeat(${cellH}, ${DISPLAY_SCALE}px)`,
        width: cellW * DISPLAY_SCALE,
        height: cellH * DISPLAY_SCALE,
      }}
    >
      {cells}
    </div>
  )
})

export function GlyphDebug() {
  const [fontId, setFontId] = useState<string>(DEFAULT_FONT_ID)
  const [inputChar, setInputChar] = useState('▒')
  const [debug, setDebug] = useState<GlyphDebugInfo | null>(null)
  const presetCodepoints = useMemo(blockElementCodepoints, [])

  const currentCodepoint = useMemo(
    () => parseCodepoint(inputChar, 0x2592),
    [inputChar],
  )

  useEffect(() => {
    let cancelled = false
    setDebug(null)
    rasterizeGlyphForDebug(currentCodepoint, fontId).then((d) => {
      if (!cancelled) setDebug(d)
    })
    return () => { cancelled = true }
  }, [currentCodepoint, fontId])

  const entry = getFontById(fontId)
  if (!entry) return <div className={styles.page}>Unknown font: {fontId}</div>
  const { cellW, cellH, fontFamily } = entry

  const atlas = FONT_ATLASES.get(fontId)
  const atlasMask = atlas?.glyphs.get(currentCodepoint)
  const referenceMask = getBlockReference(currentCodepoint, cellW, cellH)
  const char = String.fromCodePoint(currentCodepoint)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Glyph Debug</h1>
        <span className={styles.subtitle}>
          Compare native DOM render, fillText raw alpha, binary mask, atlas, and reference pattern.
        </span>
      </div>

      <div className={styles.controls}>
        <label>
          Font:{' '}
          <select
            className={styles.select}
            value={fontId}
            onChange={(e) => setFontId(e.target.value)}
          >
            {BITMAP_FONT_REGISTRY.map((f) => (
              <option key={f.id} value={f.id}>{f.label} ({f.cellW}×{f.cellH})</option>
            ))}
          </select>
        </label>
        <label>
          Character:{' '}
          <input
            className={styles.input}
            value={inputChar}
            onChange={(e) => setInputChar(e.target.value)}
            placeholder="▒ / U+2592 / 0x2592 / 9618"
          />
        </label>
        <span className={styles.subtitle}>
          {hexCodepoint(currentCodepoint)} — {char}
        </span>
      </div>

      <div className={styles.preset}>
        {presetCodepoints.map((cp) => (
          <div
            key={cp}
            className={`${styles.presetChar} ${cp === currentCodepoint ? styles.presetCharActive : ''}`}
            onClick={() => setInputChar(String.fromCodePoint(cp))}
            title={hexCodepoint(cp)}
            style={{ fontFamily: `'${fontFamily}', monospace`, fontSize: cellH }}
          >
            {String.fromCodePoint(cp)}
          </div>
        ))}
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Native DOM</h2>
          <div className={styles.panelSubtitle}>
            Browser render of the char in {entry.label} @ {cellH}px, then CSS scale ×{DISPLAY_SCALE}
          </div>
          <div
            className={styles.nativeWrap}
            style={{ width: cellW * DISPLAY_SCALE, height: cellH * DISPLAY_SCALE }}
          >
            <span
              className={styles.nativeChar}
              style={{
                fontFamily: `'${fontFamily}', monospace`,
                fontSize: cellH,
                lineHeight: `${cellH}px`,
                width: cellW,
                height: cellH,
                transform: `scale(${DISPLAY_SCALE})`,
              }}
            >
              {char}
            </span>
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Raw fillText α</h2>
          <div className={styles.panelSubtitle}>
            OffscreenCanvas rasterization at the font's cell size. Greys = browser AA.
          </div>
          {debug
            ? <PixelGrid data={debug.rawAlpha} cellW={cellW} cellH={cellH} alphaMode />
            : <div className={styles.missing} style={{ width: cellW * DISPLAY_SCALE, height: cellH * DISPLAY_SCALE }}>
                loading…
              </div>
          }
          {debug && (
            <div className={styles.stats}>
              avg alpha {avgAlpha(debug.rawAlpha).toFixed(1)} / 255
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Binary mask (α ≥ 128)</h2>
          <div className={styles.panelSubtitle}>
            Thresholded fillText — fallback path for codepoints missing from the atlas.
          </div>
          {debug
            ? <PixelGrid data={debug.mask} cellW={cellW} cellH={cellH} alphaMode={false} />
            : <div className={styles.missing} style={{ width: cellW * DISPLAY_SCALE, height: cellH * DISPLAY_SCALE }}>
                loading…
              </div>
          }
          {debug && (
            <div className={styles.stats}>
              on pixels {countOn(debug.mask)} / {cellW * cellH}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Atlas (font EBDT)</h2>
          <div className={styles.panelSubtitle}>
            Pixel-exact bitmap extracted from the TTF's {entry.nativePpem}ppem EBDT strike
            at build time. The renderer uses this when present.
          </div>
          {atlasMask
            ? <PixelGrid data={atlasMask} cellW={cellW} cellH={cellH} alphaMode={false} />
            : <div className={styles.missing} style={{ width: cellW * DISPLAY_SCALE, height: cellH * DISPLAY_SCALE }}>
                not in {entry.label} atlas — renderer falls back to fillText
              </div>
          }
          {atlasMask && (
            <div className={styles.stats}>
              on pixels {countOn(atlasMask)} / {cellW * cellH}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Reference</h2>
          <div className={styles.panelSubtitle}>
            Hand-coded canonical pattern for block-drawing chars. Diagnostic only —
            font author's choices (e.g. IBM VGA's ▒ Bayer phase) legitimately differ.
          </div>
          {referenceMask
            ? <PixelGrid data={referenceMask} cellW={cellW} cellH={cellH} alphaMode={false} />
            : <div className={styles.missing} style={{ width: cellW * DISPLAY_SCALE, height: cellH * DISPLAY_SCALE }}>
                {cellW === 8 && cellH === 16
                  ? `no reference for ${hexCodepoint(currentCodepoint)}`
                  : `no reference available at ${cellW}×${cellH}`}
              </div>
          }
          {referenceMask && (
            <div className={styles.stats}>
              on pixels {countOn(referenceMask)} / {cellW * cellH}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GlyphDebug
