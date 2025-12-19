import { renderHook, act } from '@testing-library/react'
import { useAutoSave } from './useAutoSave'

describe('useAutoSave', () => {
  const STORAGE_KEY = 'ide-auto-save-enabled'

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should default to disabled when no localStorage value exists', () => {
      // Arrange & Act
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))

      // Assert
      expect(result.current.autoSaveEnabled).toBe(false)
    })

    it('should load enabled state from localStorage', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'true')

      // Act
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))

      // Assert
      expect(result.current.autoSaveEnabled).toBe(true)
    })

    it('should load disabled state from localStorage', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'false')

      // Act
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))

      // Assert
      expect(result.current.autoSaveEnabled).toBe(false)
    })
  })

  describe('toggleAutoSave', () => {
    it('should toggle from disabled to enabled', () => {
      // Arrange
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))
      expect(result.current.autoSaveEnabled).toBe(false)

      // Act
      act(() => {
        result.current.toggleAutoSave()
      })

      // Assert
      expect(result.current.autoSaveEnabled).toBe(true)
    })

    it('should toggle from enabled to disabled', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))
      expect(result.current.autoSaveEnabled).toBe(true)

      // Act
      act(() => {
        result.current.toggleAutoSave()
      })

      // Assert
      expect(result.current.autoSaveEnabled).toBe(false)
    })

    it('should persist enabled state to localStorage', () => {
      // Arrange
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))

      // Act
      act(() => {
        result.current.toggleAutoSave()
      })

      // Assert
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })

    it('should persist disabled state to localStorage', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result } = renderHook(() => useAutoSave({ onAutoSave: vi.fn() }))

      // Act
      act(() => {
        result.current.toggleAutoSave()
      })

      // Assert
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
    })
  })

  describe('debounced auto-save', () => {
    it('should call onAutoSave after delay when enabled and notifyChange is called', () => {
      // Arrange
      const onAutoSave = vi.fn()
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result } = renderHook(() => useAutoSave({ onAutoSave, delay: 1000 }))

      // Act
      act(() => {
        result.current.notifyChange()
      })

      // Assert - should not have been called yet
      expect(onAutoSave).not.toHaveBeenCalled()

      // Advance timers past the delay
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Now it should be called
      expect(onAutoSave).toHaveBeenCalledTimes(1)
    })

    it('should NOT call onAutoSave when disabled', () => {
      // Arrange
      const onAutoSave = vi.fn()
      const { result } = renderHook(() => useAutoSave({ onAutoSave, delay: 1000 }))
      expect(result.current.autoSaveEnabled).toBe(false)

      // Act
      act(() => {
        result.current.notifyChange()
      })
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Assert
      expect(onAutoSave).not.toHaveBeenCalled()
    })

    it('should debounce multiple rapid changes', () => {
      // Arrange
      const onAutoSave = vi.fn()
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result } = renderHook(() => useAutoSave({ onAutoSave, delay: 1000 }))

      // Act - simulate rapid typing
      act(() => {
        result.current.notifyChange()
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      act(() => {
        result.current.notifyChange()
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      act(() => {
        result.current.notifyChange()
      })

      // Assert - not called yet
      expect(onAutoSave).not.toHaveBeenCalled()

      // Advance past delay from last change
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should only be called once
      expect(onAutoSave).toHaveBeenCalledTimes(1)
    })

    it('should use default delay of 1500ms', () => {
      // Arrange
      const onAutoSave = vi.fn()
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result } = renderHook(() => useAutoSave({ onAutoSave }))

      // Act
      act(() => {
        result.current.notifyChange()
      })
      act(() => {
        vi.advanceTimersByTime(1499)
      })

      // Assert - not called yet
      expect(onAutoSave).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })

      // Now it should be called
      expect(onAutoSave).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('should cancel pending auto-save on unmount', () => {
      // Arrange
      const onAutoSave = vi.fn()
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result, unmount } = renderHook(() => useAutoSave({ onAutoSave, delay: 1000 }))

      // Act
      act(() => {
        result.current.notifyChange()
      })
      unmount()
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Assert - should not have been called
      expect(onAutoSave).not.toHaveBeenCalled()
    })
  })

  describe('enable/disable during pending save', () => {
    it('should cancel pending save when auto-save is disabled', () => {
      // Arrange
      const onAutoSave = vi.fn()
      localStorage.setItem(STORAGE_KEY, 'true')
      const { result } = renderHook(() => useAutoSave({ onAutoSave, delay: 1000 }))

      // Act - start a pending save
      act(() => {
        result.current.notifyChange()
      })
      act(() => {
        vi.advanceTimersByTime(500)
      })
      // Disable auto-save
      act(() => {
        result.current.toggleAutoSave()
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Assert - should not have been called
      expect(onAutoSave).not.toHaveBeenCalled()
    })
  })
})
