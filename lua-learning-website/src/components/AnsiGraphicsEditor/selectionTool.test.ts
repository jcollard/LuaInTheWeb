import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AnsiCell, RGBColor } from './types'
import { DEFAULT_CELL, DEFAULT_FG, DEFAULT_BG, ANSI_ROWS, ANSI_COLS } from './types'
import { createSelectionHandlers, type SelectionDeps, clearClipboard } from './selectionTool'
import { parseCellKey } from './gridUtils'

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]

function makeCell(char: string, fg: RGBColor = red, bg: RGBColor = blue): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

function makeGrid(): AnsiCell[][] {
  const grid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, (): AnsiCell => ({ ...DEFAULT_CELL, fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }))
  )
  // Place some recognizable cells at top-left
  grid[0][0] = makeCell('A')
  grid[0][1] = makeCell('B')
  grid[1][0] = makeCell('C')
  grid[1][1] = makeCell('D')
  return grid
}

function makeDeps(gridOverride?: AnsiCell[][]): SelectionDeps & {
  committed: Map<string, AnsiCell>[]
  snapshots: number
  previews: Map<string, AnsiCell>[]
  restoreCount: number
} {
  const grid = gridOverride ?? makeGrid()
  const committed: Map<string, AnsiCell>[] = []
  const previews: Map<string, AnsiCell>[] = []
  let snapshots = 0
  let restoreCount = 0
  const deps: SelectionDeps & {
    committed: Map<string, AnsiCell>[]
    snapshots: number
    previews: Map<string, AnsiCell>[]
    restoreCount: number
  } = {
    container: document.createElement('div'),
    selectionRef: { current: document.createElement('div') },
    commitPendingRef: { current: null },
    restorePreview: () => { restoreCount++ },
    writePreviewCells: (cells) => { previews.push(cells) },
    commitCells: (cells) => {
      committed.push(cells)
      for (const [key, cell] of cells) {
        const [r, c] = parseCellKey(key)
        if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
          grid[r][c] = { char: cell.char, fg: [...cell.fg] as RGBColor, bg: [...cell.bg] as RGBColor }
        }
      }
    },
    pushSnapshot: () => { snapshots++ },
    getActiveGrid: () => grid,
    hideDimension: () => {},
    committed,
    get snapshots() { return snapshots },
    previews,
    get restoreCount() { return restoreCount },
  }
  return deps
}

function keyEvent(key: string, ctrl = false): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, ctrlKey: ctrl, bubbles: true, cancelable: true })
  // Spy on preventDefault
  vi.spyOn(e, 'preventDefault')
  return e
}

/** Select a 2x2 region at (0,0)-(1,1) and enter 'selected' phase */
function selectRegion(handlers: ReturnType<typeof createSelectionHandlers>): void {
  handlers.onMouseDown(0, 0)
  handlers.onMouseMove(1, 1)
  handlers.onMouseUp()
}

beforeEach(() => {
  clearClipboard()
})

