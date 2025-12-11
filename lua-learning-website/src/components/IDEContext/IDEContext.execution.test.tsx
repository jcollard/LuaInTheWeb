import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { IDEContextProvider } from './IDEContext'
import { useIDE } from './useIDE'

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

describe('IDEContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('runCode', () => {
    it('should execute code in Lua engine', async () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="print('test')">{children}</IDEContextProvider>
        ),
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(mockExecute).toHaveBeenCalledWith("print('test')")
    })

    it('should append output to terminal history', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('Hello, World!')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="print('hello')">{children}</IDEContextProvider>
        ),
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(result.current.terminalOutput.map(line => line.text)).toContain('Hello, World!')
    })

    it('should append multiple outputs to terminal history', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('line 1')
        onOutput?.('line 2')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(result.current.terminalOutput.map(line => line.text)).toEqual(['line 1', 'line 2'])
    })

    it('should append error messages to terminal history', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
        onError?.('Error: syntax error')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(result.current.terminalOutput.map(line => line.text)).toContain('Error: syntax error')
    })
  })

  describe('clearTerminal', () => {
    it('should reset terminal output', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('some output')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Add some output
      await act(async () => {
        await result.current.runCode()
      })
      expect(result.current.terminalOutput.length).toBeGreaterThan(0)

      // Act
      act(() => {
        result.current.clearTerminal()
      })

      // Assert
      expect(result.current.terminalOutput).toEqual([])
    })
  })

  describe('input handling', () => {
    it('should provide isAwaitingInput as false initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.isAwaitingInput).toBe(false)
    })

    it('should provide submitInput function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.submitInput).toBeInstanceOf(Function)
    })

    it('should set isAwaitingInput to true when onReadInput is called', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act - simulate io.read() being called (don't await, it will block)
      let inputPromise: Promise<string> | undefined
      act(() => {
        inputPromise = readInputCallback?.()
      })

      // Assert
      expect(result.current.isAwaitingInput).toBe(true)

      // Cleanup - resolve the promise
      act(() => {
        result.current.submitInput('test')
      })
      await inputPromise
    })

    it('should resolve onReadInput promise when submitInput is called', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act - simulate io.read() and submit input
      let resolvedValue: string | undefined
      const inputPromise = readInputCallback?.().then((val) => {
        resolvedValue = val
      })

      act(() => {
        result.current.submitInput('user input')
      })

      await inputPromise

      // Assert
      expect(resolvedValue).toBe('user input')
    })

    it('should set isAwaitingInput to false after submitInput', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Start awaiting input - wrap in act since it causes state update
      let inputPromise: Promise<string> | undefined
      act(() => {
        inputPromise = readInputCallback?.()
      })
      expect(result.current.isAwaitingInput).toBe(true)

      // Act
      act(() => {
        result.current.submitInput('done')
      })
      await inputPromise

      // Assert
      expect(result.current.isAwaitingInput).toBe(false)
    })

    it('should add input prompt to terminal output when awaiting', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      let inputPromise: Promise<string> | undefined
      act(() => {
        inputPromise = readInputCallback?.()
      })

      // Assert - should show input prompt
      expect(result.current.terminalOutput.map(line => line.text)).toContain('> Waiting for input...')

      // Cleanup
      act(() => {
        result.current.submitInput('test')
      })
      await inputPromise
    })
  })
})
