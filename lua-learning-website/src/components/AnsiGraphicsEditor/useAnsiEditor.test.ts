import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from './types'
import type { RGBColor } from './types'

describe('useAnsiEditor', () => {
  describe('grid initialization', () => {
    it('should create a grid with correct dimensions', () => {
      const { result } = renderHook(() => useAnsiEditor())
      expect(result.current.grid).toHaveLength(ANSI_ROWS)
      expect(result.current.grid[0]).toHaveLength(ANSI_COLS)
    })

    it('should initialize all cells with default values', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const cell = result.current.grid[0][0]
      expect(cell.char).toBe(' ')
      expect(cell.fg).toEqual(DEFAULT_FG)
      expect(cell.bg).toEqual(DEFAULT_BG)
    })

    it('should not be dirty initially', () => {
      const { result } = renderHook(() => useAnsiEditor())
      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('brush state', () => {
    it('should have default brush settings', () => {
      const { result } = renderHook(() => useAnsiEditor())
      expect(result.current.brush.char).toBe('#')
      expect(result.current.brush.fg).toEqual(DEFAULT_FG)
      expect(result.current.brush.bg).toEqual(DEFAULT_BG)
    })

    it('should update foreground color', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const newColor: RGBColor = [255, 0, 0]
      act(() => result.current.setBrushFg(newColor))
      expect(result.current.brush.fg).toEqual(newColor)
    })

    it('should update background color', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const newColor: RGBColor = [0, 0, 255]
      act(() => result.current.setBrushBg(newColor))
      expect(result.current.brush.bg).toEqual(newColor)
    })

    it('should update brush character', () => {
      const { result } = renderHook(() => useAnsiEditor())
      act(() => result.current.setBrushChar('@'))
      expect(result.current.brush.char).toBe('@')
    })

    it('should reject multi-character brush', () => {
      const { result } = renderHook(() => useAnsiEditor())
      act(() => result.current.setBrushChar('AB'))
      // Should remain unchanged since 'AB' has length > 1
      expect(result.current.brush.char).toBe('#')
    })
  })

  describe('clearGrid', () => {
    it('should reset grid to default state', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const mockHandle = { write: vi.fn(), container: document.createElement('div'), dispose: vi.fn() }
      act(() => result.current.onTerminalReady(mockHandle))

      act(() => result.current.clearGrid())
      expect(result.current.isDirty).toBe(false)
      expect(result.current.grid[0][0].char).toBe(' ')
    })

    it('should write clear sequence to terminal when handle exists', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const mockHandle = { write: vi.fn(), container: document.createElement('div'), dispose: vi.fn() }
      act(() => result.current.onTerminalReady(mockHandle))
      act(() => result.current.clearGrid())
      expect(mockHandle.write).toHaveBeenCalled()
    })
  })

  describe('onTerminalReady', () => {
    it('should render full grid when terminal handle is provided', () => {
      const { result } = renderHook(() => useAnsiEditor())
      const mockHandle = { write: vi.fn(), container: document.createElement('div'), dispose: vi.fn() }
      act(() => result.current.onTerminalReady(mockHandle))
      expect(mockHandle.write).toHaveBeenCalled()
      const firstCallArg = mockHandle.write.mock.calls[0][0]
      expect(firstCallArg).toContain('\x1b[2J')
    })

    it('should accept null handle without error', () => {
      const { result } = renderHook(() => useAnsiEditor())
      expect(() => {
        act(() => result.current.onTerminalReady(null))
      }).not.toThrow()
    })
  })

  describe('cursorRef', () => {
    it('should expose a cursorRef for the overlay element', () => {
      const { result } = renderHook(() => useAnsiEditor())
      expect(result.current.cursorRef).toBeDefined()
      expect(result.current.cursorRef.current).toBeNull()
    })
  })
})
