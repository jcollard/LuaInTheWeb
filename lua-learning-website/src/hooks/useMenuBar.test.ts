import { renderHook, act } from '@testing-library/react'
import { useMenuBar } from './useMenuBar'

describe('useMenuBar', () => {
  describe('initial state', () => {
    it('should have no menu open initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenuBar())

      // Assert
      expect(result.current.openMenuId).toBeNull()
      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('openMenu', () => {
    it('should open a menu by id', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())

      // Act
      act(() => {
        result.current.openMenu('file')
      })

      // Assert
      expect(result.current.openMenuId).toBe('file')
      expect(result.current.isOpen).toBe(true)
    })

    it('should switch to a different menu when another is opened', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())

      // Act
      act(() => {
        result.current.openMenu('file')
      })
      act(() => {
        result.current.openMenu('edit')
      })

      // Assert
      expect(result.current.openMenuId).toBe('edit')
    })
  })

  describe('closeMenu', () => {
    it('should close the open menu', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())
      act(() => {
        result.current.openMenu('file')
      })

      // Act
      act(() => {
        result.current.closeMenu()
      })

      // Assert
      expect(result.current.openMenuId).toBeNull()
      expect(result.current.isOpen).toBe(false)
    })

    it('should be safe to call when no menu is open', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())

      // Act & Assert - should not throw
      act(() => {
        result.current.closeMenu()
      })

      expect(result.current.openMenuId).toBeNull()
    })
  })

  describe('toggleMenu', () => {
    it('should open a closed menu', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())

      // Act
      act(() => {
        result.current.toggleMenu('file')
      })

      // Assert
      expect(result.current.openMenuId).toBe('file')
    })

    it('should close an open menu when toggled again', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())
      act(() => {
        result.current.openMenu('file')
      })

      // Act
      act(() => {
        result.current.toggleMenu('file')
      })

      // Assert
      expect(result.current.openMenuId).toBeNull()
    })

    it('should switch to a different menu when toggled while another is open', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())
      act(() => {
        result.current.openMenu('file')
      })

      // Act
      act(() => {
        result.current.toggleMenu('edit')
      })

      // Assert
      expect(result.current.openMenuId).toBe('edit')
    })
  })

  describe('isMenuOpen', () => {
    it('should return true for the open menu', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())
      act(() => {
        result.current.openMenu('file')
      })

      // Assert
      expect(result.current.isMenuOpen('file')).toBe(true)
      expect(result.current.isMenuOpen('edit')).toBe(false)
    })

    it('should return false when no menu is open', () => {
      // Arrange
      const { result } = renderHook(() => useMenuBar())

      // Assert
      expect(result.current.isMenuOpen('file')).toBe(false)
    })
  })
})
