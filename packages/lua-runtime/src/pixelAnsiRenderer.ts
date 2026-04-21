/* eslint-disable max-lines */
/**
 * Pixel-perfect ANSI renderer. Uses xterm.js purely as an escape-code
 * parser (constructed but never `open()`-ed) and paints cells via
 * `putImageData` from binary glyph masks — no canvas `fillText` on the
 * hot path, so block-drawing characters have zero sub-pixel bleed.
 */

import { Terminal, type IBufferCell, type IDisposable } from '@xterm/xterm'
import { DEFAULT_ANSI_FONT, getFontFamily } from '@lua-learning/ansi-shared'
import { GLYPH_ATLAS } from './glyphAtlas.generated'
import { BLOCK_GLYPH_REFERENCE } from './blockGlyphReference'

/** Cell dimensions in canvas pixels. */
export const CELL_W = 8
/** Cell dimensions in canvas pixels. */
export const CELL_H = 16

/** Default theme colors used when cells are in default color mode. */
export interface PixelRendererTheme {
  /** Foreground color as 0xRRGGBB when cell has default fg. */
  foreground: number
  /** Background color as 0xRRGGBB when cell has default bg. */
  background: number
}

const DEFAULT_THEME: PixelRendererTheme = {
  foreground: 0xaaaaaa,
  background: 0x000000,
}

/** Standard 16-color ANSI palette (used when a cell is in palette mode). */
const ANSI_16_PALETTE: readonly number[] = [
  0x000000, 0xaa0000, 0x00aa00, 0xaa5500,
  0x0000aa, 0xaa00aa, 0x00aaaa, 0xaaaaaa,
  0x555555, 0xff5555, 0x55ff55, 0xffff55,
  0x5555ff, 0xff55ff, 0x55ffff, 0xffffff,
]

/**
 * Build the 256-color xterm palette: 16 ANSI + 6×6×6 color cube + 24 greys.
 * Lazy-initialized on first palette lookup.
 */
function buildAnsi256Palette(): number[] {
  const p: number[] = ANSI_16_PALETTE.slice()
  const steps = [0, 95, 135, 175, 215, 255]
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        p.push((steps[r] << 16) | (steps[g] << 8) | steps[b])
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    const v = 8 + i * 10
    p.push((v << 16) | (v << 8) | v)
  }
  return p
}

const ANSI_256_PALETTE = buildAnsi256Palette()

/**
 * Unicode codepoints we pre-rasterize at init. Covers ASCII printable,
 * CP437 extended set (as Unicode equivalents), Block Elements, and Box
 * Drawing — all the glyphs that show up in ANSI art.
 */
function defaultCodepointSet(): number[] {
  const out: number[] = []
  // ASCII printable 0x20..0x7E
  for (let c = 0x20; c <= 0x7e; c++) out.push(c)
  // Latin-1 supplement we commonly use
  for (let c = 0xa0; c <= 0xff; c++) out.push(c)
  // Box Drawing U+2500..U+257F
  for (let c = 0x2500; c <= 0x257f; c++) out.push(c)
  // Block Elements U+2580..U+259F
  for (let c = 0x2580; c <= 0x259f; c++) out.push(c)
  // Geometric Shapes U+25A0..U+25FF (partial — squares/triangles/circles)
  for (let c = 0x25a0; c <= 0x25ff; c++) out.push(c)
  // Miscellaneous Symbols commonly seen in ANSI art (arrows, card suits)
  for (let c = 0x2190; c <= 0x21ff; c++) out.push(c)
  for (let c = 0x2660; c <= 0x266f; c++) out.push(c)
  return out
}

export interface PixelAnsiRendererOptions {
  cols: number
  rows: number
  fontFamily?: string
  theme?: Partial<PixelRendererTheme>
  /** Additional codepoints to pre-rasterize. */
  extraCodepoints?: number[]
  /**
   * When true (default), block-drawing codepoints (U+2580–U+259F) render
   * from the font's bitmap strike via the atlas — whatever the font's
   * designer chose. When false, those codepoints use hand-coded canonical
   * patterns from `BLOCK_GLYPH_REFERENCE` instead. Toggling lets the user
   * pick between the font's shade bitmaps (e.g. MxPlus's `1144` ░) and
   * the reference Bayer-dither patterns.
   */
  useFontBlocks?: boolean
}

