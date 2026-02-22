import { describe, it, expect } from 'vitest'
import { flipGridHorizontal, flipGridVertical, flipDrawnLayerHorizontal, flipDrawnLayerVertical, flipTextLayerHorizontal, flipTextLayerVertical } from './flipUtils'
import type { AnsiCell, RGBColor, DrawnLayer, TextLayer } from './types'
import { DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, DEFAULT_FRAME_DURATION_MS } from './types'
import { createEmptyGrid } from './gridUtils'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

const RED: RGBColor = [255, 0, 0]
const BLUE: RGBColor = [0, 0, 255]
const GREEN: RGBColor = [0, 255, 0]

function makeDrawnLayer(overrides?: Partial<DrawnLayer>): DrawnLayer {
  const grid = createEmptyGrid()
  return {
    type: 'drawn',
    id: 'test-layer',
    name: 'Test',
    visible: true,
    grid,
    frames: [grid],
    currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    ...overrides,
  }
}

function makeTextLayer(overrides?: Partial<TextLayer>): TextLayer {
  const grid = createEmptyGrid()
  return {
    type: 'text',
    id: 'text-layer',
    name: 'Text',
    visible: true,
    grid,
    text: 'hello',
    bounds: { r0: 5, c0: 10, r1: 5, c1: 14 },
    textFg: DEFAULT_FG,
    ...overrides,
  }
}

describe('flipGridHorizontal', () => {
  it('mirrors a cell across the origin column', () => {
    const grid = createEmptyGrid()
    grid[0][10] = makeCell('A', RED, DEFAULT_BG)
    const result = flipGridHorizontal(grid, 40)
    // Cell at col 10 should map to col 2*40 - 10 = 70
    expect(result[0][70].char).toBe('A')
    expect(result[0][70].fg).toEqual(RED)
    // Original position should be default
    expect(result[0][10].char).toBe(' ')
  })

  it('discards cells that map out of bounds', () => {
    const grid = createEmptyGrid()
    // Place a cell at col 0, origin at 0 -> maps to col 0 (stays)
    grid[5][0] = makeCell('X', RED, DEFAULT_BG)
    const result = flipGridHorizontal(grid, 0)
    expect(result[5][0].char).toBe('X')
  })

  it('discards cells that flip beyond grid width', () => {
    const grid = createEmptyGrid()
    // Place at col 0, origin at 79 -> maps to 2*79 - 0 = 158, out of bounds
    grid[5][0] = makeCell('X', RED, DEFAULT_BG)
    const result = flipGridHorizontal(grid, 79)
    // Cell should not appear at col 0 (it was moved) and not at 158 (out of bounds)
    expect(result[5][0].char).toBe(' ')
  })

  it('preserves cells at the origin column', () => {
    const grid = createEmptyGrid()
    grid[3][40] = makeCell('O', BLUE, DEFAULT_BG)
    const result = flipGridHorizontal(grid, 40)
    // 2*40 - 40 = 40, same position
    expect(result[3][40].char).toBe('O')
    expect(result[3][40].fg).toEqual(BLUE)
  })

  it('swaps cells symmetrically around origin', () => {
    const grid = createEmptyGrid()
    grid[0][39] = makeCell('L', RED, DEFAULT_BG)
    grid[0][41] = makeCell('R', BLUE, DEFAULT_BG)
    const result = flipGridHorizontal(grid, 40)
    // col 39 -> 2*40 - 39 = 41, col 41 -> 2*40 - 41 = 39
    expect(result[0][41].char).toBe('L')
    expect(result[0][39].char).toBe('R')
  })

  it('returns a new grid without mutating the input', () => {
    const grid = createEmptyGrid()
    grid[0][10] = makeCell('A', RED, DEFAULT_BG)
    const result = flipGridHorizontal(grid, 40)
    expect(result).not.toBe(grid)
    expect(grid[0][10].char).toBe('A') // original untouched
  })
})

