import { describe, it, expect } from 'vitest'
import { hiddenGroupIds, visibleDrawableLayers, compositeCellCore, compositeGrid } from '../src/screenCompositor'
import type { AnsiCell, AnsiGrid, DrawableLayerData, DrawnLayerData, GroupLayerData, LayerData, RGBColor } from '../src/screenTypes'
import {
  ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_CELL,
  DEFAULT_FRAME_DURATION_MS, HALF_BLOCK, TRANSPARENT_BG, TRANSPARENT_HALF,
} from '../src/screenTypes'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

function makeEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
}

function makeDrawnLayer(id: string, visible: boolean, grid: AnsiGrid, parentId?: string): DrawnLayerData {
  return {
    type: 'drawn', id, name: id, visible, grid,
    frames: [grid], currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    parentId,
  }
}

function makeGroup(id: string, visible: boolean, parentId?: string): GroupLayerData {
  return { type: 'group', id, name: id, visible, collapsed: false, parentId }
}

describe('hiddenGroupIds', () => {
  it('returns empty set when all groups are visible', () => {
    const layers: LayerData[] = [makeGroup('g1', true)]
    expect(hiddenGroupIds(layers).size).toBe(0)
  })

  it('detects directly hidden groups', () => {
    const layers: LayerData[] = [makeGroup('g1', false)]
    const hidden = hiddenGroupIds(layers)
    expect(hidden.has('g1')).toBe(true)
  })

  it('propagates hidden status to nested sub-groups', () => {
    const layers: LayerData[] = [
      makeGroup('g1', false),
      makeGroup('g2', true, 'g1'),
    ]
    const hidden = hiddenGroupIds(layers)
    expect(hidden.has('g1')).toBe(true)
    expect(hidden.has('g2')).toBe(true)
  })

  it('does not propagate to groups without hidden ancestors', () => {
    const layers: LayerData[] = [
      makeGroup('g1', true),
      makeGroup('g2', true, 'g1'),
      makeGroup('g3', false),
    ]
    const hidden = hiddenGroupIds(layers)
    expect(hidden.has('g1')).toBe(false)
    expect(hidden.has('g2')).toBe(false)
    expect(hidden.has('g3')).toBe(true)
  })
})

describe('visibleDrawableLayers', () => {
  it('returns only drawable layers, excluding groups', () => {
    const grid = makeEmptyGrid()
    const layers: LayerData[] = [
      makeGroup('g1', true),
      makeDrawnLayer('l1', true, grid, 'g1'),
    ]
    const result = visibleDrawableLayers(layers)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('l1')
  })

  it('excludes layers under hidden groups', () => {
    const grid = makeEmptyGrid()
    const layers: LayerData[] = [
      makeGroup('g1', false),
      makeDrawnLayer('l1', true, grid, 'g1'),
      makeDrawnLayer('l2', true, grid),
    ]
    const result = visibleDrawableLayers(layers)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('l2')
  })
})

