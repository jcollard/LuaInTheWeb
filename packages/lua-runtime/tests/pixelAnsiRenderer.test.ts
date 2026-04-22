/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PixelAnsiRenderer } from '../src/pixelAnsiRenderer'

// jsdom ships a canvas DOM element but no 2D context. Provide a minimal
// fake — just the surface the renderer touches — stubbed at prototype
// level so every canvas the renderer creates sees it.
class FakeImageData {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
  constructor(w: number, h: number) {
    this.width = w
    this.height = h
    this.data = new Uint8ClampedArray(w * h * 4)
  }
}
;(globalThis as { ImageData: typeof FakeImageData }).ImageData = FakeImageData

class FakeCanvas2DContext {
  imageSmoothingEnabled = true
  textBaseline: 'top' | 'alphabetic' = 'alphabetic'
  font = ''
  fillStyle = '#000000'
  createImageData(w: number, h: number) { return new FakeImageData(w, h) }
  getImageData(_x: number, _y: number, w: number, h: number) { return new FakeImageData(w, h) }
  putImageData() { /* no-op */ }
  fillText() { /* no-op */ }
  clearRect() { /* no-op */ }
}
;(HTMLCanvasElement.prototype.getContext as unknown) = function (this: HTMLCanvasElement, kind: string) {
  if (kind === '2d') return new FakeCanvas2DContext()
  return null
}

// jsdom doesn't provide requestAnimationFrame; the renderer uses it to
// batch render work. Stub with setTimeout so the render loop doesn't hang.
beforeEach(() => {
  (globalThis as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame =
    (cb) => setTimeout(() => cb(performance.now()), 0) as unknown as number;
  (globalThis as { cancelAnimationFrame: (h: number) => void }).cancelAnimationFrame =
    (h) => clearTimeout(h as unknown as NodeJS.Timeout)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PixelAnsiRenderer — construction', () => {
  it('uses DEFAULT_FONT_ID (IBM_VGA_8x16) when fontId is omitted', () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    try {
      expect(r.fontId).toBe('IBM_VGA_8x16')
      expect(r.cellW).toBe(8)
      expect(r.cellH).toBe(16)
    } finally {
      r.dispose()
    }
  })

  it('reports cellW/cellH from the active font', () => {
    const cga = new PixelAnsiRenderer({ cols: 10, rows: 4, fontId: 'IBM_CGA_8x8' })
    try {
      expect(cga.cellW).toBe(8)
      expect(cga.cellH).toBe(8)
    } finally {
      cga.dispose()
    }

    const vga9 = new PixelAnsiRenderer({ cols: 10, rows: 4, fontId: 'IBM_VGA_9x16' })
    try {
      expect(vga9.cellW).toBe(9)
      expect(vga9.cellH).toBe(16)
    } finally {
      vga9.dispose()
    }
  })

  it('sizes the backing canvas to cols * cellW × rows * cellH', () => {
    const r = new PixelAnsiRenderer({ cols: 80, rows: 25, fontId: 'IBM_VGA_9x16' })
    try {
      expect(r.canvas.width).toBe(80 * 9)
      expect(r.canvas.height).toBe(25 * 16)
      // CSS size equals backing size — no DPR compensation.
      expect(r.canvas.style.width).toBe(`${80 * 9}px`)
      expect(r.canvas.style.height).toBe(`${25 * 16}px`)
    } finally {
      r.dispose()
    }
  })

  it('throws with a helpful message on unknown fontId', () => {
    expect(() => new PixelAnsiRenderer({ cols: 10, rows: 4, fontId: 'NOPE_FONT' }))
      .toThrow(/unknown fontId "NOPE_FONT".*IBM_CGA_8x8.*IBM_VGA_8x16.*IBM_VGA_9x16/)
  })

  it('defaults usesFontBlocks to true, honors explicit false', () => {
    const a = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    try { expect(a.usesFontBlocks).toBe(true) } finally { a.dispose() }

    const b = new PixelAnsiRenderer({ cols: 10, rows: 4, useFontBlocks: false })
    try { expect(b.usesFontBlocks).toBe(false) } finally { b.dispose() }
  })

  it('exposes cols/rows from the terminal', () => {
    const r = new PixelAnsiRenderer({ cols: 40, rows: 12 })
    try {
      expect(r.cols).toBe(40)
      expect(r.rows).toBe(12)
    } finally {
      r.dispose()
    }
  })
})

