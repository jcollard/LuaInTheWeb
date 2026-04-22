/**
 * Pixel-perfect ANSI renderer. Uses xterm.js purely as an ANSI parser
 * (constructed but never `open()`-ed) and paints cells via `putImageData`
 * from pre-built binary glyph masks. No `fillText` on the hot path — so
 * block-drawing characters (U+2580–U+259F) tile seamlessly with zero
 * sub-pixel bleed.
 *
 * Cell dimensions are instance properties read from the active font's
 * atlas, not module-level constants. Swapping the font via
 * `setFontFamily(fontId)` reallocates the canvas, shadow buffer, and
 * reusable ImageData. Do NOT introduce `CELL_W` / `CELL_H` exports.
 *
 * No devicePixelRatio reads anywhere. Canvas is sized in source-pixel
 * units; the browser handles CSS→device mapping with `image-rendering:
 * pixelated`. Four DPR-compensation strategies were tried in the
 * prototype and all failed — see §4.6/§4.7 of the renderer plan.
 */

import { Terminal, type IBufferCell, type IDisposable } from '@xterm/xterm'
import {
  BITMAP_FONT_REGISTRY,
  DEFAULT_FONT_ID,
  getFontById,
  type BitmapFontRegistryEntry,
} from './fontRegistry'
import { FONT_ATLASES, type FontAtlas } from './glyphAtlas.generated'
import { createGlyphContext, rasterizeGlyph } from './glyphRaster'

export interface PixelAnsiRendererTheme {
  /** Foreground color as 0xRRGGBB when cell has default fg. */
  foreground: number
  /** Background color as 0xRRGGBB when cell has default bg. */
  background: number
}