describe('selectionTool onKeyDown', () => {
  describe('Copy (Ctrl+C)', () => {
    it('should store cells in clipboard without modifying the grid', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      const e = keyEvent('c', true)
      handlers.onKeyDown(e)

      expect(e.preventDefault).toHaveBeenCalled()
      // No grid modifications (no commitCells, no pushSnapshot)
      expect(deps.committed.length).toBe(0)
      expect(deps.snapshots).toBe(0)
    })

    it('should be a no-op when not in selected phase', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      // Don't select anything - still idle

      const e = keyEvent('c', true)
      handlers.onKeyDown(e)

      // No-op, no errors
      expect(deps.committed.length).toBe(0)
    })
  })

  describe('Cut (Ctrl+X)', () => {
    it('should push undo snapshot and clear source cells to DEFAULT_CELL', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      const e = keyEvent('x', true)
      handlers.onKeyDown(e)

      expect(e.preventDefault).toHaveBeenCalled()
      expect(deps.snapshots).toBe(1)
      expect(deps.committed.length).toBe(1)

      const committed = deps.committed[0]
      // All 4 cells should be cleared to DEFAULT_CELL
      for (const [, cell] of committed) {
        expect(cell.char).toBe(DEFAULT_CELL.char)
        expect(cell.fg).toEqual(DEFAULT_CELL.fg)
        expect(cell.bg).toEqual(DEFAULT_CELL.bg)
      }
    })

    it('should be a no-op when not in selected phase', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)

      const e = keyEvent('x', true)
      handlers.onKeyDown(e)

      expect(deps.committed.length).toBe(0)
      expect(deps.snapshots).toBe(0)
    })
  })

  describe('Paste (Ctrl+V)', () => {
    it('should create a floating preview at (0,0) after copy', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      // Copy
      handlers.onKeyDown(keyEvent('c', true))

      // Paste
      const e = keyEvent('v', true)
      handlers.onKeyDown(e)

      expect(e.preventDefault).toHaveBeenCalled()
      // Should have written preview cells
      expect(deps.previews.length).toBeGreaterThan(0)
    })

    it('should be a no-op when clipboard is empty', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)

      const e = keyEvent('v', true)
      handlers.onKeyDown(e)

      // No preview written
      expect(deps.previews.length).toBe(0)
    })

    it('should commit pasted content on click-away with undo snapshot', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      // Copy then paste
      handlers.onKeyDown(keyEvent('c', true))
      handlers.onKeyDown(keyEvent('v', true))

      // Click outside selection to commit
      handlers.onMouseDown(10, 10)

      // Should have pushed a snapshot and committed cells
      expect(deps.snapshots).toBeGreaterThanOrEqual(1)
      expect(deps.committed.length).toBeGreaterThanOrEqual(1)
    })

    it('should commit unmoved pasted content (isPasted flag)', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      // Copy then paste
      handlers.onKeyDown(keyEvent('c', true))
      handlers.onKeyDown(keyEvent('v', true))

      // Commit by clicking outside (unmoved paste should still commit)
      const snapshotsBefore = deps.snapshots
      handlers.onMouseDown(20, 20)

      expect(deps.snapshots).toBeGreaterThan(snapshotsBefore)
      expect(deps.committed.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Delete', () => {
    it('should push undo snapshot and clear selected cells', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      const e = keyEvent('Delete')
      handlers.onKeyDown(e)

      expect(e.preventDefault).toHaveBeenCalled()
      expect(deps.snapshots).toBe(1)
      expect(deps.committed.length).toBe(1)

      const committed = deps.committed[0]
      expect(committed.size).toBe(4) // 2x2 region
      for (const [, cell] of committed) {
        expect(cell.char).toBe(DEFAULT_CELL.char)
      }
    })

    it('should clear selection after delete', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      handlers.onKeyDown(keyEvent('Delete'))

      // Another Delete should be no-op (phase is now idle)
      const snapshotsBefore = deps.snapshots
      handlers.onKeyDown(keyEvent('Delete'))
      expect(deps.snapshots).toBe(snapshotsBefore)
    })
  })

  describe('Cut + Paste cycle', () => {
    it('should cut cells then paste them at new location', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      // Cut
      handlers.onKeyDown(keyEvent('x', true))
      expect(deps.committed.length).toBe(1)

      // Paste
      handlers.onKeyDown(keyEvent('v', true))
      expect(deps.previews.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple pastes', () => {
    it('should commit previous paste before starting new one', () => {
      const deps = makeDeps()
      const handlers = createSelectionHandlers(deps)
      selectRegion(handlers)

      // Copy
      handlers.onKeyDown(keyEvent('c', true))

      // First paste
      handlers.onKeyDown(keyEvent('v', true))

      // Second paste should commit the first
      const commitsBefore = deps.committed.length
      handlers.onKeyDown(keyEvent('v', true))
      expect(deps.committed.length).toBeGreaterThan(commitsBefore)
    })
  })
})

describe('selectionTool drag-to-move', () => {
  it('second drag should start from new position, not snap back', () => {
    const deps = makeDeps()
    const handlers = createSelectionHandlers(deps)
    selectRegion(handlers) // select (0,0)-(1,1) with A,B,C,D

    // First drag: move selection down by 2 rows
    handlers.onMouseDown(0, 0) // inside selection → dragging
    handlers.onMouseMove(2, 0) // delta = (2,0)
    handlers.onMouseUp()

    // Second drag: move selection right by 2 cols from its NEW position
    handlers.onMouseDown(2, 0) // inside new position → dragging
    handlers.onMouseMove(2, 2) // delta = (0,2) from drag start
    handlers.onMouseUp()

    // The grid should have A,B,C,D at (2,2)-(3,3), NOT snapped back to row 0
    const grid = deps.getActiveGrid()
    expect(grid[2][2].char).toBe('A')
    expect(grid[2][3].char).toBe('B')
    expect(grid[3][2].char).toBe('C')
    expect(grid[3][3].char).toBe('D')

    // Original position should be cleared
    expect(grid[0][0].char).toBe(DEFAULT_CELL.char)
    expect(grid[0][1].char).toBe(DEFAULT_CELL.char)
  })
})