describe('PixelAnsiRenderer — setFontFamily', () => {
  it('is a no-op when called with the current fontId', async () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4, fontId: 'IBM_VGA_8x16' })
    try {
      const before = r.canvas.width
      await r.setFontFamily('IBM_VGA_8x16')
      expect(r.canvas.width).toBe(before)
      expect(r.fontId).toBe('IBM_VGA_8x16')
    } finally {
      r.dispose()
    }
  })

  it('reallocates canvas dimensions when the font changes', async () => {
    const r = new PixelAnsiRenderer({ cols: 20, rows: 10, fontId: 'IBM_VGA_8x16' })
    try {
      expect(r.canvas.width).toBe(20 * 8)
      expect(r.canvas.height).toBe(10 * 16)

      await r.setFontFamily('IBM_VGA_9x16')
      expect(r.fontId).toBe('IBM_VGA_9x16')
      expect(r.cellW).toBe(9)
      expect(r.canvas.width).toBe(20 * 9)
      expect(r.canvas.height).toBe(10 * 16)

      await r.setFontFamily('IBM_CGA_8x8')
      expect(r.cellH).toBe(8)
      expect(r.canvas.width).toBe(20 * 8)
      expect(r.canvas.height).toBe(10 * 8)
    } finally {
      r.dispose()
    }
  })

  it('throws on unknown fontId and leaves the renderer on the prior font', async () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4, fontId: 'IBM_VGA_8x16' })
    try {
      await expect(r.setFontFamily('NOPE_FONT')).rejects.toThrow(/unknown fontId/)
      expect(r.fontId).toBe('IBM_VGA_8x16')
      expect(r.cellW).toBe(8)
      expect(r.cellH).toBe(16)
    } finally {
      r.dispose()
    }
  })
})

describe('PixelAnsiRenderer — setUseFontBlocks', () => {
  it('updates the flag (no-op render path for now)', async () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    try {
      expect(r.usesFontBlocks).toBe(true)
      await r.setUseFontBlocks(false)
      expect(r.usesFontBlocks).toBe(false)
      await r.setUseFontBlocks(true)
      expect(r.usesFontBlocks).toBe(true)
    } finally {
      r.dispose()
    }
  })
})

describe('PixelAnsiRenderer — write / dispose', () => {
  it('accepts write() without throwing', () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    try {
      expect(() => r.write('hello world')).not.toThrow()
      expect(() => r.write('\x1b[31mred\x1b[0m')).not.toThrow()
    } finally {
      r.dispose()
    }
  })

  it('write() after dispose is a no-op (no throw)', () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    r.dispose()
    expect(() => r.write('anything')).not.toThrow()
  })

  it('dispose() is idempotent', () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    r.dispose()
    expect(() => r.dispose()).not.toThrow()
  })
})

describe('PixelAnsiRenderer — resize', () => {
  it('propagates new cols/rows through the terminal', () => {
    const r = new PixelAnsiRenderer({ cols: 10, rows: 4 })
    try {
      r.resize(20, 8)
      expect(r.cols).toBe(20)
      expect(r.rows).toBe(8)
      // Canvas grows with the new cell grid (cellW/cellH unchanged).
      expect(r.canvas.width).toBe(20 * r.cellW)
      expect(r.canvas.height).toBe(8 * r.cellH)
    } finally {
      r.dispose()
    }
  })
})
