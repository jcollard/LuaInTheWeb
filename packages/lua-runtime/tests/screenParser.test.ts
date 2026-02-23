import { describe, it, expect } from 'vitest'
import { parseScreenData } from '../src/screenParser'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_CELL, DEFAULT_BG, DEFAULT_FG, TRANSPARENT_BG } from '../src/screenTypes'

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

  describe('error cases', () => {
    it('throws for unsupported version', () => {
      expect(() => parseScreenData({ version: 99 })).toThrow('Unsupported ANSI file version: 99')
    })

    it('throws for NaN version', () => {
      expect(() => parseScreenData({ version: 'abc' })).toThrow('Unsupported ANSI file version: NaN')
    })
  })
})
