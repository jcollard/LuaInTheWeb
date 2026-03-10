import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { CrtProvider } from './CrtProvider'
import { useCrt } from './useCrt'

describe('CrtContext', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useCrt hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useCrt())
      }).toThrow('useCrt must be used within a CrtProvider')

      consoleSpy.mockRestore()
    })

    it('should return context value when used inside provider', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      expect(result.current).toBeDefined()
      expect(result.current.enabled).toBe(false)
      expect(result.current.intensity).toBe(0.7)
      expect(result.current.toggleCrt).toBeInstanceOf(Function)
      expect(result.current.setIntensity).toBeInstanceOf(Function)
    })
  })

  describe('default state', () => {
    it('should default to disabled with intensity 0.7', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      expect(result.current.enabled).toBe(false)
      expect(result.current.intensity).toBe(0.7)
    })
  })

  describe('toggleCrt', () => {
    it('should toggle from disabled to enabled', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      act(() => {
        result.current.toggleCrt()
      })

      expect(result.current.enabled).toBe(true)
    })

    it('should toggle from enabled to disabled', () => {
      localStorageMock.setItem('lua-ide-crt', JSON.stringify({ enabled: true, intensity: 0.7 }))

      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })
      expect(result.current.enabled).toBe(true)

      act(() => {
        result.current.toggleCrt()
      })

      expect(result.current.enabled).toBe(false)
    })

    it('should persist to localStorage when toggled', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      act(() => {
        result.current.toggleCrt()
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lua-ide-crt',
        JSON.stringify({ enabled: true, intensity: 0.7 }),
      )
    })
  })

  describe('setIntensity', () => {
    it('should update intensity value', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      act(() => {
        result.current.setIntensity(0.5)
      })

      expect(result.current.intensity).toBe(0.5)
    })

    it('should clamp intensity to 0-1 range', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      act(() => {
        result.current.setIntensity(1.5)
      })
      expect(result.current.intensity).toBe(1)

      act(() => {
        result.current.setIntensity(-0.5)
      })
      expect(result.current.intensity).toBe(0)
    })

    it('should persist intensity to localStorage', () => {
      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      act(() => {
        result.current.setIntensity(0.5)
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lua-ide-crt',
        JSON.stringify({ enabled: false, intensity: 0.5 }),
      )
    })
  })

  describe('localStorage persistence', () => {
    it('should load saved settings from localStorage', () => {
      localStorageMock.setItem('lua-ide-crt', JSON.stringify({ enabled: true, intensity: 0.3 }))

      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      expect(result.current.enabled).toBe(true)
      expect(result.current.intensity).toBe(0.3)
    })

    it('should handle localStorage not available gracefully', () => {
      const errorStorage = {
        getItem: vi.fn(() => { throw new Error('not available') }),
        setItem: vi.fn(() => { throw new Error('not available') }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      Object.defineProperty(window, 'localStorage', {
        value: errorStorage,
        writable: true,
      })

      expect(() => {
        renderHook(() => useCrt(), {
          wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
        })
      }).not.toThrow()
    })

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.setItem('lua-ide-crt', 'not-json')

      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      expect(result.current.enabled).toBe(false)
      expect(result.current.intensity).toBe(0.7)
    })

    it('should fall back to defaults when enabled is not a boolean', () => {
      localStorageMock.setItem('lua-ide-crt', JSON.stringify({ enabled: 'yes', intensity: 0.5 }))

      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      expect(result.current.enabled).toBe(false)
      expect(result.current.intensity).toBe(0.7)
    })

    it('should fall back to defaults when intensity is not a number', () => {
      localStorageMock.setItem('lua-ide-crt', JSON.stringify({ enabled: true, intensity: 'high' }))

      const { result } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      expect(result.current.enabled).toBe(false)
      expect(result.current.intensity).toBe(0.7)
    })
  })

  describe('callback stability', () => {
    it('should return stable toggleCrt reference across renders', () => {
      const { result, rerender } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      const firstToggle = result.current.toggleCrt
      rerender()
      expect(result.current.toggleCrt).toBe(firstToggle)
    })

    it('should return stable setIntensity reference across renders', () => {
      const { result, rerender } = renderHook(() => useCrt(), {
        wrapper: ({ children }) => <CrtProvider>{children}</CrtProvider>,
      })

      const firstSetIntensity = result.current.setIntensity
      rerender()
      expect(result.current.setIntensity).toBe(firstSetIntensity)
    })
  })
})
