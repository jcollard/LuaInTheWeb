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

describe('oval tool', () => {
  describe('oval-outline', () => {
    it('should draw oval outline on mousedown→mousemove→mouseup', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      // Draw oval from (0,0) to (10,20) — large enough to have clear shape
      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 20, 10)) })
      act(() => { document.dispatchEvent(mouseAt('mouseup', 20, 10)) })

      // Center of bounding box should be empty (outline only)
      const centerRow = 5
      const centerCol = 10
      expect(result.current.grid[centerRow][centerCol].char).toBe(' ')

      // Some cells on the bounding box edges should be drawn
      // Top of oval (row 0, near center col) should have a drawn cell
      let hasTopCell = false
      for (let c = 8; c <= 12; c++) {
        if (result.current.grid[0][c].char === '#') hasTopCell = true
      }
      expect(hasTopCell).toBe(true)

      // Bottom of oval (row 10, near center col) should have a drawn cell
      let hasBottomCell = false
      for (let c = 8; c <= 12; c++) {
        if (result.current.grid[10][c].char === '#') hasBottomCell = true
      }
      expect(hasBottomCell).toBe(true)
    })
  })

  describe('oval-filled', () => {
    it('should draw filled oval on mousedown→mousemove→mouseup', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-filled'))

      // Draw oval from (0,0) to (10,20)
      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 20, 10)) })
      act(() => { document.dispatchEvent(mouseAt('mouseup', 20, 10)) })

      // Center should be filled
      expect(result.current.grid[5][10].char).toBe('#')

      // Corners of bounding box should be empty (oval doesn't reach corners)
      expect(result.current.grid[0][0].char).toBe(' ')
      expect(result.current.grid[0][20].char).toBe(' ')
      expect(result.current.grid[10][0].char).toBe(' ')
      expect(result.current.grid[10][20].char).toBe(' ')
    })
  })

  describe('preview', () => {
    it('should show preview during drag (terminal writes occur)', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      handle.write.mockClear()
      act(() => { container.dispatchEvent(mouseAt('mousemove', 10, 5)) })

      expect(handle.write).toHaveBeenCalled()
    })

    it('should update preview when mouse moves to new position', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 5, 3)) })
      handle.write.mockClear()
      act(() => { container.dispatchEvent(mouseAt('mousemove', 10, 5)) })

      expect(handle.write).toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('should cancel oval when mouseup occurs outside canvas', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 10, 5)) })
      act(() => { document.dispatchEvent(mouseOutside('mouseup')) })

      // Grid should remain empty
      expect(result.current.grid[0][5].char).toBe(' ')
      expect(result.current.grid[5][10].char).toBe(' ')
    })
  })

  describe('undo', () => {
    it('should revert oval on undo', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-filled'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 20, 10)) })
      act(() => { document.dispatchEvent(mouseAt('mouseup', 20, 10)) })

      // Verify oval was drawn
      expect(result.current.grid[5][10].char).toBe('#')
      expect(result.current.canUndo).toBe(true)

      act(() => result.current.undo())

      // Grid should be back to empty
      expect(result.current.grid[5][10].char).toBe(' ')
    })
  })

  describe('dimension label', () => {
    it('should show dimensions during oval preview in brush mode', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      const dimEl = document.createElement('div')
      result.current.dimensionRef.current = dimEl
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      // Draw from (0,0) to (2,3) → 4 cols wide, 3 rows tall → 4×6 pixels
      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })

      expect(dimEl.style.display).toBe('block')
      expect(dimEl.textContent).toBe('4×6')
    })

    it('should hide dimension label on commit', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      const dimEl = document.createElement('div')
      result.current.dimensionRef.current = dimEl
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })
      expect(dimEl.style.display).toBe('block')

      act(() => { document.dispatchEvent(mouseAt('mouseup', 3, 2)) })
      expect(dimEl.style.display).toBe('none')
    })

    it('should hide dimension label on cancel', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const container = createMockContainer()
      const handle = { write: vi.fn(), container, dispose: vi.fn() }
      const dimEl = document.createElement('div')
      result.current.dimensionRef.current = dimEl
      act(() => result.current.onTerminalReady(handle))
      act(() => result.current.setTool('oval-outline'))

      act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
      act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 2)) })
      expect(dimEl.style.display).toBe('block')

      act(() => { document.dispatchEvent(mouseOutside('mouseup')) })
      expect(dimEl.style.display).toBe('none')
    })
  })
})
