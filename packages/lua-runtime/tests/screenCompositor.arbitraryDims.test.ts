import { describe, it, expect } from 'vitest'
import { compositeGrid, compositeGridInto } from '../src/screenCompositor'
import type { AnsiGrid, DrawnLayerData, LayerData, ReferenceLayerData, RGBColor } from '../src/screenTypes'
import { DEFAULT_FRAME_DURATION_MS, DEFAULT_BG, DEFAULT_FG, createEmptyGrid } from '../src/screenTypes'

function makeFilledGrid(cols: number, rows: number, char: string, fg: RGBColor, bg: RGBColor): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }))
  )
}

function makeDrawn(id: string, grid: AnsiGrid): DrawnLayerData {
  return {
    type: 'drawn', id, name: id, visible: true, grid,
    frames: [grid], currentFrameIndex: 0, frameDurationMs: DEFAULT_FRAME_DURATION_MS,
    tags: [],
  }
}

function makeReference(id: string, sourceLayerId: string, offsetRow: number, offsetCol: number): ReferenceLayerData {
  return {
    type: 'reference', id, name: id, visible: true,
    sourceLayerId, offsetRow, offsetCol, tags: [],
  }
}

describe('compositeGrid with arbitrary dimensions', () => {
  it('composites a 120×40 grid at the authored size', () => {
    const layer = makeDrawn('bg', makeFilledGrid(120, 40, '#', [255, 0, 0], [0, 0, 0]))
    const out = compositeGrid([layer], undefined, 120, 40)
    expect(out.length).toBe(40)
    expect(out[0].length).toBe(120)
    expect(out[0][0].char).toBe('#')
    expect(out[39][119].char).toBe('#')
  })

  it('composites a 40×10 grid at the authored size', () => {
    const layer = makeDrawn('bg', makeFilledGrid(40, 10, 'x', [0, 255, 0], [0, 0, 0]))
    const out = compositeGrid([layer], undefined, 40, 10)
    expect(out.length).toBe(10)
    expect(out[0].length).toBe(40)
    expect(out[9][39].char).toBe('x')
  })

  it('defaults to 80×25 when dims are omitted', () => {
    const out = compositeGrid([])
    expect(out.length).toBe(25)
    expect(out[0].length).toBe(80)
  })

  it('compositeGridInto uses the target grid dims', () => {
    const layer = makeDrawn('bg', makeFilledGrid(120, 40, '+', [0, 0, 255], [0, 0, 0]))
    const target = createEmptyGrid(120, 40)
    compositeGridInto(target, [layer])
    expect(target[20][100].char).toBe('+')
  })

  it('reference layer clips to output grid dims, not to a fixed 80×25', () => {
    // Source grid is 120x40; reference layer offsets it by (-5, -10) so some
    // cells map outside the output grid. Output is 20x6 — cells outside that
    // window must not crash or leak.
    const source = makeFilledGrid(120, 40, 'S', [255, 255, 255], [0, 0, 0])
    const sourceLayer = makeDrawn('src', source)
    const ref = makeReference('ref', 'src', -5, -10)
    const out = compositeGrid([sourceLayer, ref], undefined, 20, 6)
    expect(out.length).toBe(6)
    expect(out[0].length).toBe(20)
    // Every visible cell should be 'S' (source is fully filled, ref just shifts).
    expect(out[0][0].char).toBe('S')
    expect(out[5][19].char).toBe('S')
  })
})
