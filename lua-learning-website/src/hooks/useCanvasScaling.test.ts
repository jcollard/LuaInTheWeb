import { renderHook, act } from '@testing-library/react'
import { useCanvasScaling } from './useCanvasScaling'

const STORAGE_KEY = 'canvas-scaling:mode'

describe('useCanvasScaling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('default behavior', () => {
    it('should default to "fit" mode when no saved preference exists', () => {
      // Arrange & Act
      const { result } = renderHook(() => useCanvasScaling())

      // Assert
      expect(result.current.scalingMode).toBe('fit')
    })

    it('should return a setScalingMode function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useCanvasScaling())

      // Assert
      expect(typeof result.current.setScalingMode).toBe('function')
    })
  })

  describe('changing scaling mode', () => {
    it('should update scalingMode when setScalingMode is called with "native"', () => {
      // Arrange
      const { result } = renderHook(() => useCanvasScaling())

      // Act
      act(() => {
        result.current.setScalingMode('native')
      })

      // Assert
      expect(result.current.scalingMode).toBe('native')
    })

    it('should update scalingMode when setScalingMode is called with "fit"', () => {
      // Arrange
      const { result } = renderHook(() => useCanvasScaling())

      // Pre-condition: set to native first
      act(() => {
        result.current.setScalingMode('native')
      })

      // Act
      act(() => {
        result.current.setScalingMode('fit')
      })

      // Assert
      expect(result.current.scalingMode).toBe('fit')
    })
  })

  describe('localStorage persistence', () => {
    it('should save mode to localStorage when changed', () => {
      // Arrange
      const { result } = renderHook(() => useCanvasScaling())

      // Act
      act(() => {
        result.current.setScalingMode('native')
      })

      // Assert
      expect(localStorage.getItem(STORAGE_KEY)).toBe('native')
    })

    it('should save "fit" mode to localStorage when changed', () => {
      // Arrange
      const { result } = renderHook(() => useCanvasScaling())

      // Pre-condition: set to native first
      act(() => {
        result.current.setScalingMode('native')
      })

      // Act
      act(() => {
        result.current.setScalingMode('fit')
      })

      // Assert - verify 'fit' is explicitly saved (not just default)
      expect(localStorage.getItem(STORAGE_KEY)).toBe('fit')
    })

    it('should load saved mode from localStorage on mount', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'native')

      // Act
      const { result } = renderHook(() => useCanvasScaling())

      // Assert
      expect(result.current.scalingMode).toBe('native')
    })

    it('should load "fit" mode from localStorage when saved', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'fit')

      // Act
      const { result } = renderHook(() => useCanvasScaling())

      // Assert
      expect(result.current.scalingMode).toBe('fit')
    })

    it('should recognize "fit" as a distinct valid mode separate from default', () => {
      // Arrange - start with native saved in localStorage
      localStorage.setItem(STORAGE_KEY, 'native')
      const { result, rerender } = renderHook(() => useCanvasScaling())

      // Verify starts as native
      expect(result.current.scalingMode).toBe('native')

      // Act - change to fit and verify it persists
      act(() => {
        result.current.setScalingMode('fit')
      })

      // Verify localStorage was updated to 'fit'
      expect(localStorage.getItem(STORAGE_KEY)).toBe('fit')

      // Re-render hook and verify it loads 'fit' from storage
      rerender()
      expect(result.current.scalingMode).toBe('fit')
    })
  })

  describe('corrupted data handling', () => {
    it('should default to "fit" when localStorage contains invalid value', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'invalid-mode')

      // Act
      const { result } = renderHook(() => useCanvasScaling())

      // Assert
      expect(result.current.scalingMode).toBe('fit')
    })

    it('should default to "fit" when localStorage contains empty string', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, '')

      // Act
      const { result } = renderHook(() => useCanvasScaling())

      // Assert
      expect(result.current.scalingMode).toBe('fit')
    })
  })

  describe('type safety', () => {
    it('should only accept valid CanvasScalingMode values', () => {
      // Arrange
      const { result } = renderHook(() => useCanvasScaling())

      // Act - setting valid modes should work
      act(() => {
        result.current.setScalingMode('fit')
      })
      expect(result.current.scalingMode).toBe('fit')

      act(() => {
        result.current.setScalingMode('native')
      })
      expect(result.current.scalingMode).toBe('native')
    })
  })
})
