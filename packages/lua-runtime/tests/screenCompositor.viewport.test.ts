import { describe, it, expect } from 'vitest'
import { compositeGridInto } from '../src/screenCompositor'
import type { AnsiCell, AnsiGrid, DrawnLayerData, LayerData, ReferenceLayerData, RGBColor } from '../src/screenTypes'
import {
  ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_CELL, DEFAULT_FG,
  DEFAULT_FRAME_DURATION_MS,
} from '../src/screenTypes'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

function makeEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, (): AnsiCell => ({ char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }))
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

function makeRefLayer(id: string, sourceLayerId: string, offsetRow: number, offsetCol: number): ReferenceLayerData {
  return { type: 'reference', id, name: id, visible: true, sourceLayerId, offsetRow, offsetCol, tags: [] }
}

function isDefaultCell(cell: AnsiCell): boolean {
  return cell.char === ' ' && cell.fg[0] === DEFAULT_FG[0] && cell.fg[1] === DEFAULT_FG[1] && cell.fg[2] === DEFAULT_FG[2]
    && cell.bg[0] === DEFAULT_BG[0] && cell.bg[1] === DEFAULT_BG[1] && cell.bg[2] === DEFAULT_BG[2]
}

describe('compositeGridInto with viewport offset', () => {
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]

  it('with viewport (0,0) produces same result as default', () => {
    const grid = makeEmptyGrid()
    grid[5][10] = makeCell('X', red, DEFAULT_BG)
    const layers: LayerData[] = [makeDrawnLayer('l1', true, grid)]
    const expected = makeEmptyGrid()
    compositeGridInto(expected, layers)
    const target = makeEmptyGrid()
    compositeGridInto(target, layers, undefined, 0, 0)
    expect(target[5][10]).toEqual(expected[5][10])
  })

  it('viewport offset shifts which part of a reference layer is visible', () => {
    const gridA = makeEmptyGrid()
    gridA[0][0] = makeCell('A', red, DEFAULT_BG)
    const gridB = makeEmptyGrid()
    gridB[0][0] = makeCell('B', blue, DEFAULT_BG)

    const sourceA = makeDrawnLayer('srcA', true, gridA)
    const sourceB = makeDrawnLayer('srcB', true, gridB)
    const refA = makeRefLayer('refA', 'srcA', 0, 0)
    const refB = makeRefLayer('refB', 'srcB', 0, 80)

    const layers: LayerData[] = [sourceA, sourceB, refA, refB]

    const target0 = makeEmptyGrid()
    compositeGridInto(target0, layers, undefined, 0, 0)
    expect(target0[0][0].char).toBe('A')

    const target80 = makeEmptyGrid()
    compositeGridInto(target80, layers, undefined, 0, 80)
    expect(target80[0][0].char).toBe('B')
  })

  it('drawable layers outside viewport bounds return default cells', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('X', red, DEFAULT_BG)
    const layers: LayerData[] = [makeDrawnLayer('l1', true, grid)]

    const target = makeEmptyGrid()
    compositeGridInto(target, layers, undefined, 0, 80)
    expect(target[0][0]).toEqual(DEFAULT_CELL)
  })

  it('viewport row offset works', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('Y', red, DEFAULT_BG)
    const source = makeDrawnLayer('src', true, grid)
    const ref = makeRefLayer('ref1', 'src', 25, 0)

    const layers: LayerData[] = [source, ref]

    const target = makeEmptyGrid()
    compositeGridInto(target, layers, undefined, 25, 0)
    expect(target[0][0].char).toBe('Y')
  })

  it('partially visible reference layer shows correct slice', () => {
    const grid = makeEmptyGrid()
    grid[0][39] = makeCell('M', red, DEFAULT_BG)
    grid[0][79] = makeCell('R', red, DEFAULT_BG)

    const source = makeDrawnLayer('src', true, grid)
    const ref = makeRefLayer('ref1', 'src', 0, 0)
    const layers: LayerData[] = [source, ref]

    const target = makeEmptyGrid()
    compositeGridInto(target, layers, undefined, 0, 40)
    expect(isDefaultCell(target[0][0])).toBe(true)
    expect(target[0][39].char).toBe('R')
  })
})
