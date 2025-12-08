import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useEditorPanel } from './useEditorPanel'

describe('useEditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cursor position tracking', () => {
    it('should initialize cursor position to line 1, column 1', () => {
      // Arrange & Act
      const { result } = renderHook(() => useEditorPanel())

      // Assert
      expect(result.current.cursorLine).toBe(1)
      expect(result.current.cursorColumn).toBe(1)
    })

    it('should update cursor position when handleCursorChange is called', () => {
      // Arrange
      const { result } = renderHook(() => useEditorPanel())

      // Act
      act(() => {
        result.current.handleCursorChange(10, 5)
      })

      // Assert
      expect(result.current.cursorLine).toBe(10)
      expect(result.current.cursorColumn).toBe(5)
    })

    it('should call onCursorChange callback when cursor changes', () => {
      // Arrange
      const onCursorChange = vi.fn()
      const { result } = renderHook(() => useEditorPanel({ onCursorChange }))

      // Act
      act(() => {
        result.current.handleCursorChange(20, 15)
      })

      // Assert
      expect(onCursorChange).toHaveBeenCalledWith(20, 15)
    })

    it('should not crash when onCursorChange is not provided', () => {
      // Arrange
      const { result } = renderHook(() => useEditorPanel())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.handleCursorChange(5, 10)
        })
      }).not.toThrow()
    })
  })
})
