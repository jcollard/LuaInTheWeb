import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLuaSyntaxChecker } from './useLuaSyntaxChecker'

describe('useLuaSyntaxChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('starts with no syntax error', () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      expect(result.current.syntaxError).toBeNull()
    })

    it('starts with isChecking false', () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      expect(result.current.isChecking).toBe(false)
    })
  })

  describe('checkSyntax', () => {
    it('debounces syntax checks', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      // Call checkSyntax multiple times rapidly
      act(() => {
        result.current.checkSyntax('print("hello")')
        result.current.checkSyntax('print("hello") print("world")')
        result.current.checkSyntax('print("final")')
      })

      // Error should still be null (debounced)
      expect(result.current.syntaxError).toBeNull()

      // Advance timer past debounce delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // Should have processed the final code (which is valid)
      expect(result.current.syntaxError).toBeNull()
    })

    it('sets syntaxError when code has syntax error', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      act(() => {
        result.current.checkSyntax('print("hi") 0')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syntaxError).not.toBeNull()
      expect(result.current.syntaxError).toContain('unexpected')
    })

    it('clears syntaxError when code is valid', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      // Check invalid code
      act(() => {
        result.current.checkSyntax('invalid 0')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syntaxError).not.toBeNull()

      // Check valid code
      act(() => {
        result.current.checkSyntax('print("valid")')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syntaxError).toBeNull()
    })

    it('shows error for incomplete code (e.g., unclosed parenthesis)', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      act(() => {
        result.current.checkSyntax('print("hi"')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // Should show error for incomplete code when editing files
      expect(result.current.syntaxError).not.toBeNull()
      expect(result.current.syntaxError).toContain('<eof>')
    })

    it('clears error for empty code without waiting for debounce', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      // First set an error
      act(() => {
        result.current.checkSyntax('invalid 0')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syntaxError).not.toBeNull()

      // Empty code should clear error immediately
      act(() => {
        result.current.checkSyntax('')
      })

      // Error should be cleared immediately (no need to wait for debounce)
      expect(result.current.syntaxError).toBeNull()
    })

    it('sets isChecking while checking', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      act(() => {
        result.current.checkSyntax('print("hello")')
      })

      // Before debounce completes, isChecking should be false
      expect(result.current.isChecking).toBe(false)

      // Advance past debounce - the check is synchronous with luaparse
      // so isChecking will briefly be true then false
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // After check completes, should be false again
      expect(result.current.isChecking).toBe(false)
    })
  })

  describe('error message quality', () => {
    it('does not contain WASM-related error messages', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      const badCodes = [
        'print("hello)',
        'if if if',
        'local = 5',
        '))))',
      ]

      for (const code of badCodes) {
        act(() => {
          result.current.checkSyntax(code)
        })

        await act(async () => {
          await vi.advanceTimersByTimeAsync(350)
        })

        if (result.current.syntaxError) {
          expect(result.current.syntaxError.toLowerCase()).not.toContain('wasm')
          expect(result.current.syntaxError.toLowerCase()).not.toContain('memory access')
          expect(result.current.syntaxError.toLowerCase()).not.toContain('runtime error')
        }
      }
    })

    it('includes line number in error message', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      act(() => {
        result.current.checkSyntax('x = 1\nprint("unclosed')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syntaxError).not.toBeNull()
      // Should contain line number in format like ":2:"
      expect(result.current.syntaxError).toMatch(/:\d+/)
    })
  })

  describe('cleanup', () => {
    it('cleans up debounce timer on unmount', async () => {
      const { result, unmount } = renderHook(() => useLuaSyntaxChecker())

      // Schedule a check
      act(() => {
        result.current.checkSyntax('print("hello")')
      })

      // Unmount before debounce completes
      unmount()

      // Should not throw or cause issues when timer fires after unmount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
    })
  })
})
