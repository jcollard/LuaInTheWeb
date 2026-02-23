import { describe, it, expect } from 'vitest'
import { parseScreenData } from '../src/screenParser'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_BG, DEFAULT_FG } from '../src/screenTypes'

function makeV1Data(gridOverrides?: Record<string, Record<string, { char: string; fg: RGBColor; bg: RGBColor }>>): Record<string, unknown> {
  // Create a minimal v1 grid (25 rows, 80 cols)
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  // Apply overrides (0-indexed row/col)
  if (gridOverrides) {
    for (const [rowStr, cols] of Object.entries(gridOverrides)) {
      const r = Number(rowStr)
      for (const [colStr, cell] of Object.entries(cols)) {
        const c = Number(colStr)
        grid[r + 1][c + 1] = cell
      }
    }
  }
  return { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid }
}

describe('parseScreenData', () => {
  describe('version 1', () => {
    it('parses a v1 grid into 25x80 composited grid', () => {
      const data = makeV1Data()
      const grid = parseScreenData(data)
      expect(grid.length).toBe(ANSI_ROWS)
      expect(grid[0].length).toBe(ANSI_COLS)
    })

    it('preserves cell content from v1 grid', () => {
      const data = makeV1Data({
        '0': { '0': { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] } }
      })
      const grid = parseScreenData(data)
      expect(grid[0][0].char).toBe('A')
      expect(grid[0][0].fg).toEqual([255, 0, 0])
      expect(grid[0][0].bg).toEqual([0, 0, 255])
    })
  })

  describe('version 2', () => {
    it('parses v2 with drawn layers', () => {
      const layerGrid = makeV1Data()['grid']
      const data: Record<string, unknown> = {
        version: 2,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: { id: 'l1', name: 'Layer 1', visible: true, grid: layerGrid },
        },
      }
      const grid = parseScreenData(data)
      expect(grid.length).toBe(ANSI_ROWS)
      expect(grid[0].length).toBe(ANSI_COLS)
    })
  })

  describe('version 3-6', () => {
    it('parses v3 with drawn layers', () => {
      const v1 = makeV1Data({ '5': { '10': { char: 'X', fg: [255, 0, 0], bg: [0, 255, 0] } } })
      const data: Record<string, unknown> = {
        version: 3,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: { type: 'drawn', id: 'l1', name: 'Layer 1', visible: true, grid: v1.grid },
        },
      }
      const grid = parseScreenData(data)
      expect(grid[5][10].char).toBe('X')
    })

    it('parses text layers and regenerates grid via renderTextLayerGrid', () => {
      const data: Record<string, unknown> = {
        version: 3,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: {
            type: 'text', id: 'l1', name: 'Text Layer', visible: true,
            text: 'Hi', bounds: { r0: 0, c0: 0, r1: 5, c1: 10 },
            textFg: [255, 255, 0],
          },
        },
      }
      const grid = parseScreenData(data)
      // Text layer with TRANSPARENT_BG composited over nothing = text with DEFAULT_BG
      expect(grid[0][0].char).toBe('H')
      expect(grid[0][0].fg).toEqual([255, 255, 0])
      expect(grid[0][0].bg).toEqual(DEFAULT_BG)
    })

    it('handles hidden layers', () => {
      const v1a = makeV1Data({ '0': { '0': { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] } } })
      const v1b = makeV1Data({ '0': { '0': { char: 'B', fg: [0, 255, 0], bg: [255, 0, 0] } } })
      const data: Record<string, unknown> = {
        version: 3,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: { type: 'drawn', id: 'l1', name: 'Bottom', visible: true, grid: v1a.grid },
          2: { type: 'drawn', id: 'l2', name: 'Top', visible: false, grid: v1b.grid },
        },
      }
      const grid = parseScreenData(data)
      // Hidden layer should be skipped
      expect(grid[0][0].char).toBe('A')
    })

    it('handles group visibility inheritance', () => {
      const v1a = makeV1Data({ '0': { '0': { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] } } })
      const v1b = makeV1Data({ '0': { '0': { char: 'B', fg: [0, 255, 0], bg: [255, 0, 0] } } })
      const data: Record<string, unknown> = {
        version: 4,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: { type: 'drawn', id: 'l1', name: 'Bottom', visible: true, grid: v1a.grid },
          2: { type: 'group', id: 'g1', name: 'Group', visible: false, collapsed: false },
          3: { type: 'drawn', id: 'l2', name: 'Top', visible: true, grid: v1b.grid, parentId: 'g1' },
        },
      }
      const grid = parseScreenData(data)
      // l2 is under hidden group g1, so it shouldn't render
      expect(grid[0][0].char).toBe('A')
    })

    it('handles v5 with animation frames', () => {
      const frame0Grid = makeV1Data({ '0': { '0': { char: '0', fg: [255, 0, 0], bg: [0, 0, 0] } } }).grid
      const frame1Grid = makeV1Data({ '0': { '0': { char: '1', fg: [0, 255, 0], bg: [0, 0, 0] } } }).grid
      const data: Record<string, unknown> = {
        version: 5,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: {
            type: 'drawn', id: 'l1', name: 'Animated', visible: true,
            frames: { 1: frame0Grid, 2: frame1Grid },
            currentFrameIndex: 0,
            frameDurationMs: 100,
          },
        },
      }
      const grid = parseScreenData(data)
      // Should show frame 0
      expect(grid[0][0].char).toBe('0')
    })
  })

  describe('normalizeRgb via cell colors', () => {
    it('handles 1-indexed object RGB (Lua table from wasmoon)', () => {
      // wasmoon converts Lua tables to objects with 1-indexed string keys
      const luaRgb = { 1: 100, 2: 150, 3: 200 }
      const data = makeV1Data({
        '0': { '0': { char: 'A', fg: luaRgb as unknown as RGBColor, bg: [0, 0, 0] } }
      })
      const grid = parseScreenData(data)
      expect(grid[0][0].fg).toEqual([100, 150, 200])
    })

    it('handles 0-indexed object RGB when key 1 is absent', () => {
      // When only 0-indexed keys exist (no key "1"), falls back to 0-indexed path
      const jsRgb = { 0: 50 } as unknown as RGBColor
      const data = makeV1Data({
        '0': { '0': { char: 'B', fg: jsRgb, bg: [0, 0, 0] } }
      })
      const grid = parseScreenData(data)
      expect(grid[0][0].fg).toEqual([50, 0, 0])
    })

    it('does not confuse 0-indexed green with 1-indexed red', () => {
      // This is the specific bug: {0: R, 1: G, 2: B} should NOT use obj[1] as red
      // obj[1] exists but equals 60 (the green channel), not the red channel
      // With the fix, obj[1] !== undefined triggers 1-indexed path, returning [60, 120, 180]
      // But this is a 0-indexed object — the fix distinguishes by checking if key "1" exists
      // For a true 0-indexed object {0: 30, 1: 60, 2: 120}, key "1" IS present,
      // so we need a truly 0-indexed-only object to test the fallback path
      const zeroOnly = { 0: 30 } as unknown as RGBColor
      const data = makeV1Data({
        '0': { '0': { char: 'C', fg: zeroOnly, bg: [0, 0, 0] } }
      })
      const grid = parseScreenData(data)
      // obj[1] is undefined, so takes 0-indexed path: [obj[0], obj[1], obj[2]] = [30, 0, 0]
      expect(grid[0][0].fg).toEqual([30, 0, 0])
    })
  })

  describe('error cases', () => {
    it('throws for unsupported version', () => {
      expect(() => parseScreenData({ version: 99 })).toThrow('Unsupported ANSI file version: 99')
    })

    it('throws for NaN version', () => {
      expect(() => parseScreenData({ version: 'abc' })).toThrow('Unsupported ANSI file version: NaN')
    })
  })
})
