/**
 * Tests for ansi.create_label() - pure Lua markup parser.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { ansiLuaCoreCode } from '../src/ansiLuaCode/core'

/**
 * Minimal Lua setup that loads the core ansi code and exposes _ansi globally.
 * create_label is pure Lua, so we don't need the full setupAnsiAPI bridge.
 * However, _ansi is local in the core chunk, so we need to make it a global
 * by wrapping the core code and adding a global assignment.
 */
async function createLuaWithAnsiCore(): Promise<LuaEngine> {
  const factory = new LuaFactory()
  const engine = await factory.createEngine()
  // The core code defines `local _ansi = {}` which is chunk-scoped.
  // We need to expose it globally for our tests.
  engine.doStringSync(ansiLuaCoreCode + '\n_G._ansi = _ansi')
  return engine
}

/**
 * Helper to run create_label and extract the result.
 * Returns { text, colors, default_color } from Lua.
 */
async function runCreateLabel(
  engine: LuaEngine,
  luaExpr: string,
): Promise<{ text: string; colors: number[][]; default_color: number[] }> {
  await engine.doString(`
    local result = ${luaExpr}
    _test_text = result.text
    _test_default_color = result.default_color
    _test_colors = result.colors
  `)
  const text = engine.global.get('_test_text') as string
  const defaultColorRaw = engine.global.get('_test_default_color')
  const colorsRaw = engine.global.get('_test_colors')

  // wasmoon converts Lua array tables to JS arrays (0-indexed)
  const asArray = (v: unknown): number[] => {
    if (Array.isArray(v)) return v as number[]
    // Fallback: 1-indexed object from wasmoon
    const obj = v as Record<number, number>
    return [obj[1], obj[2], obj[3]]
  }

  const default_color = asArray(defaultColorRaw)
  const colors: number[][] = []
  if (Array.isArray(colorsRaw)) {
    for (const c of colorsRaw) {
      colors.push(asArray(c))
    }
  } else {
    const obj = colorsRaw as Record<number, unknown>
    let i = 1
    while (obj[i] !== undefined) {
      colors.push(asArray(obj[i]))
      i++
    }
  }
  return { text, colors, default_color }
}

