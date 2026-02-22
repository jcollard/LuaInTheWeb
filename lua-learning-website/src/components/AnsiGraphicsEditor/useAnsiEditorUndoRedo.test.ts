import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'
import { ANSI_COLS } from './types'

describe('useAnsiEditor undo/redo', () => {
  function createMockContainer(): HTMLDivElement {
    const container = document.createElement('div')
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

  function setupEditor() {
    const { result } = renderHook(() => useAnsiEditor())
    const container = createMockContainer()
    const handle = { write: vi.fn(), container, dispose: vi.fn() }
    act(() => result.current.onTerminalReady(handle))
    return { result, container, handle }
  }

  function paintCell(container: HTMLDivElement, col: number, row: number) {
    act(() => { container.dispatchEvent(mouseAt('mousedown', col, row)) })
    act(() => { document.dispatchEvent(mouseAt('mouseup', col, row)) })
  }

  it('should have canUndo false initially', () => {
    const { result } = renderHook(() => useAnsiEditor())
    expect(result.current.canUndo).toBe(false)
  })

  it('should have canRedo false initially', () => {
    const { result } = renderHook(() => useAnsiEditor())
    expect(result.current.canRedo).toBe(false)
  })

  it('should set canUndo true after painting', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    expect(result.current.canUndo).toBe(true)
  })

  it('should revert grid on undo after painting', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    expect(result.current.grid[0][0].char).toBe('#')
    act(() => result.current.undo())
    expect(result.current.grid[0][0].char).toBe(' ')
  })

  it('should set canRedo true after undo', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)
  })

  it('should set canUndo false after undoing the only action', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    act(() => result.current.undo())
    expect(result.current.canUndo).toBe(false)
  })

  it('should restore grid on redo', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    act(() => result.current.undo())
    expect(result.current.grid[0][0].char).toBe(' ')
    act(() => result.current.redo())
    expect(result.current.grid[0][0].char).toBe('#')
  })

  it('should clear redo stack on new paint after undo', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)
    paintCell(container, 1, 0)
    expect(result.current.canRedo).toBe(false)
  })

  it('should make clearGrid undoable', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    expect(result.current.grid[0][0].char).toBe('#')
    act(() => result.current.clearGrid())
    expect(result.current.grid[0][0].char).toBe(' ')
    act(() => result.current.undo())
    expect(result.current.grid[0][0].char).toBe('#')
  })

  it('should cap history at 50 entries', () => {
    const { result, container } = setupEditor()
    for (let i = 0; i < 51; i++) {
      paintCell(container, i % ANSI_COLS, Math.floor(i / ANSI_COLS))
    }
    let undoCount = 0
    while (result.current.canUndo) {
      act(() => result.current.undo())
      undoCount++
    }
    expect(undoCount).toBe(50)
  })

  it('should do nothing when undo is called with empty stack', () => {
    const { result } = renderHook(() => useAnsiEditor())
    const gridBefore = result.current.grid
    act(() => result.current.undo())
    expect(result.current.grid).toBe(gridBefore)
  })

  it('should do nothing when redo is called with empty stack', () => {
    const { result } = renderHook(() => useAnsiEditor())
    const gridBefore = result.current.grid
    act(() => result.current.redo())
    expect(result.current.grid).toBe(gridBefore)
  })

  it('should support multiple undo steps', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    paintCell(container, 1, 0)
    expect(result.current.grid[0][0].char).toBe('#')
    expect(result.current.grid[0][1].char).toBe('#')

    act(() => result.current.undo())
    expect(result.current.grid[0][0].char).toBe('#')
    expect(result.current.grid[0][1].char).toBe(' ')

    act(() => result.current.undo())
    expect(result.current.grid[0][0].char).toBe(' ')
    expect(result.current.grid[0][1].char).toBe(' ')
  })

  it('should make line tool undoable', () => {
    const { result, container } = setupEditor()
    act(() => result.current.setTool('line'))

    act(() => { container.dispatchEvent(mouseAt('mousedown', 0, 0)) })
    act(() => { container.dispatchEvent(mouseAt('mousemove', 3, 0)) })
    act(() => { document.dispatchEvent(mouseAt('mouseup', 3, 0)) })

    for (let c = 0; c <= 3; c++) {
      expect(result.current.grid[0][c].char).toBe('#')
    }

    act(() => result.current.undo())
    for (let c = 0; c <= 3; c++) {
      expect(result.current.grid[0][c].char).toBe(' ')
    }
  })

  it('should set isDirty true on undo', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    act(() => result.current.markClean())
    expect(result.current.isDirty).toBe(false)
    act(() => result.current.undo())
    expect(result.current.isDirty).toBe(true)
  })

  it('should set isDirty true on redo', () => {
    const { result, container } = setupEditor()
    paintCell(container, 0, 0)
    act(() => result.current.undo())
    act(() => result.current.markClean())
    expect(result.current.isDirty).toBe(false)
    act(() => result.current.redo())
    expect(result.current.isDirty).toBe(true)
  })
})
