import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLuaSyntaxChecker } from './useLuaSyntaxChecker'
import { LuaEngineFactory } from '@lua-learning/lua-runtime'

// Mock the LuaEngineFactory
vi.mock('@lua-learning/lua-runtime', () => ({
  LuaEngineFactory: {
    create: vi.fn(),
    isCodeComplete: vi.fn(),
    closeDeferred: vi.fn(),
  },
}))

describe('useLuaSyntaxChecker', () => {
  const mockEngine = {}

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(LuaEngineFactory.closeDeferred).mockClear()
    vi.mocked(LuaEngineFactory.create).mockResolvedValue(mockEngine as never)
    vi.mocked(LuaEngineFactory.isCodeComplete).mockResolvedValue({ complete: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('creates a Lua engine on mount', async () => {
      renderHook(() => useLuaSyntaxChecker())

      // Flush promises and timers
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(LuaEngineFactory.create).toHaveBeenCalled()
    })

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

      // Wait for engine to be created
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Call checkSyntax multiple times rapidly
      act(() => {
        result.current.checkSyntax('print("hello")')
        result.current.checkSyntax('print("hello") print("world")')
        result.current.checkSyntax('print("final")')
      })

      // Should not have checked yet (debounce)
      expect(LuaEngineFactory.isCodeComplete).not.toHaveBeenCalled()

      // Advance timer past debounce delay and flush promises
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      // Should only have checked once with the final value
      expect(LuaEngineFactory.isCodeComplete).toHaveBeenCalledTimes(1)
      expect(LuaEngineFactory.isCodeComplete).toHaveBeenCalledWith(mockEngine, 'print("final")')
    })

    it('sets syntaxError when code has syntax error', async () => {
      vi.mocked(LuaEngineFactory.isCodeComplete).mockResolvedValue({
        complete: false,
        error: "[string \"...\"]:1: unexpected symbol near '0'",
      })

      const { result } = renderHook(() => useLuaSyntaxChecker())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.checkSyntax('print("hi") 0')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(result.current.syntaxError).toBe("[string \"...\"]:1: unexpected symbol near '0'")
    })

    it('clears syntaxError when code is valid', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // First return an error
      vi.mocked(LuaEngineFactory.isCodeComplete).mockResolvedValueOnce({
        complete: false,
        error: 'syntax error',
      })

      // Check invalid code
      act(() => {
        result.current.checkSyntax('invalid 0')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(result.current.syntaxError).toBe('syntax error')

      // Now return valid
      vi.mocked(LuaEngineFactory.isCodeComplete).mockResolvedValueOnce({
        complete: true,
      })

      // Check valid code
      act(() => {
        result.current.checkSyntax('print("valid")')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(result.current.syntaxError).toBeNull()
    })

    it('shows error for incomplete code (e.g., unclosed parenthesis)', async () => {
      // Incomplete code - has incompleteError field for file editing
      vi.mocked(LuaEngineFactory.isCodeComplete).mockResolvedValue({
        complete: false,
        incompleteError: "[string \"...\"]:3: ')' expected near <eof>",
      })

      const { result } = renderHook(() => useLuaSyntaxChecker())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.checkSyntax('print("hi"\n')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(LuaEngineFactory.isCodeComplete).toHaveBeenCalled()
      // Should show error for incomplete code when editing files
      expect(result.current.syntaxError).toBe("[string \"...\"]:3: ')' expected near <eof>")
    })

    it('clears error for empty code without checking', async () => {
      const { result } = renderHook(() => useLuaSyntaxChecker())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // First set an error
      vi.mocked(LuaEngineFactory.isCodeComplete).mockResolvedValueOnce({
        complete: false,
        error: 'syntax error',
      })

      act(() => {
        result.current.checkSyntax('invalid 0')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(result.current.syntaxError).toBe('syntax error')

      // Clear the mock call count
      vi.mocked(LuaEngineFactory.isCodeComplete).mockClear()

      // Empty code should clear error immediately without checking
      act(() => {
        result.current.checkSyntax('')
      })

      // Error should be cleared immediately
      expect(result.current.syntaxError).toBeNull()

      // Advance time - should not have called isCodeComplete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600)
      })

      expect(LuaEngineFactory.isCodeComplete).not.toHaveBeenCalled()
    })

    it('sets isChecking while checking', async () => {
      let resolveCheck: (value: { complete: boolean }) => void = () => {}
      vi.mocked(LuaEngineFactory.isCodeComplete).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCheck = resolve
          })
      )

      const { result } = renderHook(() => useLuaSyntaxChecker())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.checkSyntax('print("hello")')
      })

      // Advance past debounce to start check
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      // Should be checking now
      expect(result.current.isChecking).toBe(true)

      // Resolve the check
      await act(async () => {
        resolveCheck({ complete: true })
      })

      // Should no longer be checking
      expect(result.current.isChecking).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('closes engine on unmount', async () => {
      const { unmount } = renderHook(() => useLuaSyntaxChecker())

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(LuaEngineFactory.create).toHaveBeenCalled()

      unmount()

      expect(LuaEngineFactory.closeDeferred).toHaveBeenCalledWith(mockEngine)
    })
  })
})
