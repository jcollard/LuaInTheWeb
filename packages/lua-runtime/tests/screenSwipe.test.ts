import { describe, it, expect, vi } from 'vitest'
import {
  startDitherOut, startDitherIn,
  startSwipeOut,
  advanceTransition,
} from '../src/screenSwipe'
import { createEmptyGrid, createFillGrid, ANSI_ROWS, ANSI_COLS } from '../src/screenTypes'
import type { AnsiGrid, AnsiCell, LayerData, DrawnLayerData, RGBColor } from '../src/screenTypes'

const total = ANSI_ROWS * ANSI_COLS

function makeTestLayer(id: string, visible: boolean, char: string, fg: RGBColor, bg: RGBColor): DrawnLayerData {
  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, (): AnsiCell => ({
      char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor,
    })),
  )
  return {
    id, name: id, type: 'drawn', visible,
    parentId: undefined, tags: [],
    grid, frames: [grid],
    currentFrameIndex: 0, frameDurationMs: 100,
  } as DrawnLayerData
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyState = any

function createMockState(layers: LayerData[], lastGrid: AnsiGrid | null = null) {
  return {
    layers,
    lastGrid,
    swipe: null as AnyState,
    needsRecomposite: false,
    dirty: false,
    viewportRow: 0,
    viewportCol: 0,
  }
}

/** Run a transition to completion, returning the onComplete callback. */
function runToCompletion(state: AnyState, dt = 1 / 60, maxFrames = 200): (() => void) | undefined {
  for (let i = 0; i < maxFrames; i++) {
    if (!state.swipe) return undefined
    const r = advanceTransition(state, dt)
    if (r.onComplete) return r.onComplete
  }
  return undefined
}

function countCellsMatching(grid: AnsiGrid, match: (cell: AnsiCell) => boolean): number {
  let count = 0
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      if (match(grid[r][c])) count++
    }
  }
  return count
}

function allCellsMatch(grid: AnsiGrid, match: (cell: AnsiCell) => boolean): boolean {
  return countCellsMatching(grid, match) === total
}

function isBlackCell(cell: AnsiCell): boolean {
  return cell.bg[0] === 0 && cell.bg[1] === 0 && cell.bg[2] === 0 && cell.char === ' '
}

describe('advanceTransition', () => {
  describe('dither_out completion', () => {
    it('reaches 100% and clears swipe state', () => {
      const layer = makeTestLayer('bg', true, 'X', [255, 255, 255], [100, 100, 100])
      const state = createMockState([layer], createFillGrid('X', [100, 100, 100]))

      startDitherOut(state, 1.0, [0, 0, 0], ' ', 42, new Map())
      expect(state.swipe).not.toBeNull()

      runToCompletion(state)

      expect(state.swipe).toBeNull()
    })

    it('returns onComplete callback on completion', () => {
      const onComplete = vi.fn()
      const layer = makeTestLayer('bg', true, 'X', [255, 255, 255], [100, 100, 100])
      const state = createMockState([layer], createFillGrid('X', [100, 100, 100]))

      startDitherOut(state, 0.5, [0, 0, 0], ' ', 42, new Map(), onComplete)

      const returned = runToCompletion(state)

      expect(returned).toBeDefined()
      returned!()
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('lastGrid is all-black after completion', () => {
      const layer = makeTestLayer('bg', true, 'X', [255, 255, 255], [100, 100, 100])
      const state = createMockState([layer], createFillGrid('X', [100, 100, 100]))

      startDitherOut(state, 1.0, [0, 0, 0], ' ', 42, new Map())
      runToCompletion(state)

      expect(state.swipe).toBeNull()
      expect(state.lastGrid).not.toBeNull()
      expect(allCellsMatch(state.lastGrid!, isBlackCell)).toBe(true)
    })
  })

  describe('dither_in completion with layer commit', () => {
    it('commits layer visibility on completion', () => {
      const layer = makeTestLayer('scene', false, 'S', [200, 200, 200], [50, 50, 50])
      const state = createMockState([layer], createFillGrid(' ', [0, 0, 0]))

      startDitherIn(state, [layer], [layer], 0.5, 42, new Map())
      runToCompletion(state)

      expect(state.swipe).toBeNull()
      expect(layer.visible).toBe(true)
      expect(state.needsRecomposite).toBe(true)
    })
  })

  describe('back-to-back dither_out then dither_in', () => {
    it('second transition produces 100% target at completion', () => {
      const layer = makeTestLayer('scene', true, 'S', [200, 200, 200], [50, 50, 50])
      const initialGrid = createFillGrid('S', [50, 50, 50])
      const state = createMockState([layer], initialGrid)

      // Phase 1: dither_out to black
      startDitherOut(state, 0.5, [0, 0, 0], ' ', 42, new Map())
      const cb1 = runToCompletion(state)
      expect(state.swipe).toBeNull()

      // Phase 2: start dither_in (simulating what on_complete would do)
      layer.visible = false
      startDitherIn(state, [layer], [layer], 0.5, 99, new Map())

      expect(state.swipe).not.toBeNull()
      expect(state.swipe!.mode).toBe('dither')
      expect(state.swipe!.inOut).toBe('in')

      // Run phase 2 to completion
      runToCompletion(state)

      expect(state.swipe).toBeNull()
      expect(layer.visible).toBe(true)
      expect(state.lastGrid).not.toBeNull()
      // The target of dither_in is the composite with scene visible (bg [50,50,50])
      // Verify no black cells remain
      const blackCount = countCellsMatching(state.lastGrid!, isBlackCell)
      expect(blackCount).toBe(0)
    })
  })

  describe('swipe_out completion', () => {
    it('reaches 100% and clears swipe state', () => {
      const layer = makeTestLayer('bg', true, 'X', [255, 255, 255], [100, 100, 100])
      const state = createMockState([layer], createFillGrid('X', [100, 100, 100]))

      startSwipeOut(state, 1.0, [0, 0, 0], ' ', 'right', new Map())
      runToCompletion(state)

      expect(state.swipe).toBeNull()
      expect(allCellsMatch(state.lastGrid!, isBlackCell)).toBe(true)
    })
  })
})
