import { describe, it, expect } from 'vitest'
import { resizeGrid, resizeProject } from './resizeGrid'
import type { AnsiCell, AnsiGrid, DrawnLayer, LayerState, RGBColor } from './types'
import { DEFAULT_FRAME_DURATION_MS } from './types'

function cell(char: string, fg: RGBColor = [1, 2, 3], bg: RGBColor = [4, 5, 6]): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

function makeGrid(cols: number, rows: number, char: string): AnsiGrid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => cell(char)))
}

describe('resizeGrid', () => {
  it('pads with default cells when enlarging (top-left anchor)', () => {
    const src = makeGrid(2, 2, 'X')
    const out = resizeGrid(src, 4, 3)
    expect(out.length).toBe(3)
    expect(out[0].length).toBe(4)
    expect(out[0][0].char).toBe('X')
    expect(out[1][1].char).toBe('X')
    // Padded cells should be defaults (space)
    expect(out[0][2].char).toBe(' ')
    expect(out[2][0].char).toBe(' ')
  })

  it('crops when shrinking (top-left anchor)', () => {
    const src = makeGrid(5, 3, 'Y')
    const out = resizeGrid(src, 3, 2)
    expect(out.length).toBe(2)
    expect(out[0].length).toBe(3)
    expect(out[0][0].char).toBe('Y')
    expect(out[1][2].char).toBe('Y')
  })

  it('centers content when enlarging with center anchor', () => {
    const src = makeGrid(2, 2, 'Z')
    const out = resizeGrid(src, 4, 4, 'center')
    // offset = (4-2)/2 = 1 in both axes, so source (0,0) lands at out[1][1]
    expect(out[0][0].char).toBe(' ')
    expect(out[1][1].char).toBe('Z')
    expect(out[2][2].char).toBe('Z')
    expect(out[3][3].char).toBe(' ')
  })

  it('produces a grid of the requested dimensions exactly', () => {
    const src = makeGrid(80, 25, '.')
    const out = resizeGrid(src, 120, 40)
    expect(out.length).toBe(40)
    expect(out[0].length).toBe(120)
  })
})

describe('resizeProject', () => {
  it('resizes every drawn frame and updates cols/rows', () => {
    const frames = [makeGrid(10, 5, 'a'), makeGrid(10, 5, 'b')]
    const drawn: DrawnLayer = {
      type: 'drawn', id: 'l', name: 'L', visible: true,
      grid: frames[0], frames, currentFrameIndex: 0,
      frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    }
    const state: LayerState = { layers: [drawn], activeLayerId: 'l', cols: 10, rows: 5 }
    const resized = resizeProject(state, 20, 8)
    expect(resized.cols).toBe(20)
    expect(resized.rows).toBe(8)
    const drawnOut = resized.layers[0] as DrawnLayer
    expect(drawnOut.frames.length).toBe(2)
    expect(drawnOut.frames[0].length).toBe(8)
    expect(drawnOut.frames[0][0].length).toBe(20)
    expect(drawnOut.frames[0][0][0].char).toBe('a')
    expect(drawnOut.frames[1][0][0].char).toBe('b')
  })
})
