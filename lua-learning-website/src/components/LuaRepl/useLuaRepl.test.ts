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
    // Cycle 3: Execute runs Lua code as statement (fallback after return fails)
    it('should execute Lua code as statement', async () => {
      // Arrange
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // First try "return __format_results(x = 1 + 1)" - fails (syntax error)
      // Then fallback to "x = 1 + 1" - succeeds
      mockDoString
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockResolvedValueOnce(undefined)

      // Act
      await act(async () => {
        await result.current.executeCode('x = 1 + 1')
      })

      // Assert - should try return first, then statement
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(x = 1 + 1)')
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

    // Cycle 7: Try return first for expressions (succeeds on first try)
    it('should evaluate and display expression results', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Try return first - succeeds and returns formatted result
      mockDoString.mockResolvedValueOnce('2')

      // Act
      await act(async () => {
        await result.current.executeCode('1 + 1')
      })

      // Assert - should format expression directly in Lua
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(1 + 1)')
      expect(onOutput).toHaveBeenCalledWith('2')
    })

    // Cycle 7b: Try return first for function values (succeeds on first try)
    it('should format function values using Lua formatter', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Try return first - succeeds and returns formatted function
      mockDoString.mockResolvedValueOnce('function(arg1, arg2) [string "..."]:1]')

      // Act
      await act(async () => {
        await result.current.executeCode('myFunc')
      })

      // Assert - formatter wraps the expression directly
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(myFunc)')
      expect(onOutput).toHaveBeenCalledWith('function(arg1, arg2) [string "..."]:1]')
    })

    // Cycle 7c: Try return first for table values (succeeds on first try)
    it('should format table values using Lua formatter', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Try return first - succeeds and returns formatted table
      mockDoString.mockResolvedValueOnce('{a = 1, b = 2}')

      // Act
      await act(async () => {
        await result.current.executeCode('{a = 1, b = 2}')
      })

      // Assert - formatter wraps the expression directly
      expect(mockDoString).toHaveBeenCalledWith('return __format_results({a = 1, b = 2})')
      expect(onOutput).toHaveBeenCalledWith('{a = 1, b = 2}')
    })

    // Cycle 8: Try return first - returns nil (no output)
    it('should not output when expression returns nil', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Try return first - succeeds and returns 'nil' string from formatter
      mockDoString.mockResolvedValueOnce('nil')

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

      // Get the print function and flush function that were set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined
      const flushFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === '__js_flush'
      )?.[1] as (() => void) | undefined

      // Act
      printFn?.('hello')
      // Output is buffered, flush to deliver it
      flushFn?.()

      // Assert - LuaEngineFactory's print adds newline (correct Lua behavior)
      expect(onOutput).toHaveBeenCalledWith('hello\n')
    })

    // Cycle 10: Multiple print args joined with tabs
    it('should join multiple print arguments with tabs', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the print function and flush function that were set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined
      const flushFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === '__js_flush'
      )?.[1] as (() => void) | undefined

      // Act
      printFn?.('a', 'b', 'c')
      // Output is buffered, flush to deliver it
      flushFn?.()

      // Assert - LuaEngineFactory's print adds newline (correct Lua behavior)
      expect(onOutput).toHaveBeenCalledWith('a\tb\tc\n')
    })

    // Cycle 11: Print converts null/undefined to 'nil'
    it('should convert null and undefined to nil', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Get the print function and flush function that were set
      const printFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === 'print'
      )?.[1] as ((...args: unknown[]) => void) | undefined
      const flushFn = mockGlobalSet.mock.calls.find(
        (call: unknown[]) => call[0] === '__js_flush'
      )?.[1] as (() => void) | undefined

      // Act
      printFn?.(null, undefined, 'value')
      // Output is buffered, flush to deliver it
      flushFn?.()

      // Assert - LuaEngineFactory's print adds newline (correct Lua behavior)
      expect(onOutput).toHaveBeenCalledWith('nil\tnil\tvalue\n')
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

  describe('function return values', () => {
    // Cycle 20: Function call should display return value
    it('should display return value when function is called', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Mock: try "return __format_results(add(2, 3))" - should succeed and return '5'
      mockDoString.mockResolvedValueOnce('5')

      // Act - call a function and expect return value to be displayed
      await act(async () => {
        await result.current.executeCode('add(2, 3)')
      })

      // Assert - should display the return value using formatted approach
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(add(2, 3))')
      expect(onOutput).toHaveBeenCalledWith('5')
    })

    // Cycle 21: Multiple return values should be displayed tab-separated
    it('should display multiple return values tab-separated', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Mock: function returns multiple values formatted as "3\t4"
      mockDoString.mockResolvedValueOnce('3\t4')

      // Act - call string.find which returns multiple values
      await act(async () => {
        await result.current.executeCode('string.find("hello", "ll")')
      })

      // Assert - should display all return values tab-separated
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(string.find("hello", "ll"))')
      expect(onOutput).toHaveBeenCalledWith('3\t4')
    })

    // Cycle 22: Multiple return values with nil in middle
    it('should handle nil in middle of multiple return values', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Mock: function returns (1, nil, 3) formatted as "1\tnil\t3"
      mockDoString.mockResolvedValueOnce('1\tnil\t3')

      // Act - call function that returns values with nil in middle
      await act(async () => {
        await result.current.executeCode('test()')
      })

      // Assert - should display all values including nil in middle
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(test())')
      expect(onOutput).toHaveBeenCalledWith('1\tnil\t3')
    })

    // Cycle 23: Multiple return values with nil at start
    it('should handle nil at start of multiple return values', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Mock: function returns (nil, 2, 3) formatted as "nil\t2\t3"
      mockDoString.mockResolvedValueOnce('nil\t2\t3')

      // Act - call function that returns nil first
      await act(async () => {
        await result.current.executeCode('test()')
      })

      // Assert - should display all values including nil at start
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(test())')
      expect(onOutput).toHaveBeenCalledWith('nil\t2\t3')
    })

    // Cycle 24: Multiple return values with trailing nils
    it('should handle trailing nils in multiple return values', async () => {
      // Arrange
      const onOutput = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onOutput }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Mock: function returns (1, 2, nil) formatted as "1\t2\tnil"
      mockDoString.mockResolvedValueOnce('1\t2\tnil')

      // Act - call function that returns trailing nil
      await act(async () => {
        await result.current.executeCode('test()')
      })

      // Assert - should display all values including trailing nil
      expect(mockDoString).toHaveBeenCalledWith('return __format_results(test())')
      expect(onOutput).toHaveBeenCalledWith('1\t2\tnil')
    })
  })

  describe('error handling', () => {
    // Cycle 21: onError called when both return and statement fail
    it('should call onError when both return and statement evaluation fail', async () => {
      // Arrange
      const onError = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onError }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Both calls fail - return first, then statement
      mockDoString
        .mockRejectedValueOnce(new Error('return error'))
        .mockRejectedValueOnce(new Error('statement error'))

      // Act
      await act(async () => {
        await result.current.executeCode('invalid!!!')
      })

      // Assert - should show the statement error (from fallback)
      expect(onError).toHaveBeenCalledWith('statement error')
    })

    // Cycle 22: Error handling without callback doesn't crash
    it('should not crash on error when onError is not provided', async () => {
      // Arrange - no onError callback
      const { result } = renderHook(() => useLuaRepl({}))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Both calls fail - return first, then statement
      mockDoString
        .mockRejectedValueOnce(new Error('return error'))
        .mockRejectedValueOnce(new Error('statement error'))

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

    // Cycle 24: String error messages handled
    it('should handle non-Error thrown values', async () => {
      // Arrange
      const onError = vi.fn()
      const { result } = renderHook(() => useLuaRepl({ onError }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // Both calls fail, second (statement) with string error
      mockDoString
        .mockRejectedValueOnce(new Error('return error'))
        .mockRejectedValueOnce('string error')

      // Act
      await act(async () => {
        await result.current.executeCode('invalid!!!')
      })

      // Assert - should handle string error from statement fallback
      expect(onError).toHaveBeenCalledWith('string error')
    })
  })
})
