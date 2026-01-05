import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDevErrorTrigger } from './useDevErrorTrigger'

describe('useDevErrorTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clean up any existing trigger
    delete (window as unknown as { __triggerErrorBoundary?: unknown }).__triggerErrorBoundary
  })

  afterEach(() => {
    // Clean up
    delete (window as unknown as { __triggerErrorBoundary?: unknown }).__triggerErrorBoundary
  })

  describe('in development mode', () => {
    it('should expose __triggerErrorBoundary on window', () => {
      // Vitest runs in test mode which has import.meta.env.DEV = true
      expect(import.meta.env.DEV).toBe(true)

      renderHook(() => useDevErrorTrigger())

      expect(
        (window as unknown as { __triggerErrorBoundary?: unknown }).__triggerErrorBoundary
      ).toBeDefined()
      expect(
        typeof (window as unknown as { __triggerErrorBoundary?: unknown }).__triggerErrorBoundary
      ).toBe('function')
    })

    it('should log info message on mount', () => {
      const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

      renderHook(() => useDevErrorTrigger())

      expect(consoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DevErrorTrigger]'),
        expect.any(String)
      )

      consoleInfo.mockRestore()
    })

    it('should throw error when trigger is called', () => {
      const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

      renderHook(() => useDevErrorTrigger())

      // Get the trigger function
      const trigger = (window as unknown as { __triggerErrorBoundary: (msg?: string) => void })
        .__triggerErrorBoundary

      // Calling trigger should cause next render to throw
      expect(() => {
        act(() => {
          trigger()
        })
      }).toThrow('Test error triggered from console via __triggerErrorBoundary()')

      consoleInfo.mockRestore()
    })

    it('should throw custom error message when provided', () => {
      const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

      renderHook(() => useDevErrorTrigger())

      const trigger = (window as unknown as { __triggerErrorBoundary: (msg?: string) => void })
        .__triggerErrorBoundary

      expect(() => {
        act(() => {
          trigger('Custom test error')
        })
      }).toThrow('Custom test error')

      consoleInfo.mockRestore()
    })

    it('should clean up on unmount', () => {
      const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

      const { unmount } = renderHook(() => useDevErrorTrigger())

      expect(
        (window as unknown as { __triggerErrorBoundary?: unknown }).__triggerErrorBoundary
      ).toBeDefined()

      unmount()

      expect(
        (window as unknown as { __triggerErrorBoundary?: unknown }).__triggerErrorBoundary
      ).toBeUndefined()

      consoleInfo.mockRestore()
    })
  })
})
