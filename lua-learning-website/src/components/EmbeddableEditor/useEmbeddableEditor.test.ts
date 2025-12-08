import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useEmbeddableEditor } from './useEmbeddableEditor'

// Mock useLuaEngine
const mockExecute = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/useLuaEngine', () => ({
  useLuaEngine: vi.fn((options: { onOutput?: (msg: string) => void; onError?: (msg: string) => void }) => {
    // Store callbacks so tests can trigger them
    ;(mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput = options.onOutput
    ;(mockExecute as unknown as { _onError?: (msg: string) => void })._onError = options.onError
    return {
      isReady: true,
      execute: mockExecute,
      reset: mockReset,
    }
  }),
}))

describe('useEmbeddableEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return initial code from options', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'print("hello")' })
      )

      // Assert
      expect(result.current.code).toBe('print("hello")')
    })

    it('should return empty output array initially', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Assert
      expect(result.current.output).toEqual([])
    })

    it('should return isRunning=false initially', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Assert
      expect(result.current.isRunning).toBe(false)
    })

    it('should return error=null initially', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Assert
      expect(result.current.error).toBeNull()
    })
  })

  describe('setCode', () => {
    it('should update code state', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'initial' })
      )

      // Act
      act(() => {
        result.current.setCode('updated')
      })

      // Assert
      expect(result.current.code).toBe('updated')
    })

    it('should call onChange callback', () => {
      // Arrange
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'initial', onChange })
      )

      // Act
      act(() => {
        result.current.setCode('updated')
      })

      // Assert
      expect(onChange).toHaveBeenCalledWith('updated')
    })

    it('should not call onChange if not provided', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'initial' })
      )

      // Act & Assert - should not throw
      expect(() => {
        act(() => {
          result.current.setCode('updated')
        })
      }).not.toThrow()
    })
  })

  describe('reset', () => {
    it('should restore initial code', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'initial code' })
      )
      act(() => {
        result.current.setCode('modified code')
      })

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.code).toBe('initial code')
    })

    it('should clear output', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Simulate output being added
      const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
      act(() => {
        onOutput?.('some output')
      })
      expect(result.current.output.length).toBeGreaterThan(0)

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.output).toEqual([])
    })

    it('should clear error', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Simulate error
      const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
      act(() => {
        onError?.('some error')
      })
      expect(result.current.error).not.toBeNull()

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.error).toBeNull()
    })
  })

  describe('run', () => {
    it('should set isRunning to true during execution', async () => {
      // Arrange
      let isRunningDuringExecution = false
      let resolveExecution: () => void
      const executionPromise = new Promise<void>(resolve => {
        resolveExecution = resolve
      })

      mockExecute.mockImplementation(async () => {
        await executionPromise
      })

      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'print("test")' })
      )

      // Act - start run but don't await it yet
      let runPromise: Promise<void>
      act(() => {
        runPromise = result.current.run()
      })

      // Check isRunning while execution is pending
      isRunningDuringExecution = result.current.isRunning

      // Now complete the execution
      await act(async () => {
        resolveExecution!()
        await runPromise!
      })

      // Assert
      expect(isRunningDuringExecution).toBe(true)
      expect(result.current.isRunning).toBe(false)
    })

    it('should execute current code via Lua engine', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'print("hello")' })
      )

      // Act
      await act(async () => {
        await result.current.run()
      })

      // Assert
      expect(mockExecute).toHaveBeenCalledWith('print("hello")')
    })

    it('should capture Lua output', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'print("output")' })
      )

      // Simulate output during execution
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('captured output')
      })

      // Act
      await act(async () => {
        await result.current.run()
      })

      // Assert
      expect(result.current.output).toContain('captured output')
    })

    it('should call onRun callback with code and output', async () => {
      // Arrange
      const onRun = vi.fn()
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'print("test")', onRun })
      )

      // Simulate output during execution
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('test output')
      })

      // Act
      await act(async () => {
        await result.current.run()
      })

      // Assert
      expect(onRun).toHaveBeenCalledWith('print("test")', 'test output')
    })

    it('should capture error messages', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'error("bad")' })
      )

      // Simulate error during execution
      mockExecute.mockImplementation(async () => {
        const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
        onError?.('Lua error: bad')
      })

      // Act
      await act(async () => {
        await result.current.run()
      })

      // Assert
      expect(result.current.error).toBe('Lua error: bad')
    })

    it('should set isRunning to false after error', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'error("bad")' })
      )

      // Simulate error during execution
      mockExecute.mockImplementation(async () => {
        const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
        onError?.('error')
      })

      // Act
      await act(async () => {
        await result.current.run()
      })

      // Assert
      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('clearOutput', () => {
    it('should clear output array', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Simulate output being added
      const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
      act(() => {
        onOutput?.('line 1')
        onOutput?.('line 2')
      })
      expect(result.current.output.length).toBe(2)

      // Act
      act(() => {
        result.current.clearOutput()
      })

      // Assert
      expect(result.current.output).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle empty code string', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '' })
      )

      // Act & Assert - should not throw
      await act(async () => {
        await expect(result.current.run()).resolves.not.toThrow()
      })
    })

    it('should handle code with only whitespace', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: '   \n\t  ' })
      )

      // Act & Assert - should not throw
      await act(async () => {
        await expect(result.current.run()).resolves.not.toThrow()
      })
    })

    it('should handle multiple runs without clearing output', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'print("test")' })
      )

      // Simulate output during executions
      let runCount = 0
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.(`run ${++runCount}`)
      })

      // Act
      await act(async () => {
        await result.current.run()
        await result.current.run()
      })

      // Assert - output should accumulate
      expect(result.current.output).toEqual(['run 1', 'run 2'])
    })

    it('should call onRun with joined output string', async () => {
      // Arrange
      const onRun = vi.fn()
      const { result } = renderHook(() =>
        useEmbeddableEditor({ initialCode: 'test', onRun })
      )

      // Simulate multiple outputs during execution
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('line1')
        onOutput?.('line2')
      })

      // Act
      await act(async () => {
        await result.current.run()
      })

      // Assert - output should be joined with newlines
      expect(onRun).toHaveBeenCalledWith('test', 'line1\nline2')
    })
  })
})