describe('compositeCellCore', () => {
  it('returns DEFAULT_CELL when all layers have default cells', () => {
    const grid = makeEmptyGrid()
    const layers: DrawableLayerData[] = [makeDrawnLayer('l1', true, grid)]
    const result = compositeCellCore(layers, (l) => l.grid[0][0])
    expect(result).toEqual(DEFAULT_CELL)
  })

  it('returns topmost non-default opaque cell', () => {
    const grid1 = makeEmptyGrid()
    grid1[0][0] = makeCell('A', [255, 0, 0], [0, 0, 255])
    const grid2 = makeEmptyGrid()
    grid2[0][0] = makeCell('B', [0, 255, 0], [255, 0, 0])

    const layers: DrawableLayerData[] = [
      makeDrawnLayer('l1', true, grid1),
      makeDrawnLayer('l2', true, grid2),
    ]
    // l2 is on top (higher index), so 'B' should win
    const result = compositeCellCore(layers, (l) => l.grid[0][0])
    expect(result.char).toBe('B')
    expect(result.fg).toEqual([0, 255, 0])
  })

  it('handles TRANSPARENT_BG text cells picking up bg from below', () => {
    const grid1 = makeEmptyGrid()
    grid1[0][0] = makeCell('X', [255, 0, 0], [0, 0, 128])

    const grid2 = makeEmptyGrid()
    grid2[0][0] = makeCell('T', [255, 255, 0], TRANSPARENT_BG)

    const layers: DrawableLayerData[] = [
      makeDrawnLayer('l1', true, grid1),
      makeDrawnLayer('l2', true, grid2),
    ]
    const result = compositeCellCore(layers, (l) => l.grid[0][0])
    // Text char 'T' with yellow fg, takes bg from layer below
    expect(result.char).toBe('T')
    expect(result.fg).toEqual([255, 255, 0])
    expect(result.bg).toEqual([0, 0, 128])
  })

  it('skips invisible layers via getCell returning null', () => {
    const grid1 = makeEmptyGrid()
    grid1[0][0] = makeCell('A', [255, 0, 0], [0, 0, 255])

    const grid2 = makeEmptyGrid()
    grid2[0][0] = makeCell('B', [0, 255, 0], [255, 0, 0])

    const layers: DrawableLayerData[] = [
      makeDrawnLayer('l1', true, grid1),
      makeDrawnLayer('l2', false, grid2),
    ]
    const result = compositeCellCore(layers, (l) => l.visible ? l.grid[0][0] : null)
    expect(result.char).toBe('A')
  })

  it('handles HALF_BLOCK compositing with TRANSPARENT_HALF', () => {
    const grid1 = makeEmptyGrid()
    grid1[0][0] = makeCell(HALF_BLOCK, [255, 0, 0], [0, 255, 0])

    const grid2 = makeEmptyGrid()
    grid2[0][0] = makeCell(HALF_BLOCK, TRANSPARENT_HALF, [0, 0, 255])

    const layers: DrawableLayerData[] = [
      makeDrawnLayer('l1', true, grid1),
      makeDrawnLayer('l2', true, grid2),
    ]
    const result = compositeCellCore(layers, (l) => l.grid[0][0])
    // top half from l1 (255,0,0 since l2 top is TRANSPARENT_HALF), bottom from l2 (0,0,255)
    expect(result.char).toBe(HALF_BLOCK)
    expect(result.fg).toEqual([255, 0, 0])  // top from l1
    expect(result.bg).toEqual([0, 0, 255])  // bottom from l2
  })

  it('returns DEFAULT_BG when pending text has no bg source', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('T', [255, 255, 0], TRANSPARENT_BG)

    const layers: DrawableLayerData[] = [makeDrawnLayer('l1', true, grid)]
    const result = compositeCellCore(layers, (l) => l.grid[0][0])
    expect(result.char).toBe('T')
    expect(result.bg).toEqual(DEFAULT_BG)
  })
})

describe('compositeGrid', () => {
  it('returns 25x80 grid', () => {
    const grid = makeEmptyGrid()
    const layers: LayerData[] = [makeDrawnLayer('l1', true, grid)]
    const result = compositeGrid(layers)
    expect(result.length).toBe(ANSI_ROWS)
    expect(result[0].length).toBe(ANSI_COLS)
  })

  it('composites two layers correctly', () => {
    const grid1 = makeEmptyGrid()
    grid1[5][10] = makeCell('X', [255, 0, 0], [0, 0, 255])

    const grid2 = makeEmptyGrid()
    grid2[5][10] = makeCell('Y', [0, 255, 0], [255, 0, 0])

    const layers: LayerData[] = [
      makeDrawnLayer('l1', true, grid1),
      makeDrawnLayer('l2', true, grid2),
    ]
    const result = compositeGrid(layers)
    expect(result[5][10].char).toBe('Y')
  })

  it('skips hidden group children', () => {
    const grid1 = makeEmptyGrid()
    grid1[0][0] = makeCell('A', [255, 0, 0], [0, 0, 255])

    const grid2 = makeEmptyGrid()
    grid2[0][0] = makeCell('B', [0, 255, 0], [255, 0, 0])

    const layers: LayerData[] = [
      makeDrawnLayer('l1', true, grid1),
      makeGroup('g1', false),
      makeDrawnLayer('l2', true, grid2, 'g1'),
    ]
    const result = compositeGrid(layers)
    expect(result[0][0].char).toBe('A')
  })
})