describe('ansi.create_label()', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    engine = await createLuaWithAnsiCore()
  })

  afterEach(() => {
    engine.global.close()
  })

  describe('plain text (no markup)', () => {
    it('returns text with all default color', async () => {
      const result = await runCreateLabel(engine, '_ansi.create_label("Hello")')
      expect(result.text).toBe('Hello')
      expect(result.default_color).toEqual([170, 170, 170]) // LIGHT_GRAY
      expect(result.colors).toHaveLength(5)
      for (const c of result.colors) {
        expect(c).toEqual([170, 170, 170])
      }
    })

    it('handles empty string', async () => {
      const result = await runCreateLabel(engine, '_ansi.create_label("")')
      expect(result.text).toBe('')
      expect(result.colors).toHaveLength(0)
    })
  })

  describe('single color region', () => {
    it('parses a single color tag with CGA name', async () => {
      const result = await runCreateLabel(engine, '_ansi.create_label("[color=RED]Hi[/color]")')
      expect(result.text).toBe('Hi')
      expect(result.colors).toEqual([[170, 0, 0], [170, 0, 0]])
    })

    it('applies color to region and default elsewhere', async () => {
      const result = await runCreateLabel(engine, '_ansi.create_label("A[color=BLUE]B[/color]C")')
      expect(result.text).toBe('ABC')
      expect(result.colors[0]).toEqual([170, 170, 170]) // A = default
      expect(result.colors[1]).toEqual([0, 0, 170])      // B = BLUE
      expect(result.colors[2]).toEqual([170, 170, 170]) // C = default
    })
  })

  describe('multiple color regions', () => {
    it('handles multiple consecutive color tags', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=RED]R[/color][color=GREEN]G[/color]")')
      expect(result.text).toBe('RG')
      expect(result.colors[0]).toEqual([170, 0, 0])   // RED
      expect(result.colors[1]).toEqual([0, 170, 0])    // GREEN
    })
  })

  describe('hex colors', () => {
    it('parses #RRGGBB hex color', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=#FF0000]X[/color]")')
      expect(result.text).toBe('X')
      expect(result.colors[0]).toEqual([255, 0, 0])
    })

    it('parses #RGB short hex color', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=#F00]X[/color]")')
      expect(result.text).toBe('X')
      expect(result.colors[0]).toEqual([255, 0, 0])
    })
  })

  describe('CGA color names', () => {
    it('resolves all 16 CGA color names', async () => {
      const cgaColors: Record<string, number[]> = {
        BLACK: [0, 0, 0],
        BLUE: [0, 0, 170],
        GREEN: [0, 170, 0],
        CYAN: [0, 170, 170],
        RED: [170, 0, 0],
        MAGENTA: [170, 0, 170],
        BROWN: [170, 85, 0],
        LIGHT_GRAY: [170, 170, 170],
        DARK_GRAY: [85, 85, 85],
        BRIGHT_BLUE: [85, 85, 255],
        BRIGHT_GREEN: [85, 255, 85],
        BRIGHT_CYAN: [85, 255, 255],
        BRIGHT_RED: [255, 85, 85],
        BRIGHT_MAGENTA: [255, 85, 255],
        YELLOW: [255, 255, 85],
        WHITE: [255, 255, 255],
      }

      for (const [name, expected] of Object.entries(cgaColors)) {
        const result = await runCreateLabel(engine,
          `_ansi.create_label("[color=${name}]X[/color]")`)
        expect(result.colors[0]).toEqual(expected)
      }
    })

    it('resolves CGA_ prefixed names', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_RED]X[/color]")')
      expect(result.colors[0]).toEqual([170, 0, 0])
    })

    it('resolves CGA_ prefixed BRIGHT names', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_BRIGHT_RED]X[/color]")')
      expect(result.colors[0]).toEqual([255, 85, 85])
    })
  })

  describe('CGA ALT alternating colors', () => {
    it('alternates between dark and bright for CGA_ALT_RED', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_ALT_RED]AB[/color]")')
      expect(result.text).toBe('AB')
      expect(result.colors[0]).toEqual([170, 0, 0])    // RED (dark, position 1 = odd)
      expect(result.colors[1]).toEqual([255, 85, 85])  // BRIGHT_RED (bright, position 2 = even)
    })

    it('alternates CGA_ALT_GREEN', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_ALT_GREEN]ABCD[/color]")')
      expect(result.colors[0]).toEqual([0, 170, 0])     // GREEN
      expect(result.colors[1]).toEqual([85, 255, 85])   // BRIGHT_GREEN
      expect(result.colors[2]).toEqual([0, 170, 0])     // GREEN
      expect(result.colors[3]).toEqual([85, 255, 85])   // BRIGHT_GREEN
    })

    it('alternates CGA_ALT_BROWN between BROWN and YELLOW', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_ALT_BROWN]AB[/color]")')
      expect(result.colors[0]).toEqual([170, 85, 0])    // BROWN
      expect(result.colors[1]).toEqual([255, 255, 85])  // YELLOW
    })

    it('alternates CGA_ALT_GRAY between LIGHT_GRAY and WHITE', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_ALT_GRAY]AB[/color]")')
      expect(result.colors[0]).toEqual([170, 170, 170]) // LIGHT_GRAY
      expect(result.colors[1]).toEqual([255, 255, 255]) // WHITE
    })

    it('alternates CGA_ALT_BLACK between BLACK and DARK_GRAY', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=CGA_ALT_BLACK]AB[/color]")')
      expect(result.colors[0]).toEqual([0, 0, 0])       // BLACK
      expect(result.colors[1]).toEqual([85, 85, 85])    // DARK_GRAY
    })
  })

  describe('nested tags', () => {
    it('inner tag overrides outer, restores on close', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=BLUE]A[color=RED]B[/color]C[/color]")')
      expect(result.text).toBe('ABC')
      expect(result.colors[0]).toEqual([0, 0, 170])     // A = BLUE
      expect(result.colors[1]).toEqual([170, 0, 0])     // B = RED
      expect(result.colors[2]).toEqual([0, 0, 170])     // C = BLUE (restored)
    })
  })

  describe('extra [/color] tag', () => {
    it('extra close tag resets to default color', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("[color=RED]A[/color][/color]B")')
      expect(result.text).toBe('AB')
      expect(result.colors[0]).toEqual([170, 0, 0])     // RED
      expect(result.colors[1]).toEqual([170, 170, 170]) // default
    })
  })

  describe('custom default color', () => {
    it('accepts RGB table as default color', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("AB", {255, 128, 0})')
      expect(result.text).toBe('AB')
      expect(result.default_color).toEqual([255, 128, 0])
      expect(result.colors[0]).toEqual([255, 128, 0])
      expect(result.colors[1]).toEqual([255, 128, 0])
    })

    it('accepts hex string as default color', async () => {
      const result = await runCreateLabel(engine,
        '_ansi.create_label("AB", "#FF8000")')
      expect(result.text).toBe('AB')
      expect(result.default_color).toEqual([255, 128, 0])
      expect(result.colors[0]).toEqual([255, 128, 0])
    })
  })

  describe('error cases', () => {
    it('throws for non-string argument', async () => {
      await expect(engine.doString('_ansi.create_label(123)')).rejects.toThrow(
        'ansi.create_label() expects a string'
      )
    })

    it('throws for unknown color name', async () => {
      await expect(engine.doString(
        '_ansi.create_label("[color=PURPLE]X[/color]")'
      )).rejects.toThrow('Unknown color name')
    })
  })
})
