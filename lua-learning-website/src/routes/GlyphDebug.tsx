import { memo, useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  BLOCK_GLYPH_REFERENCE,
  CELL_H,
  CELL_W,
  GLYPH_ATLAS,
  rasterizeGlyphForDebug,
  type GlyphDebugInfo,
} from '@lua-learning/lua-runtime'
import { DEFAULT_ANSI_FONT, getFontFamily } from '@lua-learning/ansi-shared'
import styles from './GlyphDebug.module.css'

const FONT_FAMILY = getFontFamily(DEFAULT_ANSI_FONT)

/** Build the Block Elements preset range (U+2580..U+259F). */
function blockElementCodepoints(): number[] {
  const out: number[] = []
  for (let c = 0x2580; c <= 0x259f; c++) out.push(c)
  return out
}

interface PixelGridProps {
  /** Row-major 128-byte array. alpha-mode: 0..255; binary-mode: 0 or 1. */
  data: Uint8Array
  /** When true, each cell renders at alpha/255. When false, 0 = black, 1 = white. */
  alphaMode: boolean
}

const PixelGrid = memo(function PixelGrid({ data, alphaMode }: PixelGridProps) {
  const cells: ReactElement[] = []
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const v = data[y * CELL_W + x] ?? 0
      const color = alphaMode
        ? `rgba(255, 255, 255, ${(v / 255).toFixed(3)})`
        : v ? '#ffffff' : '#000000'
      cells.push(
        <div
          key={`${x},${y}`}
          className={styles.pixel}
          style={{ backgroundColor: color }}
          title={alphaMode ? `alpha ${v}` : v ? 'on' : 'off'}
        />
      )
    }
  }
  return <div className={styles.grid}>{cells}</div>
})

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

export function GlyphDebug() {
  const [inputChar, setInputChar] = useState('▒')
  const [debug, setDebug] = useState<GlyphDebugInfo | null>(null)
  const presetCodepoints = useMemo(blockElementCodepoints, [])

  const currentCodepoint = useMemo(() => {
    if (inputChar.length === 0) return 0x2592
    return inputChar.codePointAt(0) ?? 0x2592
  }, [inputChar])

  useEffect(() => {
    let cancelled = false
    rasterizeGlyphForDebug(currentCodepoint, FONT_FAMILY).then((d: GlyphDebugInfo) => {
      if (!cancelled) setDebug(d)
    })
    return () => { cancelled = true }
  }, [currentCodepoint])

  const referenceMask = BLOCK_GLYPH_REFERENCE.get(currentCodepoint)
  const atlasMask = GLYPH_ATLAS.get(currentCodepoint)
  const char = String.fromCodePoint(currentCodepoint)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Glyph Debug</h1>
        <span className={styles.subtitle}>
          Compare native DOM render, fillText raw alpha, binary mask, and reference pattern.
        </span>
      </div>

      <div className={styles.controls}>
        <label>
          Character:{' '}
          <input
            className={styles.input}
            value={inputChar}
            onChange={(e) => setInputChar(e.target.value)}
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
          >
            {String.fromCodePoint(cp)}
          </div>
        ))}
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Native DOM</h2>
          <div className={styles.panelSubtitle}>
            Browser render of the char in IBM VGA 8x16 @ 16px, then CSS scale ×16
          </div>
          <div className={styles.nativeWrap}>
            <span className={styles.nativeChar}>{char}</span>
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Raw fillText α</h2>
          <div className={styles.panelSubtitle}>
            Our OffscreenCanvas rasterization. Greys = browser AA leaking through.
          </div>
          {debug
            ? <PixelGrid data={debug.rawAlpha} alphaMode />
            : <div className={styles.missing}>loading…</div>
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
            What the renderer actually uses.
          </div>
          {debug
            ? <PixelGrid data={debug.mask} alphaMode={false} />
            : <div className={styles.missing}>loading…</div>
          }
          {debug && (
            <div className={styles.stats}>
              on pixels {countOn(debug.mask)} / {CELL_W * CELL_H}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Atlas (font EBDT)</h2>
          <div className={styles.panelSubtitle}>
            Pixel-exact bitmap extracted from the TTF's 16ppem EBDT strike
            at build time. Used by the renderer when present.
          </div>
          {atlasMask
            ? <PixelGrid data={atlasMask} alphaMode={false} />
            : <div className={styles.missing}>not in atlas — renderer falls back to fillText</div>
          }
          {atlasMask && (
            <div className={styles.stats}>
              on pixels {countOn(atlasMask)} / {CELL_W * CELL_H}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Reference</h2>
          <div className={styles.panelSubtitle}>
            Hand-coded “ideal” for this codepoint (block-drawing chars only).
          </div>
          {referenceMask
            ? <PixelGrid data={referenceMask} alphaMode={false} />
            : <div className={styles.missing}>no reference for {hexCodepoint(currentCodepoint)}</div>
          }
          {referenceMask && (
            <div className={styles.stats}>
              on pixels {countOn(referenceMask)} / {CELL_W * CELL_H}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
