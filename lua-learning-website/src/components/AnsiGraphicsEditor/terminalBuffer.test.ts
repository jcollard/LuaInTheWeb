import { describe, it, expect, vi } from 'vitest'
import { TerminalBuffer } from './terminalBuffer'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from './types'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { ColorTransform } from './gridUtils'

function makeGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as RGBColor,
      bg: [...DEFAULT_BG] as RGBColor,
    }))
  )
}

function makeHandle(): AnsiTerminalHandle & { written: string[] } {
  const written: string[] = []
  return {
    written,
    write: (data: string) => { written.push(data) },
    container: document.createElement('div'),
    dispose: vi.fn(),
  }
}

describe('TerminalBuffer', () => {
  it('first flush writes all cells', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    // Should have written something (one batched write call)
    expect(handle.written.length).toBe(1)
    // The write should contain positioning for every cell
    const output = handle.written[0]
    // Check that it contains the positioning escape for cell (1,1) and (25,80)
    expect(output).toContain('\x1b[1;1H')
    expect(output).toContain(`\x1b[${ANSI_ROWS};${ANSI_COLS}H`)
  })

  it('same-grid flush writes nothing', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0
    // Flush same grid again — no changes
    buf.flush(grid)
    expect(handle.written.length).toBe(0)
  })

  it('one-cell change only writes that cell', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0

    // Change one cell
    const grid2 = makeGrid()
    grid2[5][10] = { char: '#', fg: [255, 0, 0] as RGBColor, bg: [0, 0, 255] as RGBColor }
    buf.flush(grid2)
    expect(handle.written.length).toBe(1)
    const output = handle.written[0]
    // Should position at row 6, col 11 (1-indexed)
    expect(output).toContain('\x1b[6;11H')
    expect(output).toContain('#')
    // Should NOT contain other cell positions (spot check)
    expect(output).not.toContain('\x1b[1;1H')
  })

  it('writeCell skips unchanged cell', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0

    // Write the same cell that's already in the buffer
    const cell: AnsiCell = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    buf.writeCell(0, 0, cell)
    expect(handle.written.length).toBe(0)
  })

  it('writeCell writes changed cell', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0

    const cell: AnsiCell = { char: 'X', fg: [255, 0, 0] as RGBColor, bg: [0, 255, 0] as RGBColor }
    buf.writeCell(3, 7, cell)
    expect(handle.written.length).toBe(1)
    expect(handle.written[0]).toContain('\x1b[4;8H')
    expect(handle.written[0]).toContain('X')
  })

  it('writeCell updates buffer so subsequent flush skips it', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0

    const cell: AnsiCell = { char: 'A', fg: [100, 100, 100] as RGBColor, bg: [50, 50, 50] as RGBColor }
    buf.writeCell(2, 4, cell)
    handle.written.length = 0

    // Now flush a grid that has this same cell at (2,4) — should skip it
    const grid2 = makeGrid()
    grid2[2][4] = { char: 'A', fg: [100, 100, 100] as RGBColor, bg: [50, 50, 50] as RGBColor }
    buf.flush(grid2)
    // The output should NOT contain the position for (2,4) since buffer already has it
    if (handle.written.length > 0) {
      expect(handle.written[0]).not.toContain('\x1b[3;5H')
    }
  })

  it('color transform change triggers full rewrite', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    // First flush with no transform
    buf.flush(grid)
    handle.written.length = 0

    // Flush same grid with a color transform — all cells change
    const transform: ColorTransform = (c: RGBColor) => [c[0] >> 1, c[1] >> 1, c[2] >> 1] as RGBColor
    buf.flush(grid, transform)
    expect(handle.written.length).toBe(1)
    // Should contain all cell positions (full rewrite)
    expect(handle.written[0]).toContain('\x1b[1;1H')
    expect(handle.written[0]).toContain(`\x1b[${ANSI_ROWS};${ANSI_COLS}H`)
  })

  it('invalidate forces full rewrite', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0

    buf.invalidate()
    buf.flush(grid)
    expect(handle.written.length).toBe(1)
    expect(handle.written[0]).toContain('\x1b[1;1H')
  })

  it('attach marks dirty so first flush after attach writes all', () => {
    const buf = new TerminalBuffer()
    const handle1 = makeHandle()
    buf.attach(handle1)
    const grid = makeGrid()
    buf.flush(grid)

    // Attach to a new handle
    const handle2 = makeHandle()
    buf.attach(handle2)
    buf.flush(grid)
    expect(handle2.written.length).toBe(1)
    expect(handle2.written[0]).toContain('\x1b[1;1H')
  })

  it('detach prevents writes', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    buf.detach()

    const grid = makeGrid()
    buf.flush(grid)
    expect(handle.written.length).toBe(0)

    const cell: AnsiCell = { char: 'Z', fg: [255, 0, 0] as RGBColor, bg: [0, 0, 0] as RGBColor }
    buf.writeCell(0, 0, cell)
    expect(handle.written.length).toBe(0)
  })

  it('writeCell applies color transform', () => {
    const buf = new TerminalBuffer()
    const handle = makeHandle()
    buf.attach(handle)
    const grid = makeGrid()
    buf.flush(grid)
    handle.written.length = 0

    const transform: ColorTransform = () => [42, 42, 42] as RGBColor
    const cell: AnsiCell = { char: 'T', fg: [255, 0, 0] as RGBColor, bg: [0, 255, 0] as RGBColor }
    buf.writeCell(0, 0, cell, transform)
    expect(handle.written.length).toBe(1)
    // Should contain the transformed color values
    expect(handle.written[0]).toContain('42;42;42')
  })
})
