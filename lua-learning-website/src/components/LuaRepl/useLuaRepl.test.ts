import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useLuaRepl } from './useLuaRepl'

// Mock wasmoon - WASM doesn't load properly in test environment
const { mockDoString, mockGlobalSet, mockGlobalClose, mockLuaEngine } = vi.hoisted(() => {
  const mockDoString = vi.fn()
  const mockGlobalSet = vi.fn()
  const mockGlobalClose = vi.fn()
  const mockLuaEngine = {
    doString: mockDoString,
    global: {
      set: mockGlobalSet,
      close: mockGlobalClose,
    },
  }
  return { mockDoString, mockGlobalSet, mockGlobalClose, mockLuaEngine }
})

vi.mock('wasmoon', () => {
  return {
    LuaFactory: class {
      async createEngine() {
        return mockLuaEngine
      }
    },
    LuaEngine: class {},
  }
})

describe('useLuaRepl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Cycle 1: Hook returns isReady=false initially
  it('should return isReady=false initially', async () => {
    // Arrange & Act
    const { result, unmount } = renderHook(() => useLuaRepl({}))

    // Assert
    expect(result.current.isReady).toBe(false)

    // Wait for any pending state updates before unmounting
    await waitFor(() => expect(result.current.isReady).toBe(true))
    unmount()
  })

  // Cycle 2: Hook becomes ready after initialization
  it('should become ready after initialization', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useLuaRepl({}))

    // Assert
    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
  })

  describe('executeCode', () => {
    // Cycle 3: Execute runs Lua code as statement
    it('should execute Lua code as statement', async () => {
      // Arrange
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Act
      await act(async () => {
        await result.current.executeCode('x = 1 + 1')
      })

      // Assert
      expect(mockDoString).toHaveBeenCalledWith('x = 1 + 1')
    })

    // Cycle 4: Execute with empty string returns early
    it('should not execute empty code string', async () => {
      // Arrange
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      mockDoString.mockClear()

      // Act
      await act(async () => {
        await result.current.executeCode('')
      })

      // Assert - doString should not be called for empty string
      expect(mockDoString).not.toHaveBeenCalled()
    })

    // Cycle 5: Execute with whitespace-only returns early
    it('should not execute whitespace-only code', async () => {
      // Arrange
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      mockDoString.mockClear()

      // Act
      await act(async () => {
        await result.current.executeCode('   ')
      })

      // Assert
      expect(mockDoString).not.toHaveBeenCalled()
    })

    // Cycle 6: Execute before ready returns early
    it('should not execute when engine is not ready', async () => {
      // Arrange
      const { result, unmount } = renderHook(() => useLuaRepl({}))
      // Don't wait for ready
      expect(result.current.isReady).toBe(false)

      // Act
      await act(async () => {
        await result.current.executeCode('print("test")')
      })

      // Assert - doString should not have been called with our code
      expect(mockDoString).not.toHaveBeenCalledWith('print("test")')

      // Wait for engine initialization to complete before unmounting
      await waitFor(() => expect(result.current.isReady).toBe(true))
      unmount()
    })

    // Cycle 7: Statement fails, fallback to expression evaluation with formatting
    it('should fallback to expression evaluation when statement fails', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // First call (statement) fails, second call formats and returns result
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockResolvedValueOnce('2') // formatter returns formatted string directly

      // Act
      await act(async () => {
        await result.current.executeCode('1 + 1')
      })

      // Assert - should format expression directly in Lua
      expect(mockDoString).toHaveBeenCalledWith('return __format_value((1 + 1))')
      expect(onOutput).toHaveBeenCalledWith('2')
    })

    // Cycle 7b: Expression returns formatted function string
    it('should format function values using Lua formatter', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // First call (statement) fails, second call returns formatted function
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockResolvedValueOnce('function(arg1, arg2) [string "..."]:1]')

      // Act
      await act(async () => {
        await result.current.executeCode('myFunc')
      })

      // Assert - formatter wraps the expression directly
      expect(mockDoString).toHaveBeenCalledWith('return __format_value((myFunc))')
      expect(onOutput).toHaveBeenCalledWith('function(arg1, arg2) [string "..."]:1]')
    })

    // Cycle 7c: Expression returns formatted table string
    it('should format table values using Lua formatter', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // First call (statement) fails, second call returns formatted table
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockResolvedValueOnce('{a = 1, b = 2}')

      // Act
      await act(async () => {
        await result.current.executeCode('{a = 1, b = 2}')
      })

      // Assert - formatter wraps the expression directly
      expect(mockDoString).toHaveBeenCalledWith('return __format_value(({a = 1, b = 2}))')
      expect(onOutput).toHaveBeenCalledWith('{a = 1, b = 2}')
    })

    // Cycle 8: Expression evaluation returns nil (no output)
    it('should not output when expression returns nil', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // First call fails, second returns 'nil' string from formatter
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockResolvedValueOnce('nil')

      // Act
      await act(async () => {
        await result.current.executeCode('nil')
      })

      // Assert - onOutput should not be called for nil result
      expect(onOutput).not.toHaveBeenCalled()
    })
  })

  describe('print output', () => {
    // Cycle 9: Print calls onOutput
    it('should call onOutput when print is called', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the print function that was set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined

      // Act
      printFn?.('hello')

      // Assert
      expect(onOutput).toHaveBeenCalledWith('hello')
    })

    // Cycle 10: Multiple print args joined with tabs
    it('should join multiple print arguments with tabs', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the print function that was set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined

      // Act
      printFn?.('a', 'b', 'c')

      // Assert
      expect(onOutput).toHaveBeenCalledWith('a\tb\tc')
    })

    // Cycle 11: Print converts null/undefined to 'nil'
    it('should convert null and undefined to nil', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the print function that was set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined

      // Act
      printFn?.(null, undefined, 'value')

      // Assert
      expect(onOutput).toHaveBeenCalledWith('nil\tnil\tvalue')
    })

    // Cycle 12: Print without onOutput doesn't crash
    it('should not crash when print is called without onOutput', async () => {
      // Arrange - no onOutput callback provided
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the print function that was set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined

      // Act & Assert - should not throw
      expect(() => printFn?.('no callback')).not.toThrow()
    })
  })

  describe('io.read', () => {
    // Cycle 13: io.read calls onReadInput
    it('should setup __js_read_input to call onReadInput', async () => {
      // Arrange
      const onReadInput = vi.fn().mockResolvedValue('user input')
      const { result } = renderHook(() => useLuaRepl({ onReadInput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the __js_read_input function that was set
      const readInputFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === '__js_read_input'
      )?.[1] as (() => Promise<string>) | undefined

      expect(readInputFn).toBeDefined()

      // Act
      const input = await readInputFn?.()

      // Assert
      expect(onReadInput).toHaveBeenCalled()
      expect(input).toBe('user input')
    })

    // Cycle 14: io.read without callback returns empty string
    it('should return empty string when onReadInput not provided', async () => {
      // Arrange - no onReadInput callback provided
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the __js_read_input function
      const readInputFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === '__js_read_input'
      )?.[1] as (() => Promise<string>) | undefined

      // Act
      const input = await readInputFn?.()

      // Assert
      expect(input).toBe('')
    })

    // Cycle 15: io.write and io.read Lua setup
    it('should setup io.write and io.read via doString', async () => {
      // Arrange
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Assert - doString should have been called to set up io table
      const ioSetupCall = mockDoString.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('io.write')
      )
      expect(ioSetupCall).toBeDefined()
    })
  })

  describe('REPL commands', () => {
    // Cycle 16: clear() calls onClear
    it('should setup clear() to call onClear', async () => {
      // Arrange
      const onClear = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onClear }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the clear function that was set
      const clearFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'clear'
      )?.[1] as (() => void) | undefined

      expect(clearFn).toBeDefined()

      // Act
      clearFn?.()

      // Assert
      expect(onClear).toHaveBeenCalled()
    })

    // Cycle 17: help() calls onShowHelp
    it('should setup help() to call onShowHelp', async () => {
      // Arrange
      const onShowHelp = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onShowHelp }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the help function that was set
      const helpFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'help'
      )?.[1] as (() => void) | undefined

      expect(helpFn).toBeDefined()

      // Act
      helpFn?.()

      // Assert
      expect(onShowHelp).toHaveBeenCalled()
    })

    // Cycle 18: reset() resets the engine
    it('should return reset function that reinitializes engine', async () => {
      // Arrange
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Act
      await act(async () => {
        await result.current.reset()
      })

      // Assert - should have closed the old engine
      expect(mockGlobalClose).toHaveBeenCalled()
    })

    // Cycle 19: reset() calls onReset callback
    it('should call onReset when reset is called', async () => {
      // Arrange
      const onReset = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onReset }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Act
      await act(async () => {
        await result.current.reset()
      })

      // Assert
      expect(onReset).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    // Cycle 20: onError called when both statement and expression fail
    it('should call onError when both statement and expression evaluation fail', async () => {
      // Arrange
      const onError = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onError }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Both calls fail
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockRejectedValueOnce(new Error('expression error'))

      // Act
      await act(async () => {
        await result.current.executeCode('invalid!!!')
      })

      // Assert
      expect(onError).toHaveBeenCalledWith('expression error')
    })

    // Cycle 21: Error handling without callback doesn't crash
    it('should not crash on error when onError is not provided', async () => {
      // Arrange - no onError callback
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Both calls fail
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockRejectedValueOnce(new Error('expression error'))

      // Act & Assert - should not throw
      await act(async () => {
        await expect(result.current.executeCode('invalid!!!')).resolves.not.toThrow()
      })
    })

    // Cycle 22: Cleanup on unmount
    it('should cleanup engine on unmount', async () => {
      // Arrange
      const { result, unmount } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Act
      unmount()

      // Assert
      expect(mockGlobalClose).toHaveBeenCalled()
    })

    // Cycle 23: String error messages handled
    it('should handle non-Error thrown values', async () => {
      // Arrange
      const onError = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onError }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Both calls fail, second with string
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockRejectedValueOnce('string error')

      // Act
      await act(async () => {
        await result.current.executeCode('invalid!!!')
      })

      // Assert
      expect(onError).toHaveBeenCalledWith('string error')
    })
  })
})
