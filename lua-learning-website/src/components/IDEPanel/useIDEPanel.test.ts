import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useIDEPanel } from './useIDEPanel'

describe('useIDEPanel', () => {
  describe('initial state', () => {
    it('should default to not collapsed', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDEPanel())

      // Assert
      expect(result.current.isCollapsed).toBe(false)
    })

    it('should respect defaultCollapsed option', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useIDEPanel({ defaultCollapsed: true })
      )

      // Assert
      expect(result.current.isCollapsed).toBe(true)
    })

    it('should use controlled collapsed prop over defaultCollapsed', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useIDEPanel({ defaultCollapsed: true, collapsed: false })
      )

      // Assert
      expect(result.current.isCollapsed).toBe(false)
    })
  })

  describe('toggle', () => {
    it('should toggle collapsed state from false to true', () => {
      // Arrange
      const { result } = renderHook(() => useIDEPanel())

      // Act
      act(() => {
        result.current.toggle()
      })

      // Assert
      expect(result.current.isCollapsed).toBe(true)
    })

    it('should toggle collapsed state from true to false', () => {
      // Arrange
      const { result } = renderHook(() =>
        useIDEPanel({ defaultCollapsed: true })
      )

      // Act
      act(() => {
        result.current.toggle()
      })

      // Assert
      expect(result.current.isCollapsed).toBe(false)
    })

    it('should call onCollapse callback when toggling', () => {
      // Arrange
      const onCollapse = vi.fn()
      const { result } = renderHook(() => useIDEPanel({ onCollapse }))

      // Act
      act(() => {
        result.current.toggle()
      })

      // Assert
      expect(onCollapse).toHaveBeenCalledWith(true)
    })
  })

  describe('expand', () => {
    it('should expand the panel', () => {
      // Arrange
      const { result } = renderHook(() =>
        useIDEPanel({ defaultCollapsed: true })
      )

      // Act
      act(() => {
        result.current.expand()
      })

      // Assert
      expect(result.current.isCollapsed).toBe(false)
    })

    it('should call onCollapse with false when expanding', () => {
      // Arrange
      const onCollapse = vi.fn()
      const { result } = renderHook(() =>
        useIDEPanel({ defaultCollapsed: true, onCollapse })
      )

      // Act
      act(() => {
        result.current.expand()
      })

      // Assert
      expect(onCollapse).toHaveBeenCalledWith(false)
    })

    it('should not call onCollapse if already expanded', () => {
      // Arrange
      const onCollapse = vi.fn()
      const { result } = renderHook(() => useIDEPanel({ onCollapse }))

      // Act
      act(() => {
        result.current.expand()
      })

      // Assert
      expect(onCollapse).not.toHaveBeenCalled()
    })
  })

  describe('collapse', () => {
    it('should collapse the panel', () => {
      // Arrange
      const { result } = renderHook(() => useIDEPanel())

      // Act
      act(() => {
        result.current.collapse()
      })

      // Assert
      expect(result.current.isCollapsed).toBe(true)
    })

    it('should call onCollapse with true when collapsing', () => {
      // Arrange
      const onCollapse = vi.fn()
      const { result } = renderHook(() => useIDEPanel({ onCollapse }))

      // Act
      act(() => {
        result.current.collapse()
      })

      // Assert
      expect(onCollapse).toHaveBeenCalledWith(true)
    })

    it('should not call onCollapse if already collapsed', () => {
      // Arrange
      const onCollapse = vi.fn()
      const { result } = renderHook(() =>
        useIDEPanel({ defaultCollapsed: true, onCollapse })
      )

      // Act
      act(() => {
        result.current.collapse()
      })

      // Assert
      expect(onCollapse).not.toHaveBeenCalled()
    })
  })

  describe('controlled mode', () => {
    it('should sync with controlled collapsed prop', () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ collapsed }) => useIDEPanel({ collapsed }),
        { initialProps: { collapsed: false } }
      )

      // Assert initial state
      expect(result.current.isCollapsed).toBe(false)

      // Act - update controlled prop
      rerender({ collapsed: true })

      // Assert - should reflect controlled value
      expect(result.current.isCollapsed).toBe(true)
    })

    it('should call onCollapse but not update internal state in controlled mode', () => {
      // Arrange
      const onCollapse = vi.fn()
      const { result } = renderHook(() =>
        useIDEPanel({ collapsed: false, onCollapse })
      )

      // Act
      act(() => {
        result.current.toggle()
      })

      // Assert - callback called but state unchanged (controlled by parent)
      expect(onCollapse).toHaveBeenCalledWith(true)
      expect(result.current.isCollapsed).toBe(false) // Still follows controlled prop
    })
  })
})
