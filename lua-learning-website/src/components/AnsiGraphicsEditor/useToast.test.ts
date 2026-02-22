import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, TOAST_DURATION_MS, MAX_TOASTS } from './useToast'

describe('useToast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('should start with an empty toasts array', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toEqual([])
  })

  it('should add a toast when showToast is called', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Pencil'))
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Pencil')
  })

  it('should assign unique ids to each toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('Pencil')
      result.current.showToast('Undo')
    })
    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id)
  })

  it('should auto-dismiss a toast after TOAST_DURATION_MS', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Undo'))
    expect(result.current.toasts).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(TOAST_DURATION_MS) })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('should not dismiss before TOAST_DURATION_MS', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('Undo'))

    act(() => { vi.advanceTimersByTime(TOAST_DURATION_MS - 1) })
    expect(result.current.toasts).toHaveLength(1)
  })

  it('should limit concurrent toasts to MAX_TOASTS', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      for (let i = 0; i < MAX_TOASTS + 2; i++) {
        result.current.showToast(`Toast ${i}`)
      }
    })
    expect(result.current.toasts).toHaveLength(MAX_TOASTS)
  })

  it('should keep the most recent toasts when exceeding MAX_TOASTS', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('First')
      result.current.showToast('Second')
      result.current.showToast('Third')
      result.current.showToast('Fourth')
    })
    const messages = result.current.toasts.map(t => t.message)
    expect(messages).toEqual(['Second', 'Third', 'Fourth'])
  })

  it('should have a stable showToast reference across renders', () => {
    const { result, rerender } = renderHook(() => useToast())
    const first = result.current.showToast
    rerender()
    expect(result.current.showToast).toBe(first)
  })

  it('should clear pending timers on unmount', () => {
    const { result, unmount } = renderHook(() => useToast())
    act(() => result.current.showToast('Undo'))
    expect(result.current.toasts).toHaveLength(1)
    // Spy on clearTimeout before unmount
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    unmount()
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
    clearTimeoutSpy.mockRestore()
  })

  it('should not fire setState after unmount', () => {
    const { result, unmount } = renderHook(() => useToast())
    act(() => result.current.showToast('Toast 1'))
    act(() => result.current.showToast('Toast 2'))
    unmount()
    // Advancing timers after unmount should not throw or fire
    act(() => { vi.advanceTimersByTime(TOAST_DURATION_MS) })
  })

  it('should dismiss only the specific toast after its timeout', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showToast('First'))
    act(() => { vi.advanceTimersByTime(500) })
    act(() => result.current.showToast('Second'))

    // First toast should dismiss at TOAST_DURATION_MS from its creation
    act(() => { vi.advanceTimersByTime(TOAST_DURATION_MS - 500) })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Second')

    // Second toast dismisses after its own timeout
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.toasts).toHaveLength(0)
  })
})
