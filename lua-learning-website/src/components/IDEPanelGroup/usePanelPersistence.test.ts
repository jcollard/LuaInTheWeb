import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { usePanelPersistence } from './usePanelPersistence'

describe('usePanelPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  describe('saving to localStorage', () => {
    it('should save layout to localStorage', () => {
      // Arrange
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-layout' })
      )

      // Act
      act(() => {
        result.current.saveLayout([30, 70])
      })

      // Advance timers to flush debounce
      act(() => {
        vi.advanceTimersByTime(150)
      })

      // Assert
      const saved = localStorage.getItem('ide-panel:test-layout')
      expect(saved).toBe(JSON.stringify([30, 70]))
    })

    it('should not save if persistId is not provided', () => {
      // Arrange
      const { result } = renderHook(() => usePanelPersistence())

      // Act
      act(() => {
        result.current.saveLayout([30, 70])
      })

      act(() => {
        vi.advanceTimersByTime(150)
      })

      // Assert
      expect(localStorage.length).toBe(0)
    })
  })

  describe('debouncing', () => {
    it('should debounce saves with 100ms delay', () => {
      // Arrange
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-debounce' })
      )

      // Act - multiple rapid saves
      act(() => {
        result.current.saveLayout([10, 90])
        result.current.saveLayout([20, 80])
        result.current.saveLayout([30, 70])
      })

      // Assert - nothing saved yet (within debounce window)
      expect(localStorage.getItem('ide-panel:test-debounce')).toBeNull()

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(150)
      })

      // Assert - only final value saved
      const saved = localStorage.getItem('ide-panel:test-debounce')
      expect(saved).toBe(JSON.stringify([30, 70]))
    })

    it('should reset debounce timer on each save', () => {
      // Arrange
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-reset' })
      )

      // Act - save and advance partway
      act(() => {
        result.current.saveLayout([10, 90])
      })

      act(() => {
        vi.advanceTimersByTime(50)
      })

      // Another save resets the timer
      act(() => {
        result.current.saveLayout([20, 80])
      })

      act(() => {
        vi.advanceTimersByTime(50)
      })

      // Assert - still not saved (timer was reset)
      expect(localStorage.getItem('ide-panel:test-reset')).toBeNull()

      // Advance past debounce from last save
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Now it should be saved
      expect(localStorage.getItem('ide-panel:test-reset')).toBe(
        JSON.stringify([20, 80])
      )
    })
  })

  describe('loading from localStorage', () => {
    it('should load saved layout on mount', () => {
      // Arrange
      localStorage.setItem('ide-panel:test-load', JSON.stringify([25, 75]))

      // Act
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-load' })
      )

      // Assert
      expect(result.current.savedLayout).toEqual([25, 75])
    })

    it('should return null if no saved layout exists', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'nonexistent' })
      )

      // Assert
      expect(result.current.savedLayout).toBeNull()
    })
  })

  describe('corrupted data handling', () => {
    it('should return null for corrupted JSON', () => {
      // Arrange
      localStorage.setItem('ide-panel:test-corrupt', 'not-valid-json{{{')

      // Act
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-corrupt' })
      )

      // Assert
      expect(result.current.savedLayout).toBeNull()
    })

    it('should return null for non-array data', () => {
      // Arrange
      localStorage.setItem('ide-panel:test-invalid', JSON.stringify({ foo: 'bar' }))

      // Act
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-invalid' })
      )

      // Assert
      expect(result.current.savedLayout).toBeNull()
    })

    it('should return null for array with non-numbers', () => {
      // Arrange
      localStorage.setItem(
        'ide-panel:test-bad-values',
        JSON.stringify(['a', 'b'])
      )

      // Act
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-bad-values' })
      )

      // Assert
      expect(result.current.savedLayout).toBeNull()
    })

    it('should return null for array with mixed number and non-number values', () => {
      // Arrange - array with some numbers but not all
      localStorage.setItem(
        'ide-panel:test-mixed',
        JSON.stringify([30, 'invalid', 70])
      )

      // Act
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-mixed' })
      )

      // Assert - should reject because not ALL items are numbers
      expect(result.current.savedLayout).toBeNull()
    })
  })

  describe('reset', () => {
    it('should clear saved layout from localStorage', () => {
      // Arrange
      localStorage.setItem('ide-panel:test-reset-clear', JSON.stringify([40, 60]))
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-reset-clear' })
      )

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(localStorage.getItem('ide-panel:test-reset-clear')).toBeNull()
    })

    it('should update savedLayout to null after reset', () => {
      // Arrange
      localStorage.setItem('ide-panel:test-reset-state', JSON.stringify([40, 60]))
      const { result } = renderHook(() =>
        usePanelPersistence({ persistId: 'test-reset-state' })
      )

      // Verify initial state
      expect(result.current.savedLayout).toEqual([40, 60])

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.savedLayout).toBeNull()
    })
  })

  describe('no persistId', () => {
    it('should return null savedLayout when no persistId', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePanelPersistence())

      // Assert
      expect(result.current.savedLayout).toBeNull()
    })

    it('should not throw when calling reset without persistId', () => {
      // Arrange
      const { result } = renderHook(() => usePanelPersistence())

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.reset()
        })
      }).not.toThrow()
    })
  })
})