describe('flipGridVertical', () => {
  it('mirrors a cell across the origin row', () => {
    const grid = createEmptyGrid()
    grid[5][0] = makeCell('A', RED, DEFAULT_BG)
    const result = flipGridVertical(grid, 12)
    // row 5 -> 2*12 - 5 = 19
    expect(result[19][0].char).toBe('A')
    expect(result[19][0].fg).toEqual(RED)
    expect(result[5][0].char).toBe(' ')
  })

  it('discards cells that map out of bounds', () => {
    const grid = createEmptyGrid()
    // Place at row 0, origin at 24 -> maps to 2*24 - 0 = 48, out of bounds (ANSI_ROWS=25)
    grid[0][0] = makeCell('X', RED, DEFAULT_BG)
    const result = flipGridVertical(grid, 24)
    expect(result[0][0].char).toBe(' ')
  })

  it('swaps fg/bg for HALF_BLOCK cells on vertical flip', () => {
    const grid = createEmptyGrid()
    grid[5][10] = makeCell(HALF_BLOCK, RED, BLUE)
    const result = flipGridVertical(grid, 12)
    const flippedRow = 2 * 12 - 5 // = 19
    expect(result[flippedRow][10].char).toBe(HALF_BLOCK)
    expect(result[flippedRow][10].fg).toEqual(BLUE) // swapped
    expect(result[flippedRow][10].bg).toEqual(RED)  // swapped
  })

  it('does NOT swap fg/bg for non-HALF_BLOCK cells', () => {
    const grid = createEmptyGrid()
    grid[5][10] = makeCell('A', RED, BLUE)
    const result = flipGridVertical(grid, 12)
    const flippedRow = 2 * 12 - 5
    expect(result[flippedRow][10].fg).toEqual(RED)
    expect(result[flippedRow][10].bg).toEqual(BLUE)
  })

  it('preserves cells at the origin row', () => {
    const grid = createEmptyGrid()
    grid[12][0] = makeCell('O', GREEN, DEFAULT_BG)
    const result = flipGridVertical(grid, 12)
    expect(result[12][0].char).toBe('O')
  })

  it('returns a new grid without mutating the input', () => {
    const grid = createEmptyGrid()
    grid[5][0] = makeCell('A', RED, DEFAULT_BG)
    const result = flipGridVertical(grid, 12)
    expect(result).not.toBe(grid)
    expect(grid[5][0].char).toBe('A')
  })
})

describe('flipDrawnLayerHorizontal', () => {
  it('flips all frames horizontally', () => {
    const frame0 = createEmptyGrid()
    frame0[0][10] = makeCell('A', RED, DEFAULT_BG)
    const frame1 = createEmptyGrid()
    frame1[0][20] = makeCell('B', BLUE, DEFAULT_BG)
    const layer = makeDrawnLayer({ grid: frame0, frames: [frame0, frame1], currentFrameIndex: 0 })

    const result = flipDrawnLayerHorizontal(layer, 40)
    expect(result.frames).toHaveLength(2)
    // frame0: col 10 -> col 70
    expect(result.frames[0][0][70].char).toBe('A')
    // frame1: col 20 -> col 60
    expect(result.frames[1][0][60].char).toBe('B')
    // grid should match the current frame
    expect(result.grid).toBe(result.frames[0])
  })

  it('preserves currentFrameIndex and metadata', () => {
    const frame0 = createEmptyGrid()
    const frame1 = createEmptyGrid()
    frame1[0][5] = makeCell('X', RED, DEFAULT_BG)
    const layer = makeDrawnLayer({ grid: frame1, frames: [frame0, frame1], currentFrameIndex: 1 })

    const result = flipDrawnLayerHorizontal(layer, 40)
    expect(result.currentFrameIndex).toBe(1)
    expect(result.grid).toBe(result.frames[1])
    expect(result.id).toBe('test-layer')
    expect(result.name).toBe('Test')
  })

  it('does not mutate the original layer', () => {
    const grid = createEmptyGrid()
    grid[0][10] = makeCell('A', RED, DEFAULT_BG)
    const layer = makeDrawnLayer({ grid, frames: [grid] })
    flipDrawnLayerHorizontal(layer, 40)
    expect(layer.grid[0][10].char).toBe('A')
  })
})

