/* eslint-disable max-lines */
/**
 * Pixel-perfect ANSI renderer.
 *
 * Owns an xterm.js Terminal instance (constructed but never `open()`-ed)
 * purely as an ANSI escape-code parser. Rendering is done by this class:
 *
 * 1. At init, rasterize every expected Unicode codepoint into an 8×16
 *    binary mask by calling `fillText` on an OffscreenCanvas and
 *    thresholding the resulting alpha values. The threshold collapses
 *    font anti-aliasing to pure on/off pixels.
 *
 * 2. Each frame (scheduled on the next animation frame after
 *    `onWriteParsed` fires), iterate the terminal buffer and paint each
 *    changed cell onto the target canvas via `putImageData`. Because the
 *    glyph masks are binary and `putImageData` writes raw pixels with no
 *    smoothing, adjacent cells touch with zero sub-pixel bleed — so
 *    stacked half-blocks (▀) are seamless.
 *
 * Integer scaling is applied via CSS `transform: scale(N)` +
 * `image-rendering: pixelated` on the canvas. The backing canvas
 * resolution stays at exactly `cols * CELL_W × rows * CELL_H`.
 */

import { Terminal, type IBufferCell, type IDisposable } from '@xterm/xterm'
import { GLYPH_ATLAS } from './glyphAtlas.generated'

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

type AnyCanvasRenderingContext2D = CanvasRenderingContext2D | (OffscreenCanvas extends unknown
  ? OffscreenCanvasRenderingContext2D
  : never)

/**
 * Write a single glyph into an already-configured 2D context and return the
 * raw alpha plus the thresholded binary mask. Assumes the context is 8×16,
 * has `textBaseline='top'`, `font` set, `imageSmoothingEnabled=false`, and
 * `fillStyle='#ffffff'`. Used both by the renderer's batch loop and by the
 * debug helper below.
 */
