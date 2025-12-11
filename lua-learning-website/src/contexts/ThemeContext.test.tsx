import { render, screen, renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from './ThemeContext'
import { useTheme } from './useTheme'

describe('ThemeContext', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  // Mock matchMedia for system preference detection
  const matchMediaMock = vi.fn((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true,
    })
    // Reset document theme attribute
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ThemeProvider', () => {
    it('should render children', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <div data-testid="child">Child content</div>
        </ThemeProvider>
      )

      // Assert
      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('should set data-theme attribute on document element', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      )

      // Assert
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  describe('useTheme hook', () => {
    it('should return context value when used inside provider', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert
      expect(result.current).toBeDefined()
      expect(result.current.theme).toBeDefined()
      expect(result.current.setTheme).toBeInstanceOf(Function)
      expect(result.current.toggleTheme).toBeInstanceOf(Function)
    })

    it('should throw error when used outside provider', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert
      expect(() => {
        renderHook(() => useTheme())
      }).toThrow('useTheme must be used within a ThemeProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('theme state', () => {
    it('should default to dark theme when no saved preference', () => {
      // Arrange
      matchMediaMock.mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })

      // Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert
      expect(result.current.theme).toBe('dark')
    })

    it('should default to dark when no saved preference exists (ignores system preference)', () => {
      // Arrange - system prefers light, but we should still default to dark
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      // Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert - should be dark regardless of system preference
      expect(result.current.theme).toBe('dark')
    })

    it('should load saved theme from localStorage', () => {
      // Arrange
      localStorageMock.setItem('lua-ide-theme', 'light')

      // Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert
      expect(result.current.theme).toBe('light')
    })

    it('should prefer localStorage over system preference', () => {
      // Arrange
      localStorageMock.setItem('lua-ide-theme', 'light')
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      // Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert
      expect(result.current.theme).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('should update theme when setTheme is called', () => {
      // Arrange
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })
      expect(result.current.theme).toBe('dark')

      // Act
      act(() => {
        result.current.setTheme('light')
      })

      // Assert
      expect(result.current.theme).toBe('light')
    })

    it('should update data-theme attribute when setTheme is called', () => {
      // Arrange
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Act
      act(() => {
        result.current.setTheme('light')
      })

      // Assert
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('should persist theme to localStorage when setTheme is called', () => {
      // Arrange
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Act
      act(() => {
        result.current.setTheme('light')
      })

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lua-ide-theme', 'light')
    })
  })

  describe('toggleTheme', () => {
    it('should toggle from dark to light', () => {
      // Arrange
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })
      expect(result.current.theme).toBe('dark')

      // Act
      act(() => {
        result.current.toggleTheme()
      })

      // Assert
      expect(result.current.theme).toBe('light')
    })

    it('should toggle from light to dark', () => {
      // Arrange
      localStorageMock.setItem('lua-ide-theme', 'light')
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })
      expect(result.current.theme).toBe('light')

      // Act
      act(() => {
        result.current.toggleTheme()
      })

      // Assert
      expect(result.current.theme).toBe('dark')
    })

    it('should update data-theme attribute when toggled', () => {
      // Arrange
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Act
      act(() => {
        result.current.toggleTheme()
      })

      // Assert
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('should persist to localStorage when toggled', () => {
      // Arrange
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Act
      act(() => {
        result.current.toggleTheme()
      })

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lua-ide-theme', 'light')
    })
  })

  describe('localStorage error handling', () => {
    it('should handle localStorage not available gracefully', () => {
      // Arrange
      const errorStorage = {
        getItem: vi.fn(() => {
          throw new Error('localStorage not available')
        }),
        setItem: vi.fn(() => {
          throw new Error('localStorage not available')
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      Object.defineProperty(window, 'localStorage', {
        value: errorStorage,
        writable: true,
      })

      // Act & Assert - should not throw
      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
        })
      }).not.toThrow()
    })

    it('should handle invalid theme value in localStorage', () => {
      // Arrange
      localStorageMock.setItem('lua-ide-theme', 'invalid-theme')

      // Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert - should fall back to default (dark)
      expect(result.current.theme).toBe('dark')
    })
  })

  describe('isDark helper', () => {
    it('should return true when theme is dark', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert
      expect(result.current.isDark).toBe(true)
    })

    it('should return false when theme is light', () => {
      // Arrange
      localStorageMock.setItem('lua-ide-theme', 'light')

      // Act
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      })

      // Assert
      expect(result.current.isDark).toBe(false)
    })
  })
})
