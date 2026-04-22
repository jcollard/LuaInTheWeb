import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BITMAP_FONT_REGISTRY,
  DEFAULT_FONT_ID,
  getFontById,
} from '../src/fontRegistry'

describe('BITMAP_FONT_REGISTRY', () => {
  it('ships five entries (CGA, EGA, MDA, VGA 8x16, VGA 9x16)', () => {
    expect(BITMAP_FONT_REGISTRY).toHaveLength(5)
  })

  it('has unique ids', () => {
    const ids = BITMAP_FONT_REGISTRY.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes the expected ids', () => {
    const ids = BITMAP_FONT_REGISTRY.map((f) => f.id).sort()
    expect(ids).toEqual([
      'IBM_CGA_8x8',
      'IBM_EGA_8x14',
      'IBM_MDA_9x14',
      'IBM_VGA_8x16',
      'IBM_VGA_9x16',
    ])
  })

  it('has positive cell dimensions with nativePpem === cellH for every entry', () => {
    for (const f of BITMAP_FONT_REGISTRY) {
      expect(f.cellW, `${f.id} cellW`).toBeGreaterThan(0)
      expect(f.cellH, `${f.id} cellH`).toBeGreaterThan(0)
      expect(f.nativePpem, `${f.id} nativePpem === cellH`).toBe(f.cellH)
    }
  })

  it('points every ttfPath at an on-disk file', () => {
    // ttfPath is relative to the package root (packages/lua-runtime), which is
    // the parent of the tests/ directory. This catches "registry entry added
    // but asset missing" before Step 2's atlas generator tries to parse them.
    const packageRoot = resolve(__dirname, '..')
    for (const f of BITMAP_FONT_REGISTRY) {
      const abs = resolve(packageRoot, f.ttfPath)
      expect(existsSync(abs), `${f.id}: ${abs}`).toBe(true)
    }
  })

  it('gives each entry a woffPath under /fonts/ and a non-empty fontFamily', () => {
    for (const f of BITMAP_FONT_REGISTRY) {
      expect(f.woffPath.startsWith('/fonts/'), `${f.id} woffPath`).toBe(true)
      expect(f.fontFamily.length, `${f.id} fontFamily`).toBeGreaterThan(0)
    }
  })
})

describe('DEFAULT_FONT_ID', () => {
  it('is IBM_VGA_8x16', () => {
    expect(DEFAULT_FONT_ID).toBe('IBM_VGA_8x16')
  })

  it('resolves via getFontById', () => {
    const entry = getFontById(DEFAULT_FONT_ID)
    expect(entry).toBeDefined()
    expect(entry?.cellW).toBe(8)
    expect(entry?.cellH).toBe(16)
  })
})

describe('getFontById', () => {
  it('returns the matching entry', () => {
    expect(getFontById('IBM_CGA_8x8')?.cellH).toBe(8)
    expect(getFontById('IBM_MDA_9x14')?.cellW).toBe(9)
  })

  it('returns undefined for an unknown id', () => {
    expect(getFontById('not_a_real_font')).toBeUndefined()
  })
})
