import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start with no toasts', () => {
    // Arrange & Act
    const { result } = renderHook(() => useToast())

    // Assert
    expect(result.current.toasts).toEqual([])
  })

  it('should add a toast when showToast is called', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    // Act
    act(() => {
      result.current.showToast({ message: 'Test message', type: 'error' })
    })

    // Assert
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Test message')
    expect(result.current.toasts[0].type).toBe('error')
  })

  it('should assign unique ids to toasts', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    // Act
    act(() => {
      result.current.showToast({ message: 'First', type: 'error' })
      result.current.showToast({ message: 'Second', type: 'error' })
    })

    // Assert
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id)
  })

  it('should remove toast when dismissToast is called', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast({ message: 'Test', type: 'error' })
    })

    const toastId = result.current.toasts[0].id

    // Act
    act(() => {
      result.current.dismissToast(toastId)
    })

    // Assert
    expect(result.current.toasts).toHaveLength(0)
  })

  it('should auto-dismiss toast after timeout', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast({ message: 'Test', type: 'error' })
    })

    expect(result.current.toasts).toHaveLength(1)

    // Act - advance time by 5 seconds (default timeout)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Assert
    expect(result.current.toasts).toHaveLength(0)
  })

  it('should respect custom duration', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast({ message: 'Test', type: 'error', duration: 2000 })
    })

    // Should still be there at 1.9 seconds
    act(() => {
      vi.advanceTimersByTime(1900)
    })
    expect(result.current.toasts).toHaveLength(1)

    // Should be gone at 2 seconds
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('should support info type toasts', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    // Act
    act(() => {
      result.current.showToast({ message: 'Info message', type: 'info' })
    })

    // Assert
    expect(result.current.toasts[0].type).toBe('info')
  })

  it('should support success type toasts', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    // Act
    act(() => {
      result.current.showToast({ message: 'Success message', type: 'success' })
    })

    // Assert
    expect(result.current.toasts[0].type).toBe('success')
  })

  it('should handle multiple toasts', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    // Act
    act(() => {
      result.current.showToast({ message: 'First', type: 'error' })
      result.current.showToast({ message: 'Second', type: 'info' })
      result.current.showToast({ message: 'Third', type: 'success' })
    })

    // Assert
    expect(result.current.toasts).toHaveLength(3)
    expect(result.current.toasts.map(t => t.message)).toEqual(['First', 'Second', 'Third'])
  })

  it('should clear specific toast while keeping others', () => {
    // Arrange
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast({ message: 'First', type: 'error' })
      result.current.showToast({ message: 'Second', type: 'error' })
    })

    const firstId = result.current.toasts[0].id

    // Act
    act(() => {
      result.current.dismissToast(firstId)
    })

    // Assert
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Second')
  })

  it('should clear all timers on unmount', () => {
    // Arrange
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { result, unmount } = renderHook(() => useToast())

    act(() => {
      result.current.showToast({ message: 'First', type: 'error', duration: 10000 })
      result.current.showToast({ message: 'Second', type: 'error', duration: 10000 })
    })

    expect(result.current.toasts).toHaveLength(2)
    clearTimeoutSpy.mockClear() // Reset to only count cleanup calls

    // Act - unmount the hook
    unmount()

    // Assert - should have cleared both timers
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2)

    clearTimeoutSpy.mockRestore()
  })
})
