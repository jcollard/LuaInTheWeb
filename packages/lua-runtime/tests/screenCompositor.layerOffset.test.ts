import { describe, it, expect } from 'vitest'
import { compositeGridInto, compositeGrid } from '../src/screenCompositor'
import type { AnsiCell, AnsiGrid, DrawnLayerData, LayerData, ReferenceLayerData, RGBColor } from '../src/screenTypes'
import {
  ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_FG,
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
    parentId, tags: [],
  }
}

function makeRefLayer(id: string, sourceLayerId: string, offsetRow: number, offsetCol: number): ReferenceLayerData {
  return { type: 'reference', id, name: id, visible: true, sourceLayerId, offsetRow, offsetCol, tags: [] }
}

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]

describe('compositeGridInto with runtime layer offsets', () => {
  it('drawable layer with runtimeOffsetCol shifts content rightward', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('A', red, DEFAULT_BG)

    const layer = makeDrawnLayer('l1', true, grid)
    layer.runtimeOffsetCol = 80

    const target = makeEmptyGrid()
    // At viewport 0, layer at offset 80 should not be visible
    compositeGridInto(target, [layer], undefined, 0, 0)
    expect(target[0][0].char).toBe(' ')

    // At viewport 80, layer at offset 80 should show its content at (0,0)
    const target2 = makeEmptyGrid()
    compositeGridInto(target2, [layer], undefined, 0, 80)
    expect(target2[0][0].char).toBe('A')
  })

  it('drawable layer with runtimeOffsetRow shifts content downward', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('B', blue, DEFAULT_BG)

    const layer = makeDrawnLayer('l1', true, grid)
    layer.runtimeOffsetRow = 25

    const target = makeEmptyGrid()
    compositeGridInto(target, [layer], undefined, 25, 0)
    expect(target[0][0].char).toBe('B')
  })

  it('two drawable layers with different offsets create panoramic virtual canvas', () => {
    const gridLeft = makeEmptyGrid()
    gridLeft[12][40] = makeCell('L', red, DEFAULT_BG)

    const gridRight = makeEmptyGrid()
    gridRight[12][40] = makeCell('R', blue, DEFAULT_BG)

    const left = makeDrawnLayer('left', true, gridLeft)
    const right = makeDrawnLayer('right', true, gridRight)
    right.runtimeOffsetCol = 80

    const layers: LayerData[] = [left, right]

    // Viewport at 0: see left layer
    const t0 = makeEmptyGrid()
    compositeGridInto(t0, layers, undefined, 0, 0)
    expect(t0[12][40].char).toBe('L')

    // Viewport at 80: see right layer
    const t80 = makeEmptyGrid()
    compositeGridInto(t80, layers, undefined, 0, 80)
    expect(t80[12][40].char).toBe('R')

    // Viewport at 40: see right half of left + left half of right (partial)
    const t40 = makeEmptyGrid()
    compositeGridInto(t40, layers, undefined, 0, 40)
    expect(t40[12][0].char).toBe('L')  // left layer's col 40 appears at viewport col 0
    expect(t40[12][40].char).toBe(' ') // right layer's col 0 appears at viewport col 40, but col 0 of right is empty
  })

  it('reference layer with runtimeOffset accumulates both offsets', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('X', red, DEFAULT_BG)

    const source = makeDrawnLayer('src', false, grid)
    const ref = makeRefLayer('ref1', 'src', 0, 40)
    ref.runtimeOffsetCol = 40  // total effective offset: 40 + 40 = 80

    const layers: LayerData[] = [source, ref]

    // At viewport 80, the cell should be visible
    const target = makeEmptyGrid()
    compositeGridInto(target, layers, undefined, 0, 80)
    expect(target[0][0].char).toBe('X')

    // At viewport 40, should NOT be visible (only at persisted offset 40)
    const target2 = makeEmptyGrid()
    compositeGridInto(target2, layers, undefined, 0, 40)
    expect(target2[0][0].char).toBe(' ')
  })

  it('reference layer with runtimeOffsetRow accumulates row offsets', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('Y', blue, DEFAULT_BG)

    const source = makeDrawnLayer('src', false, grid)
    const ref = makeRefLayer('ref1', 'src', 10, 0)
    ref.runtimeOffsetRow = 15  // total effective offset: 10 + 15 = 25

    const layers: LayerData[] = [source, ref]

    // At viewport row 25, the cell should be visible
    const target = makeEmptyGrid()
    compositeGridInto(target, layers, undefined, 25, 0)
    expect(target[0][0].char).toBe('Y')

    // At viewport row 10, should NOT be visible (only persisted offset is 10)
    const target2 = makeEmptyGrid()
    compositeGridInto(target2, layers, undefined, 10, 0)
    expect(target2[0][0].char).toBe(' ')
  })

  it('zero runtime offset does not change compositing behavior', () => {
    const grid = makeEmptyGrid()
    grid[5][10] = makeCell('Z', red, DEFAULT_BG)

    const layer = makeDrawnLayer('l1', true, grid)
    layer.runtimeOffsetCol = 0
    layer.runtimeOffsetRow = 0

    const target = makeEmptyGrid()
    compositeGridInto(target, [layer])
    expect(target[5][10].char).toBe('Z')
  })

  it('undefined runtime offset does not change compositing behavior', () => {
    const grid = makeEmptyGrid()
    grid[5][10] = makeCell('U', red, DEFAULT_BG)

    const layer = makeDrawnLayer('l1', true, grid)
    // runtimeOffsetCol and runtimeOffsetRow are undefined (default)

    const target = makeEmptyGrid()
    compositeGridInto(target, [layer])
    expect(target[5][10].char).toBe('U')
  })

  it('compositeGrid also respects runtime offsets', () => {
    const grid = makeEmptyGrid()
    grid[0][0] = makeCell('G', blue, DEFAULT_BG)

    const layer = makeDrawnLayer('l1', true, grid)
    layer.runtimeOffsetCol = 80

    // compositeGrid has no viewport params, so offset layer should not be visible
    const result = compositeGrid([layer])
    expect(result[0][0].char).toBe(' ')
  })
})