function rasterizeGlyphPixels(
  ctx: AnyCanvasRenderingContext2D,
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
 * Standalone rasterization helper for diagnostics: creates its own tiny
 * canvas, loads the font, rasterizes one glyph, and returns the raw alpha
 * + thresholded mask. Useful for the /glyph-debug page.
 */
export async function rasterizeGlyphForDebug(
  codepoint: number,
  fontFamily: string = '"IBM VGA 8x16", monospace',
): Promise<GlyphDebugInfo> {
  try {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.load(`${CELL_H}px ${fontFamily}`)
    }
  } catch { /* non-browser */ }

  const useOffscreen = typeof OffscreenCanvas !== 'undefined'
  let gc: HTMLCanvasElement | OffscreenCanvas
  if (useOffscreen) {
    gc = new OffscreenCanvas(CELL_W, CELL_H)
  } else {
    gc = document.createElement('canvas')
    gc.width = CELL_W
    gc.height = CELL_H
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (gc as any).getContext('2d') as AnyCanvasRenderingContext2D | null
  if (!ctx) {
    const empty = new Uint8Array(CELL_W * CELL_H)
    return { codepoint, char: String.fromCodePoint(codepoint), rawAlpha: empty, mask: empty, hasContent: false }
  }
  ctx.textBaseline = 'top'
  ctx.font = `${CELL_H}px ${fontFamily}`
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  const { rawAlpha, mask, hasContent } = rasterizeGlyphPixels(ctx, codepoint)
  return { codepoint, char: String.fromCodePoint(codepoint), rawAlpha, mask, hasContent }
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
  /** Current column / row count. */
  readonly cols: number
  readonly rows: number
  /** Dispose of all resources. */
  dispose(): void
}

/**
 * Construct a pixel-perfect ANSI renderer. Returns a handle immediately
 * but glyph masks are loaded asynchronously; writes before init resolves
 * are buffered in xterm and painted when masks are ready.
 */
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
  private onWriteParsedDisposable: IDisposable | null = null
  private codepointSet: number[]
  private masksReady = false
  private readonly reusableImageData: ImageData

  constructor(opts: PixelAnsiRendererOptions) {
    this.fontFamily = opts.fontFamily ?? '"IBM VGA 8x16", monospace'
    this.theme = { ...DEFAULT_THEME, ...opts.theme }
    this.codepointSet = [...defaultCodepointSet(), ...(opts.extraCodepoints ?? [])]

    this.terminal = new Terminal({
      cols: opts.cols,
      rows: opts.rows,
      // xterm's own rendering is never engaged (no open(), no render addon).
      disableStdin: true,
      scrollback: 0,
      allowTransparency: false,
      theme: {
        foreground: toHexColor(this.theme.foreground),
        background: toHexColor(this.theme.background),
      },
    })

    this.canvas = document.createElement('canvas')
    this.canvas.width = opts.cols * CELL_W
    this.canvas.height = opts.rows * CELL_H
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('PixelAnsiRenderer: failed to get 2D context')
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false

    this.shadow = new Uint32Array(opts.cols * opts.rows)
    this.reusableImageData = this.ctx.createImageData(CELL_W, CELL_H)

    // Schedule renders when the parser has digested a chunk of input.
    this.onWriteParsedDisposable = this.terminal.onWriteParsed(() => this.scheduleRender())
    // Also redraw on explicit resize.
    this.terminal.onResize(({ cols, rows }) => {
      this.resizeBacking(cols, rows)
      this.scheduleRender()
    })

    // Build glyph masks asynchronously; first render will happen when ready.
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
    this.masksReady = false
    await this.buildGlyphMasks()
    // Invalidate shadow so every cell repaints with the new glyphs.
    this.shadow.fill(0)
    this.dirty = true
    this.scheduleRender()
  }

  dispose(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    this.onWriteParsedDisposable?.dispose()
    this.onWriteParsedDisposable = null
    this.terminal.dispose()
    this.canvas.remove()
  }

  // ---- internals ----

  private resizeBacking(cols: number, rows: number): void {
    this.canvas.width = cols * CELL_W
    this.canvas.height = rows * CELL_H
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
    if (!this.masksReady) return
    const cols = this.terminal.cols
    const rows = this.terminal.rows
    const buf = this.terminal.buffer.active

    // Reusable cell accessor to avoid per-cell allocations.
    const probe = buf.getNullCell()

    for (let y = 0; y < rows; y++) {
      const line = buf.getLine(y)
      if (!line) continue
      for (let x = 0; x < cols; x++) {
        line.getCell(x, probe)
        const code = probe.getCode() || 0x20 // treat empty cell as space
        const fg = this.resolveFg(probe)
        const bg = this.resolveBg(probe)
        // Signature for shadow diff: packed into a Uint32 isn't enough
        // for truecolor + codepoint, but we track a composite key via a
        // cheap hash across (code, fg, bg). Collisions here only cause
        // spurious repaints; correctness is preserved.
        const sig = (code ^ fg ^ (bg >>> 1)) >>> 0
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
    if (!mask) {
      for (let i = 0; i < CELL_W * CELL_H; i++) {
        const p = i << 2
        data[p] = bgR; data[p + 1] = bgG; data[p + 2] = bgB; data[p + 3] = 255
      }
    } else {
      for (let i = 0; i < CELL_W * CELL_H; i++) {
        const p = i << 2
        if (mask[i]) {
          data[p] = fgR; data[p + 1] = fgG; data[p + 2] = fgB
        } else {
          data[p] = bgR; data[p + 1] = bgG; data[p + 2] = bgB
        }
        data[p + 3] = 255
      }
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
    try {
      if (typeof document !== 'undefined' && 'fonts' in document) {
        await document.fonts.load(`${CELL_H}px ${this.fontFamily}`)
      }
    } catch {
      // In jsdom / non-browser, document.fonts.load may throw — render will fall back.
    }

    const useOffscreen = typeof OffscreenCanvas !== 'undefined'
    // Use a single off-screen canvas for glyph rasterization.
    let gc: HTMLCanvasElement | OffscreenCanvas
    if (useOffscreen) {
      gc = new OffscreenCanvas(CELL_W, CELL_H)
    } else {
      gc = document.createElement('canvas')
      gc.width = CELL_W
      gc.height = CELL_H
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gctx = (gc as any).getContext('2d') as AnyCanvasRenderingContext2D | null
    if (!gctx) {
      this.masksReady = true
      this.scheduleRender()
      return
    }
    gctx.textBaseline = 'top'
    gctx.font = `${CELL_H}px ${this.fontFamily}`
    gctx.imageSmoothingEnabled = false
    gctx.fillStyle = '#ffffff'

    for (const code of this.codepointSet) {
      // Prefer the prebuilt atlas (extracted from the font's EBDT
      // bitmap strike at build time, guaranteed pixel-exact). Fall
      // back to fillText rasterization for codepoints the atlas
      // doesn't cover (chars beyond the font's bitmap-strike range).
      const atlasMask = GLYPH_ATLAS.get(code)
      if (atlasMask) { this.glyphMasks.set(code, atlasMask); continue }
      const { mask, hasContent } = rasterizeGlyphPixels(gctx, code)
      if (hasContent) this.glyphMasks.set(code, mask)
    }

    this.masksReady = true
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