describe('selectionTool flipHorizontal', () => {
  it('should commit flipped cells immediately when selected', () => {
    const deps = makeDeps()
    const handlers = createSelectionHandlers(deps)
    selectRegion(handlers)

    handlers.flipHorizontal()

    // Flip commits immediately (like eraseSelection)
    expect(deps.snapshots).toBe(1)
    expect(deps.committed.length).toBe(1)
    const committed = deps.committed[0]
    // (0,0) had 'A', (0,1) had 'B' — after flip they swap
    expect(committed.get('0,0')!.char).toBe('B')
    expect(committed.get('0,1')!.char).toBe('A')
  })

  it('should be a no-op when idle', () => {
    const deps = makeDeps()
    const handlers = createSelectionHandlers(deps)
    // Don't select — still idle

    handlers.flipHorizontal()

    expect(deps.snapshots).toBe(0)
    expect(deps.committed.length).toBe(0)
  })

  it('double flip restores original', () => {
    const deps = makeDeps()
    const handlers = createSelectionHandlers(deps)
    selectRegion(handlers)

    handlers.flipHorizontal()
    const afterFirst = deps.committed[0]

    handlers.flipHorizontal()
    const afterSecond = deps.committed[1]

    // First flip swaps A↔B, second flip restores
    expect(afterFirst.get('0,0')!.char).toBe('B')
    expect(afterSecond.get('0,0')!.char).toBe('A')
  })

  it('should commit flipped cells at selection position, not top-left', () => {
    // Use a grid with content at rows 2-3, cols 3-4 (non-zero origin)
    const grid = Array.from({ length: ANSI_ROWS }, () =>
      Array.from({ length: ANSI_COLS }, (): AnsiCell => ({
        ...DEFAULT_CELL, fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor,
      }))
    )
    grid[2][3] = makeCell('L')
    grid[2][4] = makeCell('R')
    grid[3][3] = makeCell('X')
    grid[3][4] = makeCell('Y')

    const deps = makeDeps(grid)
    const handlers = createSelectionHandlers(deps)

    // Select region at (2,3)-(3,4)
    handlers.onMouseDown(2, 3)
    handlers.onMouseMove(3, 4)
    handlers.onMouseUp()

    handlers.flipHorizontal()

    const committed = deps.committed[0]
    // Flipped cells must remain at columns 3-4
    expect(committed.has('2,3')).toBe(true)
    expect(committed.has('2,4')).toBe(true)
    expect(committed.get('2,3')!.char).toBe('R') // was at col 4, now at col 3
    expect(committed.get('2,4')!.char).toBe('L') // was at col 3, now at col 4
    // Verify NO cells were written to (0,0)
    expect(committed.has('0,0')).toBe(false)
  })

  it('should commit flipped cells for pasted content at paste position', () => {
    const deps = makeDeps()
    const handlers = createSelectionHandlers(deps)
    selectRegion(handlers)

    // Copy then paste (floating at 0,0)
    handlers.onKeyDown(keyEvent('c', true))
    handlers.onKeyDown(keyEvent('v', true))

    handlers.flipHorizontal()

    const committed = deps.committed[0]
    // Pasted at (0,0)-(1,1), flip should swap columns
    expect(committed.get('0,0')!.char).toBe('B')
    expect(committed.get('0,1')!.char).toBe('A')
  })

  it('selection remains active after flip for further operations', () => {
    const deps = makeDeps()
    const handlers = createSelectionHandlers(deps)
    selectRegion(handlers)

    handlers.flipHorizontal()

    // Should still be in selected phase — another flip should work
    handlers.flipHorizontal()
    expect(deps.snapshots).toBe(2)
    expect(deps.committed.length).toBe(2)
  })
})
