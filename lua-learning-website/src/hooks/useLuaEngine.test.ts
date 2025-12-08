import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useLuaEngine } from './useLuaEngine'

// Mock wasmoon - WASM doesn't load properly in test environment
// These must be declared with vi.hoisted so they're available when the mock is hoisted
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

describe('useLuaEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  // Cycle 1.1: Hook returns isReady=false initially
  it('should return isReady=false initially', () => {
    // Arrange & Act
    const { result } = renderHook(() => useLuaEngine({}))

    // Assert
    expect(result.current.isReady).toBe(false)
  })

  // Cycle 1.2: Hook becomes ready after initialization
  it('should become ready after initialization', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useLuaEngine({}))

    // Assert
    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
  })

  // Cycle 1.3: Execute runs Lua code
  it('should execute Lua code successfully', async () => {
    // Arrange
    const { result } = renderHook(() => useLuaEngine({}))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Act & Assert (no error thrown = success)
    await act(async () => {
      await result.current.execute('x = 1 + 1')
    })

    expect(mockDoString).toHaveBeenCalledWith('x = 1 + 1')
  })

  // Cycle 1.4: Captures print output
  it('should call onOutput when print is called', async () => {
    // Arrange
    const onOutput = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onOutput }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Get the print function that was set
    const printFn = mockGlobalSet.mock.calls.find(
      (call: unknown[]) => call[0] === 'print'
    )?.[1] as ((...args: unknown[]) => void) | undefined

    // Act - call print directly
    printFn?.('hello')

    // Assert
    expect(onOutput).toHaveBeenCalledWith('hello')
  })

  // Cycle 1.4b: Multiple print arguments joined with tabs
  it('should join multiple print arguments with tabs', async () => {
    // Arrange
    const onOutput = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onOutput }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Get the print function that was set
    const printFn = mockGlobalSet.mock.calls.find(
      (call: unknown[]) => call[0] === 'print'
    )?.[1] as ((...args: unknown[]) => void) | undefined

    // Act - call print with multiple arguments
    printFn?.('a', 'b', 'c')

    // Assert
    expect(onOutput).toHaveBeenCalledWith('a\tb\tc')
  })

  // Cycle 1.5: Handles syntax errors
  it('should call onError for syntax errors', async () => {
    // Arrange
    const onError = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onError }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Set up the mock to reject AFTER the hook is ready (after setup call)
    mockDoString.mockRejectedValueOnce(new Error('syntax error'))

    // Act
    await act(async () => {
      await result.current.execute('this is not valid lua!!!')
    })

    // Assert
    expect(onError).toHaveBeenCalledWith('syntax error')
  })

  // Cycle 1.6: Reset clears state
  it('should reset engine state', async () => {
    // Arrange
    const onOutput = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onOutput }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Act
    await act(async () => {
      await result.current.reset()
    })

    // Assert - should have closed the old engine
    expect(mockGlobalClose).toHaveBeenCalled()
  })

  // Cycle 1.6b: Reset calls onCleanup
  it('should call onCleanup when reset is called', async () => {
    // Arrange
    const onCleanup = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onCleanup }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Act
    await act(async () => {
      await result.current.reset()
    })

    // Assert
    expect(onCleanup).toHaveBeenCalled()
  })

  // Cycle 1.7: Cleanup on unmount
  it('should cleanup engine on unmount', async () => {
    // Arrange
    const onCleanup = vi.fn()
    const { result, unmount } = renderHook(() => useLuaEngine({ onCleanup }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Act
    unmount()

    // Assert
    expect(onCleanup).toHaveBeenCalled()
    expect(mockGlobalClose).toHaveBeenCalled()
  })

  // Cycle 1.7b: No cleanup if unmount before ready
  it('should not call onCleanup if unmounted before engine ready', () => {
    // Arrange
    const onCleanup = vi.fn()

    // Act - unmount immediately, before engine initializes
    const { unmount } = renderHook(() => useLuaEngine({ onCleanup }))
    unmount()

    // Assert - onCleanup should not be called since engine was never ready
    expect(onCleanup).not.toHaveBeenCalled()
  })

  // Cycle 1.8: Execute with empty string
  it('should handle empty code string without error', async () => {
    // Arrange
    const onError = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onError }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Act
    await act(async () => {
      await result.current.execute('')
    })

    // Assert
    expect(onError).not.toHaveBeenCalled()
    expect(mockDoString).toHaveBeenCalledWith('')
  })

  // Cycle 1.9: Execute before ready returns early
  it('should not execute when engine is not ready', async () => {
    // Arrange
    const onOutput = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onOutput }))
    // Don't wait for ready - check isReady is false
    expect(result.current.isReady).toBe(false)

    // Act - immediately try to execute (before engine ready)
    await act(async () => {
      await result.current.execute('print("should not run")')
    })

    // Assert - doString should not have been called with our specific code
    // (setup may call doString for io.write, but our execute should not)
    expect(mockDoString).not.toHaveBeenCalledWith('print("should not run")')
  })

  // Cycle 1.10: Runtime error calls onError
  it('should call onError for runtime errors', async () => {
    // Arrange
    const onError = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onError }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Set up the mock to reject AFTER the hook is ready
    mockDoString.mockRejectedValueOnce(new Error('intentional error'))

    // Act
    await act(async () => {
      await result.current.execute('error("intentional error")')
    })

    // Assert
    expect(onError).toHaveBeenCalledWith('intentional error')
  })

  // Cycle 1.10b: Handles print without onOutput callback
  it('should not crash when print is called without onOutput', async () => {
    // Arrange - no onOutput callback provided
    const { result } = renderHook(() => useLuaEngine({}))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Get the print function that was set
    const printFn = mockGlobalSet.mock.calls.find(
      (call: unknown[]) => call[0] === 'print'
    )?.[1] as ((...args: unknown[]) => void) | undefined

    // Act & Assert - should not throw
    expect(() => printFn?.('no callback')).not.toThrow()
  })

  // Cycle 1.10c: Handles error without onError callback
  it('should not crash on error when onError is not provided', async () => {
    // Arrange - no onError callback provided
    const { result } = renderHook(() => useLuaEngine({}))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Set up the mock to reject AFTER the hook is ready
    mockDoString.mockRejectedValueOnce(new Error('no callback'))

    // Act & Assert - should not throw
    await act(async () => {
      await expect(result.current.execute('error("no callback")')).resolves.not.toThrow()
    })
  })

  // Cycle 1.11a: io.read calls onReadInput
  it('should setup io.read to call onReadInput', async () => {
    // Arrange
    const onReadInput = vi.fn().mockResolvedValue('user input')
    const { result } = renderHook(() => useLuaEngine({ onReadInput }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Assert - __js_read_input should be set
    const readInputFn = mockGlobalSet.mock.calls.find(
      (call: unknown[]) => call[0] === '__js_read_input'
    )?.[1] as (() => Promise<string>) | undefined

    expect(readInputFn).toBeDefined()

    // Call it and verify it uses onReadInput
    const input = await readInputFn?.()
    expect(onReadInput).toHaveBeenCalled()
    expect(input).toBe('user input')
  })

  // Cycle 1.11c: io.write calls onOutput
  it('should setup io.write via doString', async () => {
    // Arrange
    const onOutput = vi.fn()
    const { result } = renderHook(() => useLuaEngine({ onOutput }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Assert - doString should have been called to set up io.write
    expect(mockDoString).toHaveBeenCalled()
  })

  // Cycle 1.11d: io.read without callback returns empty string
  it('should return empty string from io.read when onReadInput not provided', async () => {
    // Arrange - no onReadInput callback provided
    const { result } = renderHook(() => useLuaEngine({}))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Get the __js_read_input function
    const readInputFn = mockGlobalSet.mock.calls.find(
      (call: unknown[]) => call[0] === '__js_read_input'
    )?.[1] as (() => Promise<string>) | undefined

    // Act & Assert
    const input = await readInputFn?.()
    expect(input).toBe('')
  })
})
