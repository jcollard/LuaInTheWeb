import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'

function createMockContainer(): HTMLDivElement {
  const container = document.createElement('div')
  // 80 cols × 25 rows → 10px/col, 20px/row
  container.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 500,
    width: 800, height: 500, x: 0, y: 0, toJSON: () => ({}),
  })
  return container
}

function mouseAt(type: string, col: number, row: number): MouseEvent {
  return new MouseEvent(type, {
    clientX: col * 10 + 5,
    clientY: row * 20 + 10,
    bubbles: true,
  })
}

function mouseOutside(type: string): MouseEvent {
  return new MouseEvent(type, {
    clientX: -50, clientY: -50, bubbles: true,
  })
}

describe('rectangle tool', () => {
  describe('rect-outline', () => {
    it('should draw outline rect on mousedown→mousemove→mouseup', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-outline'))

      // Draw rect from (0,0) to (2,3)
      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })
      act(() => { document.dispatchEvent(mouseAt('mouseup', 3, 2)) })

      // Top row: (0,0) to (0,3)
      for (let c = 0; c <= 3; c++) {
        expect(result.current.grid[0][c].char).toBe('#')
      }
      // Bottom row: (2,0) to (2,3)
      for (let c = 0; c <= 3; c++) {
        expect(result.current.grid[2][c].char).toBe('#')
      }
      // Left/right edges of interior row 1
      expect(result.current.grid[1][0].char).toBe('#')
      expect(result.current.grid[1][3].char).toBe('#')
      // Interior should be empty
      expect(result.current.grid[1][1].char).toBe(' ')
      expect(result.current.grid[1][2].char).toBe(' ')
    })
  })

  describe('rect-filled', () => {
    it('should draw filled rect on mousedown→mousemove→mouseup', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-filled'))

      // Draw rect from (0,0) to (2,3)
      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })
      act(() => { document.dispatchEvent(mouseAt('mouseup', 3, 2)) })

      // All cells in bounding box should be filled
      for (let r = 0; r <= 2; r++) {
        for (let c = 0; c <= 3; c++) {
          expect(result.current.grid[r][c].char).toBe('#')
        }
      }
    })
  })

  describe('preview', () => {
    it('should show preview during drag (terminal writes occur)', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      handle.write.mockClear()
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })

      // Preview should have written to terminal
      expect(handle.write).toHaveBeenCalled()
    })

    it('should update preview when mouse moves to new position', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 2, 1)) })
      handle.write.mockClear()
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })

      // New preview should have been written
      expect(handle.write).toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('should cancel rect when mouseup occurs outside canvas', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })
      act(() => { document.dispatchEvent(mouseOutside('mouseup')) })

      // Grid should remain empty
      expect(result.current.grid[0][0].char).toBe(' ')
      expect(result.current.grid[2][3].char).toBe(' ')
    })
  })

  describe('undo', () => {
    it('should revert rect on undo', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })
      act(() => { document.dispatchEvent(mouseAt('mouseup', 3, 2)) })

      // Verify rect was drawn
      expect(result.current.grid[0][0].char).toBe('#')
      expect(result.current.canUndo).toBe(true)

      // Undo
      act(() => result.current.undo())

      // Grid should be back to empty
      expect(result.current.grid[0][0].char).toBe(' ')
      expect(result.current.grid[2][3].char).toBe(' ')
    })
  })

  describe('no-flash commit', () => {
    it('should not flash originals during rect commit', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('rect-filled'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 1, 1)) })

      handle.write.mockClear()
      act(() => { document.dispatchEvent(mouseAt('mouseup', 1, 1)) })

      // All writes during commit should contain '#', never ' '
      const writes = handle.write.mock.calls.map((c: string[]) => c[0])
      for (const w of writes) {
        // Each write positions a cell; committed cells should have '#'
        if (w.includes('\x1b[1;1H') || w.includes('\x1b[1;2H') ||
            w.includes('\x1b[2;1H') || w.includes('\x1b[2;2H')) {
          expect(w).toContain('#')
        }
      }
    })
  })
})
