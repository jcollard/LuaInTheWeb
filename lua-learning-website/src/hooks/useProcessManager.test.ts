import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProcessManager } from './useProcessManager'
import type { IProcess } from '@lua-learning/shell-core'

/**
 * Creates a mock process for testing
 */
function createMockProcess(overrides: Partial<IProcess> = {}): IProcess {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: vi.fn().mockReturnValue(false),
    handleInput: vi.fn(),
    onOutput: vi.fn(),
    onError: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  }
}

describe('useProcessManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have no running process initially', () => {
      const { result } = renderHook(() => useProcessManager())

      expect(result.current.isProcessRunning).toBe(false)
      expect(result.current.hasForegroundProcess()).toBe(false)
    })
  })

  describe('startProcess', () => {
    it('should start a process and update isProcessRunning', () => {
      const { result } = renderHook(() => useProcessManager())
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      expect(mockProcess.start).toHaveBeenCalledTimes(1)
      expect(result.current.isProcessRunning).toBe(true)
      expect(result.current.hasForegroundProcess()).toBe(true)
    })

    it('should stop existing process before starting new one', () => {
      const { result } = renderHook(() => useProcessManager())
      const process1 = createMockProcess()
      const process2 = createMockProcess()

      act(() => {
        result.current.startProcess(process1)
      })

      act(() => {
        result.current.startProcess(process2)
      })

      expect(process1.stop).toHaveBeenCalledTimes(1)
      expect(process2.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('stopProcess', () => {
    it('should stop the running process and update isProcessRunning', () => {
      const { result } = renderHook(() => useProcessManager())
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      act(() => {
        result.current.stopProcess()
      })

      expect(mockProcess.stop).toHaveBeenCalledTimes(1)
      expect(result.current.isProcessRunning).toBe(false)
    })

    it('should do nothing if no process is running', () => {
      const { result } = renderHook(() => useProcessManager())

      // Should not throw
      act(() => {
        result.current.stopProcess()
      })

      expect(result.current.isProcessRunning).toBe(false)
    })
  })

  describe('handleInput', () => {
    it('should route input to running process', () => {
      const { result } = renderHook(() => useProcessManager())
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      const handled = result.current.handleInput('test input')

      expect(mockProcess.handleInput).toHaveBeenCalledWith('test input')
      expect(handled).toBe(true)
    })

    it('should return false if no process is running', () => {
      const { result } = renderHook(() => useProcessManager())

      const handled = result.current.handleInput('test input')

      expect(handled).toBe(false)
    })
  })

  describe('process exit', () => {
    it('should update isProcessRunning when process exits naturally', () => {
      const { result } = renderHook(() => useProcessManager())
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      expect(result.current.isProcessRunning).toBe(true)

      // Simulate process exit by calling the onExit callback
      act(() => {
        mockProcess.onExit(0)
      })

      expect(result.current.isProcessRunning).toBe(false)
    })

    it('should call onProcessExit callback when process exits', () => {
      const onProcessExit = vi.fn()
      const { result } = renderHook(() => useProcessManager({ onProcessExit }))
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      act(() => {
        mockProcess.onExit(42)
      })

      expect(onProcessExit).toHaveBeenCalledWith(42)
    })
  })

  describe('output and error callbacks', () => {
    it('should forward process output to onOutput callback', () => {
      const onOutput = vi.fn()
      const { result } = renderHook(() => useProcessManager({ onOutput }))
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      // Simulate process output
      act(() => {
        mockProcess.onOutput('hello world')
      })

      expect(onOutput).toHaveBeenCalledWith('hello world')
    })

    it('should forward process errors to onError callback', () => {
      const onError = vi.fn()
      const { result } = renderHook(() => useProcessManager({ onError }))
      const mockProcess = createMockProcess()

      act(() => {
        result.current.startProcess(mockProcess)
      })

      // Simulate process error
      act(() => {
        mockProcess.onError('error message')
      })

      expect(onError).toHaveBeenCalledWith('error message')
    })
  })
})