/** Result of a single-codepoint rasterization (for debug / inspection). */
export interface GlyphDebugInfo {
  codepoint: number
  char: string
  /** Row-major alpha values (0..255) as produced by fillText into an 8×16 canvas. */
  rawAlpha: Uint8Array
  /** Row-major binary mask after the alpha >= 128 threshold. */
  mask: Uint8Array
  /** True iff any pixel in the mask is on. */
  hasContent: boolean
}

type GlyphContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function get2DContext(c: HTMLCanvasElement | OffscreenCanvas): GlyphContext2D | null {
  // The Canvas/OffscreenCanvas `getContext('2d')` overloads return
  // incompatible types to TS even though both are valid — prefer a single
  // runtime call here over sprinkling conditional casts at every use site.
  if (c instanceof OffscreenCanvas) return c.getContext('2d')
  return c.getContext('2d')
}

/**
 * Create an 8×16 off-screen canvas context configured for single-glyph
 * rasterization (font, textBaseline, no smoothing, white fill). Returns
 * null when no 2D context is available (non-browser test environments).
 */
async function createGlyphContext(fontFamily: string): Promise<GlyphContext2D | null> {
  try {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.load(`${CELL_H}px ${fontFamily}`)
    }
  } catch { /* non-browser */ }

  let gc: HTMLCanvasElement | OffscreenCanvas
  if (typeof OffscreenCanvas !== 'undefined') {
    gc = new OffscreenCanvas(CELL_W, CELL_H)
  } else {
    gc = document.createElement('canvas')
    gc.width = CELL_W
    gc.height = CELL_H
  }
  const ctx = get2DContext(gc)
  if (!ctx) return null
  ctx.textBaseline = 'top'
  ctx.font = `${CELL_H}px ${fontFamily}`
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  return ctx
}

function rasterizeGlyphPixels(
  ctx: GlyphContext2D,
  codepoint: number,
): { rawAlpha: Uint8Array; mask: Uint8Array; hasContent: boolean } {
  ctx.clearRect(0, 0, CELL_W, CELL_H)
  ctx.fillText(String.fromCodePoint(codepoint), 0, 0)
  const img = ctx.getImageData(0, 0, CELL_W, CELL_H)
  const rawAlpha = new Uint8Array(CELL_W * CELL_H)
  const mask = new Uint8Array(CELL_W * CELL_H)
  let hasContent = false
  for (let i = 0; i < CELL_W * CELL_H; i++) {
    const alpha = img.data[(i << 2) + 3]
    rawAlpha[i] = alpha
    if (alpha >= 128) { mask[i] = 1; hasContent = true }
  }
  return { rawAlpha, mask, hasContent }
}

/**
 * Rasterize one glyph into an 8×16 binary mask (and expose the raw alpha
 * values for diagnostics). Used by the renderer's mask-build loop for
 * codepoints not in the atlas, and by the /glyph-debug page.
 */
export async function rasterizeGlyphForDebug(
  codepoint: number,
  fontFamily: string = getFontFamily(DEFAULT_ANSI_FONT),
): Promise<GlyphDebugInfo> {
  const ctx = await createGlyphContext(fontFamily)
  const char = String.fromCodePoint(codepoint)
  if (!ctx) {
    const empty = new Uint8Array(CELL_W * CELL_H)
    return { codepoint, char, rawAlpha: empty, mask: empty, hasContent: false }
  }
  const { rawAlpha, mask, hasContent } = rasterizeGlyphPixels(ctx, codepoint)
  return { codepoint, char, rawAlpha, mask, hasContent }
}

export interface PixelAnsiRendererHandle {
  /** Write ANSI-escape-encoded data into the parser. */
  write(data: string): void
  /** The backing canvas element. */
  readonly canvas: HTMLCanvasElement
  /** Resize the buffer. */
  resize(cols: number, rows: number): void
  /** Swap the rasterization font and rebuild masks. */
  setFontFamily(fontFamily: string): Promise<void>
  /** Toggle font-provided block glyphs vs hand-coded reference patterns. */
  setUseFontBlocks(useFontBlocks: boolean): Promise<void>
  /** Current column / row count. */
  readonly cols: number
  readonly rows: number
  /** Dispose of all resources. */
  dispose(): void
}