const DEFAULT_THEME: PixelAnsiRendererTheme = {
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

function buildAnsi256Palette(): number[] {
  const p = ANSI_16_PALETTE.slice()
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
 * Codepoints we pre-rasterize at init beyond whatever the active atlas
 * covers. Matches the atlas generator's coverage set so the fallback
 * rasterizer runs for codes the font genuinely doesn't ship.
 */
function defaultCodepointSet(): number[] {
  const out: number[] = []
  for (let c = 0x20; c <= 0x7e; c++) out.push(c)          // ASCII printable
  for (let c = 0xa0; c <= 0xff; c++) out.push(c)          // Latin-1 supplement
  for (let c = 0x2500; c <= 0x257f; c++) out.push(c)      // Box drawing
  for (let c = 0x2580; c <= 0x259f; c++) out.push(c)      // Block elements
  for (let c = 0x25a0; c <= 0x25ff; c++) out.push(c)      // Geometric shapes
  for (let c = 0x2190; c <= 0x21ff; c++) out.push(c)      // Arrows
  for (let c = 0x2660; c <= 0x266f; c++) out.push(c)      // Card suits / misc
  return out
}

export interface PixelAnsiRendererOptions {
  cols: number
  rows: number
  /** Registered font ID; defaults to DEFAULT_FONT_ID. */
  fontId?: string
  theme?: Partial<PixelAnsiRendererTheme>
  /** Additional codepoints to pre-rasterize. */
  extraCodepoints?: number[]
  /**
   * Reserved for future reference-pattern substitution. Stored on the
   * instance but currently a no-op; hand-coded canonical block patterns
   * (BLOCK_GLYPH_REFERENCE_8X16) aren't multi-font yet.
   */
  useFontBlocks?: boolean
}

export interface PixelAnsiRendererHandle {
  write(data: string): void
  readonly canvas: HTMLCanvasElement
  resize(cols: number, rows: number): void
  /** Swap the active font. Reallocates canvas and rebuilds mask map. */
  setFontFamily(fontId: string): Promise<void>
  /** Reserved for block-pattern toggle; currently stores the flag only. */
  setUseFontBlocks(useFontBlocks: boolean): Promise<void>
  dispose(): void
  readonly cols: number
  readonly rows: number
  readonly cellW: number
  readonly cellH: number
  /** The active font's registry ID. */
  readonly fontId: string
  /** Whether block-element glyphs come from the font (true) or would use reference patterns (false; reserved). */
  readonly usesFontBlocks: boolean
}

function resolveFontOrThrow(id: string): { entry: BitmapFontRegistryEntry; atlas: FontAtlas } {
  const entry = getFontById(id)
  if (!entry) {
    const known = BITMAP_FONT_REGISTRY.map((f) => f.id).join(', ')
    throw new Error(`PixelAnsiRenderer: unknown fontId "${id}" (registered: ${known})`)
  }
  const atlas = FONT_ATLASES.get(entry.id)
  if (!atlas) {
    throw new Error(`PixelAnsiRenderer: no atlas for fontId "${id}" — did the prebuild run?`)
  }
  return { entry, atlas }
}

export class PixelAnsiRenderer implements PixelAnsiRendererHandle {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly terminal: Terminal
  private fontEntry: BitmapFontRegistryEntry
  private atlas: FontAtlas
  private theme: PixelAnsiRendererTheme
  private glyphMasks = new Map<number, Uint8Array>()
  /**
   * Per-cell shadow — three Uint32 entries per cell: `[code, fg, bg]`.
   * Carries the full tuple with zero collision risk. Storage is 24 KB
   * for an 80×25 grid, which dwarfs the previous single-u32 hash but is
   * trivially small next to the paint cost.
   */
  private shadow: Uint32Array
  private dirty = true
  private rafHandle: number | null = null
  private disposables: IDisposable[] = []
  private readonly codepointSet: number[]
  private useFontBlocks: boolean
  private reusableImageData: ImageData
  private disposed = false

  constructor(opts: PixelAnsiRendererOptions) {
    const { entry, atlas } = resolveFontOrThrow(opts.fontId ?? DEFAULT_FONT_ID)
    this.fontEntry = entry
    this.atlas = atlas
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

    this.shadow = new Uint32Array(opts.cols * opts.rows * 3)
    this.reusableImageData = this.ctx.createImageData(this.cellW, this.cellH)

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
  get cellW(): number { return this.fontEntry.cellW }
  get cellH(): number { return this.fontEntry.cellH }
  get fontId(): string { return this.fontEntry.id }
  /** Current useFontBlocks flag (reserved for future reference-pattern substitution). */
  get usesFontBlocks(): boolean { return this.useFontBlocks }

  write(data: string): void {
    if (this.disposed) return
    this.terminal.write(data)
  }

  resize(cols: number, rows: number): void {
    // xterm.resize() fires onResize, which calls resizeBacking.
    this.terminal.resize(cols, rows)
  }

  async setFontFamily(fontId: string): Promise<void> {
    if (fontId === this.fontEntry.id) return
    const { entry, atlas } = resolveFontOrThrow(fontId)
    this.fontEntry = entry
    this.atlas = atlas
    this.applyCanvasSize(this.terminal.cols, this.terminal.rows)
    this.ctx.imageSmoothingEnabled = false
    this.shadow = new Uint32Array(this.terminal.cols * this.terminal.rows * 3)
    this.reusableImageData = this.ctx.createImageData(this.cellW, this.cellH)
    this.glyphMasks.clear()
    await this.buildGlyphMasks()
    this.dirty = true
    this.scheduleRender()
  }

  setUseFontBlocks(useFontBlocks: boolean): Promise<void> {
    // Reserved for future reference-pattern substitution (§3.2/§5.3).
    // Flag is stored so callers can query state even while the toggle
    // is a no-op. Rebuild of masks isn't necessary yet.
    this.useFontBlocks = useFontBlocks
    return Promise.resolve()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
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
    const w = cols * this.cellW
    const h = rows * this.cellH
    this.canvas.width = w
    this.canvas.height = h
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
  }

  private resizeBacking(cols: number, rows: number): void {
    this.applyCanvasSize(cols, rows)
    this.ctx.imageSmoothingEnabled = false
    this.shadow = new Uint32Array(cols * rows * 3)
    this.dirty = true
  }

  private scheduleRender(): void {
    if (this.disposed) return
    if (this.rafHandle !== null) return
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null
      if (this.disposed) return
      this.render()
    })
  }

  private render(): void {
    if (this.glyphMasks.size === 0) return // masks not built yet
    const cols = this.terminal.cols
    const rows = this.terminal.rows
    const buf = this.terminal.buffer.active
    const probe = buf.getNullCell()

    for (let y = 0; y < rows; y++) {
      const line = buf.getLine(y)
      if (!line) continue
      for (let x = 0; x < cols; x++) {
        line.getCell(x, probe)
        const code = probe.getCode() || 0x20
        const fg = this.resolveFg(probe)
        const bg = this.resolveBg(probe)
        const idx = (y * cols + x) * 3
        if (!this.dirty
            && this.shadow[idx] === code
            && this.shadow[idx + 1] === fg
            && this.shadow[idx + 2] === bg) continue
        this.shadow[idx] = code
        this.shadow[idx + 1] = fg
        this.shadow[idx + 2] = bg
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
    const cellW = this.cellW
    const cellH = this.cellH
    let p = 0
    const len = cellW * cellH
    for (let i = 0; i < len; i++) {
      const on = mask ? mask[i] : 0
      data[p] = on ? fgR : bgR
      data[p + 1] = on ? fgG : bgG
      data[p + 2] = on ? fgB : bgB
      data[p + 3] = 255
      p += 4
    }
    this.ctx.putImageData(this.reusableImageData, x * cellW, y * cellH)
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
    // Atlas entries come first — they're the pixel-exact EBDT extractions
    // the whole renderer exists for. Anything missing from the atlas falls
    // back to fillText at the font's cell size (acceptable quality loss
    // for chars beyond the strike's coverage; block-drawing / box-drawing
    // chars should always be in the atlas).
    for (const [cp, mask] of this.atlas.glyphs) {
      this.glyphMasks.set(cp, mask)
    }

    // Runtime fallback for codepoints not in the atlas (the WOFF is
    // outline-only so fillText gives us an anti-aliased outline that we
    // threshold to binary — fine for readable text, smears on shades).
    const gctx = await createGlyphContext(this.fontEntry.fontFamily, this.cellW, this.cellH)
    if (!gctx) {
      this.dirty = true
      this.scheduleRender()
      return
    }
    for (const code of this.codepointSet) {
      if (this.glyphMasks.has(code)) continue
      const { mask, hasContent } = rasterizeGlyph(gctx, code, this.cellW, this.cellH)
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
