import { renderHook, act } from '@testing-library/react'
import type { Mock } from 'vitest'
import { useIsMobile } from './useIsMobile'

// Type for our mock matchMedia
type MockMatchMedia = Mock<(query: string) => MediaQueryList>

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia
  let mockMatchMedia: MockMatchMedia
  let mediaQueryListeners: Array<(e: MediaQueryListEvent) => void>

  const createMockMediaQueryList = (matches: boolean, query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          mediaQueryListeners.push(listener as (e: MediaQueryListEvent) => void)
        }
      }
    ),
    removeEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          const index = mediaQueryListeners.indexOf(listener as (e: MediaQueryListEvent) => void)
          if (index > -1) {
            mediaQueryListeners.splice(index, 1)
          }
        }
      }
    ),
    dispatchEvent: vi.fn(() => true),
  })

  beforeEach(() => {
    mediaQueryListeners = []
    mockMatchMedia = vi.fn((query: string) => createMockMediaQueryList(false, query))
    window.matchMedia = mockMatchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('should return false for desktop viewport', () => {
    // Arrange - default mock returns false (desktop)
    mockMatchMedia.mockImplementation((query: string) =>
      createMockMediaQueryList(false, query)
    )

    // Act
    const { result } = renderHook(() => useIsMobile())

    // Assert
    expect(result.current).toBe(false)
  })

  it('should return true for mobile viewport', () => {
    // Arrange
    mockMatchMedia.mockImplementation((query: string) =>
      createMockMediaQueryList(true, query)
    )

    // Act
    const { result } = renderHook(() => useIsMobile())

    // Assert
    expect(result.current).toBe(true)
  })

  it('should use correct media query for mobile detection', () => {
    // Arrange & Act
    renderHook(() => useIsMobile())

    // Assert - should query for max-width: 768px
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('should update when viewport changes to mobile', () => {
    // Arrange
    mockMatchMedia.mockImplementation((query: string) => ({
      ...createMockMediaQueryList(false, query),
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          mediaQueryListeners.push(listener as (e: MediaQueryListEvent) => void)
        }
      },
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Act - simulate viewport change to mobile
    act(() => {
      mediaQueryListeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    // Assert
    expect(result.current).toBe(true)
  })

  it('should update when viewport changes to desktop', () => {
    // Arrange
    mockMatchMedia.mockImplementation((query: string) => ({
      ...createMockMediaQueryList(true, query),
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          mediaQueryListeners.push(listener as (e: MediaQueryListEvent) => void)
        }
      },
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    // Act - simulate viewport change to desktop
    act(() => {
      mediaQueryListeners.forEach((listener) => {
        listener({ matches: false } as MediaQueryListEvent)
      })
    })

    // Assert
    expect(result.current).toBe(false)
  })

  it('should cleanup event listener on unmount', () => {
    // Arrange
    const removeEventListener = vi.fn()
    mockMatchMedia.mockImplementation((query: string) => ({
      ...createMockMediaQueryList(false, query),
      removeEventListener,
    }))

    // Act
    const { unmount } = renderHook(() => useIsMobile())
    unmount()

    // Assert
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should accept custom breakpoint', () => {
    // Arrange & Act
    renderHook(() => useIsMobile(1024))

    // Assert
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 1024px)')
  })
})