export class PixelAnsiRenderer implements PixelAnsiRendererHandle {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private terminal: Terminal
  private fontFamily: string
  private theme: PixelRendererTheme
  private glyphMasks: Map<number, Uint8Array> = new Map()
  private shadow: Uint32Array
  private dirty = true
  private rafHandle: number | null = null
  private disposables: IDisposable[] = []
  private codepointSet: number[]
  private useFontBlocks: boolean
  /**
   * Canvas backing and CSS are both sized at the authored `cols × CELL_W`
   * pixel grid — no devicePixelRatio handling. At integer DPRs (1, 2, 3)
   * the browser scales to device with an integer factor via nearest-
   * neighbor (image-rendering: pixelated), producing a uniform bitmap.
   * At fractional DPRs the browser's downsample is uneven and you get
   * the classic 1-2-1-2 pattern on a subset of pixels; acceptable as a
   * trade-off for not having to track DPR state that would otherwise go
   * stale on monitor switches.
   */
  private reusableImageData: ImageData

  constructor(opts: PixelAnsiRendererOptions) {
    this.fontFamily = opts.fontFamily ?? getFontFamily(DEFAULT_ANSI_FONT)
    this.theme = { ...DEFAULT_THEME, ...opts.theme }
    this.codepointSet = [...defaultCodepointSet(), ...(opts.extraCodepoints ?? [])]
    this.useFontBlocks = opts.useFontBlocks ?? true
    this.terminal = new Terminal({
      cols: opts.cols,
      rows: opts.rows,
      disableStdin: true,
      scrollback: 0,
      allowTransparency: false,
      theme: {
        foreground: toHexColor(this.theme.foreground),
        background: toHexColor(this.theme.background),
      },
    })

    this.canvas = document.createElement('canvas')
    this.applyCanvasSize(opts.cols, opts.rows)
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('PixelAnsiRenderer: failed to get 2D context')
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false

    this.shadow = new Uint32Array(opts.cols * opts.rows)
    this.reusableImageData = this.ctx.createImageData(CELL_W, CELL_H)

    this.disposables.push(
      this.terminal.onWriteParsed(() => this.scheduleRender()),
      this.terminal.onResize(({ cols, rows }) => {
        this.resizeBacking(cols, rows)
        this.scheduleRender()
      }),
    )

    void this.buildGlyphMasks()
  }

  get cols(): number { return this.terminal.cols }
  get rows(): number { return this.terminal.rows }

  write(data: string): void {
    this.terminal.write(data)
  }

  resize(cols: number, rows: number): void {
    // xterm.resize() triggers onResize which calls resizeBacking.
    this.terminal.resize(cols, rows)
  }

  async setFontFamily(fontFamily: string): Promise<void> {
    if (fontFamily === this.fontFamily) return
    this.fontFamily = fontFamily
    this.glyphMasks.clear()
    await this.buildGlyphMasks()
    this.dirty = true
    this.scheduleRender()
  }

  async setUseFontBlocks(useFontBlocks: boolean): Promise<void> {
    if (useFontBlocks === this.useFontBlocks) return
    this.useFontBlocks = useFontBlocks
    this.glyphMasks.clear()
    await this.buildGlyphMasks()
    this.dirty = true
    this.scheduleRender()
  }

  dispose(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    for (const d of this.disposables) d.dispose()
    this.disposables.length = 0
    this.terminal.dispose()
    this.canvas.remove()
  }

  // ---- internals ----

  private applyCanvasSize(cols: number, rows: number): void {
    // Backing and CSS are both the authored source-pixel grid. Whatever
    // the browser does when mapping CSS to device pixels (image-rendering:
    // pixelated, nearest-neighbor) is what the user sees.
    this.canvas.width = cols * CELL_W
    this.canvas.height = rows * CELL_H
    this.canvas.style.width = `${cols * CELL_W}px`
    this.canvas.style.height = `${rows * CELL_H}px`
  }

  private resizeBacking(cols: number, rows: number): void {
    this.applyCanvasSize(cols, rows)
    this.ctx.imageSmoothingEnabled = false
    this.shadow = new Uint32Array(cols * rows)
    this.dirty = true
  }

