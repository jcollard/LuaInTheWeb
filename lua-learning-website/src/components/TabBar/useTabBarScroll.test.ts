import { renderHook, act } from '@testing-library/react'
import { useTabBarScroll } from './useTabBarScroll'

describe('useTabBarScroll', () => {
  // Mock element for ref with mutable properties
  interface MockElementState {
    scrollWidth: number
    clientWidth: number
    scrollLeft: number
  }

  const createMockElement = (
    scrollWidth: number,
    clientWidth: number,
    scrollLeft = 0
  ): HTMLDivElement & { _state: MockElementState } => {
    const state: MockElementState = {
      scrollWidth,
      clientWidth,
      scrollLeft,
    }

    const element = {
      _state: state,
      get scrollWidth() {
        return state.scrollWidth
      },
      get clientWidth() {
        return state.clientWidth
      },
      get scrollLeft() {
        return state.scrollLeft
      },
      set scrollLeft(value: number) {
        state.scrollLeft = value
      },
      scrollTo: vi.fn((options: { left: number; behavior: string }) => {
        state.scrollLeft = options.left
      }),
    } as unknown as HTMLDivElement & { _state: MockElementState }
    return element
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('overflow detection', () => {
    it('should detect no overflow when content fits', () => {
      // Arrange
      const mockElement = createMockElement(500, 500)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert
      expect(result.current.canScrollLeft).toBe(false)
      expect(result.current.canScrollRight).toBe(false)
    })

    it('should detect overflow when content is wider than container', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 0)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert
      expect(result.current.canScrollLeft).toBe(false)
      expect(result.current.canScrollRight).toBe(true)
    })

    it('should detect can scroll left when scrolled right', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 100)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert
      expect(result.current.canScrollLeft).toBe(true)
      expect(result.current.canScrollRight).toBe(true)
    })

    it('should detect cannot scroll right when scrolled to end', () => {
      // Arrange - scrolled to the end (scrollWidth - clientWidth = maxScrollLeft)
      const mockElement = createMockElement(800, 500, 300)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert
      expect(result.current.canScrollLeft).toBe(true)
      expect(result.current.canScrollRight).toBe(false)
    })
  })

  describe('scroll functions', () => {
    it('should scroll right by a fixed amount', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 0)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Act
      act(() => {
        result.current.scrollRight()
      })

      // Assert
      expect(mockElement.scrollTo).toHaveBeenCalledWith({
        left: 150,
        behavior: 'smooth',
      })
    })

    it('should scroll left by a fixed amount', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 200)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Act
      act(() => {
        result.current.scrollLeft()
      })

      // Assert
      expect(mockElement.scrollTo).toHaveBeenCalledWith({
        left: 50,
        behavior: 'smooth',
      })
    })

    it('should not scroll left below zero', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 50)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Act
      act(() => {
        result.current.scrollLeft()
      })

      // Assert
      expect(mockElement.scrollTo).toHaveBeenCalledWith({
        left: 0,
        behavior: 'smooth',
      })
    })

    it('should not scroll right beyond max scroll', () => {
      // Arrange - at scrollLeft 250, maxScroll is 300
      const mockElement = createMockElement(800, 500, 250)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Act
      act(() => {
        result.current.scrollRight()
      })

      // Assert - should clamp to 300 (maxScroll)
      expect(mockElement.scrollTo).toHaveBeenCalledWith({
        left: 300,
        behavior: 'smooth',
      })
    })

    it('should do nothing when scrollRight called without container', () => {
      // Arrange
      const { result } = renderHook(() => useTabBarScroll())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.scrollRight()
        })
      }).not.toThrow()
    })

    it('should do nothing when scrollLeft called without container', () => {
      // Arrange
      const { result } = renderHook(() => useTabBarScroll())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.scrollLeft()
        })
      }).not.toThrow()
    })
  })

  describe('scroll event handling', () => {
    it('should update scroll state on scroll event', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 0)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })
      expect(result.current.canScrollLeft).toBe(false)

      // Act - simulate scroll
      act(() => {
        mockElement.scrollLeft = 100
        result.current.handleScroll()
      })

      // Assert
      expect(result.current.canScrollLeft).toBe(true)
    })
  })

  describe('hasOverflow', () => {
    it('should return true when content overflows', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 0)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert
      expect(result.current.hasOverflow).toBe(true)
    })

    it('should return false when content fits', () => {
      // Arrange
      const mockElement = createMockElement(500, 500, 0)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert
      expect(result.current.hasOverflow).toBe(false)
    })
  })

  describe('checkOverflow', () => {
    it('should recalculate overflow state when called', () => {
      // Arrange
      const mockElement = createMockElement(500, 500, 0)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })
      expect(result.current.hasOverflow).toBe(false)

      // Act - simulate content change
      act(() => {
        mockElement._state.scrollWidth = 800
        result.current.checkOverflow()
      })

      // Assert
      expect(result.current.hasOverflow).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle setting container ref to null', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 100)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })
      expect(result.current.canScrollLeft).toBe(true)

      // Act - set to null
      act(() => {
        result.current.setContainerRef(null)
      })

      // Assert
      expect(result.current.canScrollLeft).toBe(false)
      expect(result.current.canScrollRight).toBe(false)
      expect(result.current.hasOverflow).toBe(false)
    })

    it('should handle exact boundary for scrollLeft at 0', () => {
      // Arrange
      const mockElement = createMockElement(800, 500, 0)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert - exact boundary: scrollLeft === 0 means canScrollLeft is false
      expect(result.current.canScrollLeft).toBe(false)
    })

    it('should handle exact boundary for maxScroll', () => {
      // Arrange - scrollWidth 800, clientWidth 500, maxScroll = 300
      // scrollLeft exactly at maxScroll
      const mockElement = createMockElement(800, 500, 300)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert - exact boundary: scrollLeft >= maxScroll means canScrollRight is false
      expect(result.current.canScrollRight).toBe(false)
    })

    it('should handle scrollLeft just below maxScroll', () => {
      // Arrange - maxScroll = 300, scrollLeft = 299
      const mockElement = createMockElement(800, 500, 299)

      // Act
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Assert - still can scroll right
      expect(result.current.canScrollRight).toBe(true)
    })

    it('should clamp scrollLeft to 0 when scrolling left would go negative', () => {
      // Arrange - scrollLeft at 100, scroll amount is 150
      const mockElement = createMockElement(800, 500, 100)
      const { result } = renderHook(() => useTabBarScroll())
      act(() => {
        result.current.setContainerRef(mockElement)
      })

      // Act - scroll left would go to -50, but should clamp to 0
      act(() => {
        result.current.scrollLeft()
      })

      // Assert
      expect(mockElement.scrollTo).toHaveBeenCalledWith({
        left: 0,
        behavior: 'smooth',
      })
    })

    it('should handle handleScroll when container is null', () => {
      // Arrange
      const { result } = renderHook(() => useTabBarScroll())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.handleScroll()
        })
      }).not.toThrow()
    })

    it('should handle checkOverflow when container is null', () => {
      // Arrange
      const { result } = renderHook(() => useTabBarScroll())

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.checkOverflow()
        })
      }).not.toThrow()
    })
  })
})