describe('flipDrawnLayerVertical', () => {
  it('flips all frames vertically', () => {
    const frame0 = createEmptyGrid()
    frame0[5][0] = makeCell('A', RED, DEFAULT_BG)
    const layer = makeDrawnLayer({ grid: frame0, frames: [frame0], currentFrameIndex: 0 })

    const result = flipDrawnLayerVertical(layer, 12)
    expect(result.frames[0][19][0].char).toBe('A')
    expect(result.grid).toBe(result.frames[0])
  })

  it('swaps fg/bg for HALF_BLOCK cells in all frames', () => {
    const frame0 = createEmptyGrid()
    frame0[5][0] = makeCell(HALF_BLOCK, RED, BLUE)
    const layer = makeDrawnLayer({ grid: frame0, frames: [frame0] })

    const result = flipDrawnLayerVertical(layer, 12)
    const flippedRow = 2 * 12 - 5
    expect(result.frames[0][flippedRow][0].fg).toEqual(BLUE)
    expect(result.frames[0][flippedRow][0].bg).toEqual(RED)
  })
})

describe('flipTextLayerHorizontal', () => {
  it('mirrors text bounds around the origin column', () => {
    const layer = makeTextLayer({ bounds: { r0: 5, c0: 10, r1: 5, c1: 14 } })
    const result = flipTextLayerHorizontal(layer, 40)
    // c0=10 -> 2*40 - 10 = 70; c1=14 -> 2*40 - 14 = 66
    // After flip, new c0 = min(66,70) = 66, new c1 = max(66,70) = 70
    expect(result.bounds.c0).toBe(66)
    expect(result.bounds.c1).toBe(70)
    expect(result.bounds.r0).toBe(5) // rows unchanged
    expect(result.bounds.r1).toBe(5)
  })

  it('preserves text layer metadata', () => {
    const layer = makeTextLayer()
    const result = flipTextLayerHorizontal(layer, 40)
    expect(result.id).toBe('text-layer')
    expect(result.name).toBe('Text')
    expect(result.text).toBe('hello')
  })

  it('does not mutate the original layer', () => {
    const layer = makeTextLayer({ bounds: { r0: 5, c0: 10, r1: 5, c1: 14 } })
    flipTextLayerHorizontal(layer, 40)
    expect(layer.bounds.c0).toBe(10)
    expect(layer.bounds.c1).toBe(14)
  })
})

describe('flipTextLayerVertical', () => {
  it('mirrors text bounds around the origin row', () => {
    const layer = makeTextLayer({ bounds: { r0: 5, c0: 10, r1: 8, c1: 14 } })
    const result = flipTextLayerVertical(layer, 12)
    // r0=5 -> 2*12 - 5 = 19; r1=8 -> 2*12 - 8 = 16
    // After flip, new r0 = min(16,19) = 16, new r1 = max(16,19) = 19
    expect(result.bounds.r0).toBe(16)
    expect(result.bounds.r1).toBe(19)
    expect(result.bounds.c0).toBe(10) // cols unchanged
    expect(result.bounds.c1).toBe(14)
  })

  it('preserves text layer metadata', () => {
    const layer = makeTextLayer()
    const result = flipTextLayerVertical(layer, 12)
    expect(result.id).toBe('text-layer')
    expect(result.text).toBe('hello')
  })

  it('does not mutate the original layer', () => {
    const layer = makeTextLayer({ bounds: { r0: 5, c0: 10, r1: 8, c1: 14 } })
    flipTextLayerVertical(layer, 12)
    expect(layer.bounds.r0).toBe(5)
    expect(layer.bounds.r1).toBe(8)
  })
})