  private scheduleRender(): void {
    if (this.rafHandle !== null) return
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null
      this.render()
    })
  }

  private render(): void {
    if (this.glyphMasks.size === 0) return // masks not yet built
    const cols = this.terminal.cols
    const rows = this.terminal.rows
    const buf = this.terminal.buffer.active
    const probe = buf.getNullCell()

    for (let y = 0; y < rows; y++) {
      const line = buf.getLine(y)
      if (!line) continue
      for (let x = 0; x < cols; x++) {
        line.getCell(x, probe)
        const code = probe.getCode() || 0x20 // empty cell -> space
        const fg = this.resolveFg(probe)
        const bg = this.resolveBg(probe)
        // Mixed hash over (code, fg, bg). Collisions are possible but rare
        // and only cause a missed repaint, not incorrect pixels elsewhere.
        const sig = (Math.imul(code, 0x9e3779b1) ^ Math.imul(fg, 0x85ebca77) ^ bg) >>> 0
        const idx = y * cols + x
        if (!this.dirty && this.shadow[idx] === sig) continue
        this.shadow[idx] = sig
        this.paintCell(x, y, code, fg, bg)
      }
    }
    this.dirty = false
  }

  private paintCell(x: number, y: number, code: number, fg: number, bg: number): void {
    const mask = this.glyphMasks.get(code)
    const data = this.reusableImageData.data
    const fgR = (fg >>> 16) & 0xff
    const fgG = (fg >>> 8) & 0xff
    const fgB = fg & 0xff
    const bgR = (bg >>> 16) & 0xff
    const bgG = (bg >>> 8) & 0xff
    const bgB = bg & 0xff
    // One backing pixel per source pixel.
    let p = 0
    for (let i = 0; i < CELL_W * CELL_H; i++) {
      const on = mask ? mask[i] : 0
      data[p] = on ? fgR : bgR
      data[p + 1] = on ? fgG : bgG
      data[p + 2] = on ? fgB : bgB
      data[p + 3] = 255
      p += 4
    }
    this.ctx.putImageData(this.reusableImageData, x * CELL_W, y * CELL_H)
  }

  private resolveFg(cell: IBufferCell): number {
    if (cell.isFgDefault()) return this.theme.foreground
    if (cell.isFgRGB()) return cell.getFgColor() & 0xffffff
    if (cell.isFgPalette()) {
      const idx = cell.getFgColor()
      return ANSI_256_PALETTE[idx] ?? this.theme.foreground
    }
    return this.theme.foreground
  }

  private resolveBg(cell: IBufferCell): number {
    if (cell.isBgDefault()) return this.theme.background
    if (cell.isBgRGB()) return cell.getBgColor() & 0xffffff
    if (cell.isBgPalette()) {
      const idx = cell.getBgColor()
      return ANSI_256_PALETTE[idx] ?? this.theme.background
    }
    return this.theme.background
  }

  private async buildGlyphMasks(): Promise<void> {
    const gctx = await createGlyphContext(this.fontFamily)
    for (const code of this.codepointSet) {
      // When useFontBlocks is off, substitute block elements (U+2580–
      // U+259F) with the hand-coded reference patterns. Other codepoints
      // always come from the font atlas.
      if (!this.useFontBlocks) {
        const ref = BLOCK_GLYPH_REFERENCE.get(code)
        if (ref) { this.glyphMasks.set(code, ref); continue }
      }
      // Atlas entries are pre-extracted from the font's EBDT bitmap
      // strike at build time, so they're pixel-exact. Anything not in
      // the atlas (chars beyond the strike's coverage) falls back to
      // fillText rasterization, which works fine for ASCII / box-
      // drawing glyphs but would smear block-drawing shades.
      const atlasMask = GLYPH_ATLAS.get(code)
      if (atlasMask) { this.glyphMasks.set(code, atlasMask); continue }
      if (!gctx) continue
      const { mask, hasContent } = rasterizeGlyphPixels(gctx, code)
      if (hasContent) this.glyphMasks.set(code, mask)
    }

    this.dirty = true
    this.scheduleRender()
  }
}

function toHexColor(rgb: number): string {
  const r = (rgb >>> 16) & 0xff
  const g = (rgb >>> 8) & 0xff
  const b = rgb & 0xff
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
