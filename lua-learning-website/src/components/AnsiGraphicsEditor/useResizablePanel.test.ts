import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResizablePanel } from './useResizablePanel'

const STORAGE_KEY = 'ansi-layers-panel-width'

describe('useResizablePanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to 270 when localStorage is empty', () => {
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.width).toBe(270)
  })

  it('loads saved width from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '400')
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.width).toBe(400)
  })

  it('clamps below-min to 270', () => {
    localStorage.setItem(STORAGE_KEY, '100')
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.width).toBe(270)
  })

  it('clamps above-max to 800', () => {
    localStorage.setItem(STORAGE_KEY, '1200')
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.width).toBe(800)
  })

  it('ignores NaN localStorage values', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-number')
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.width).toBe(270)
  })

  it('ignores invalid localStorage values (empty string)', () => {
    localStorage.setItem(STORAGE_KEY, '')
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.width).toBe(270)
  })

  it('isResizing is false initially', () => {
    const { result } = renderHook(() => useResizablePanel())
    expect(result.current.isResizing).toBe(false)
  })

  it('mouse drag sequence updates width correctly', () => {
    const { result } = renderHook(() => useResizablePanel())

    // Start drag at x=500 with default width 270
    act(() => {
      result.current.handleMouseDown({ clientX: 500, preventDefault: vi.fn() } as unknown as React.MouseEvent)
    })
    expect(result.current.isResizing).toBe(true)

    // Drag left by 100px (left = wider since panel is on right side)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }))
    })
    expect(result.current.width).toBe(370) // 270 + 100

    // Release mouse
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(result.current.isResizing).toBe(false)

    // Check persisted to localStorage
    expect(localStorage.getItem(STORAGE_KEY)).toBe('370')
  })

  it('clamps drag result to min/max', () => {
    localStorage.setItem(STORAGE_KEY, '400')
    const { result } = renderHook(() => useResizablePanel())

    // Start drag
    act(() => {
      result.current.handleMouseDown({ clientX: 300, preventDefault: vi.fn() } as unknown as React.MouseEvent)
    })

    // Drag right (narrower) by 500px — would be -100, clamped to 270
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800 }))
    })
    expect(result.current.width).toBe(270)
  })
})
