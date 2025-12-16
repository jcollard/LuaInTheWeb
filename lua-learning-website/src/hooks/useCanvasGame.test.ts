/**
 * Tests for useCanvasGame hook.
 * Manages canvas game process lifecycle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasGame } from './useCanvasGame'

// Create mock process instances that track callbacks
interface MockProcess {
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  isRunning: ReturnType<typeof vi.fn>
  getCanvas: () => HTMLCanvasElement
  onOutput: ((text: string) => void) | null
  onError: ((text: string) => void) | null
  onExit: ((code: number) => void) | null
  _canvas: HTMLCanvasElement
}

const mockProcessInstances: MockProcess[] = []

// Mock the canvas-runtime package
vi.mock('@lua-learning/canvas-runtime', () => {
  // Create a mock class
  class MockLuaCanvasProcess {
    start = vi.fn()
    stop = vi.fn()
    isRunning = vi.fn().mockReturnValue(false)
    _canvas: HTMLCanvasElement
    onOutput: ((text: string) => void) | null = null
    onError: ((text: string) => void) | null = null
    onExit: ((code: number) => void) | null = null

    constructor(options: { canvas: HTMLCanvasElement }) {
      this._canvas = options.canvas
      mockProcessInstances.push(this as unknown as MockProcess)
    }

    getCanvas(): HTMLCanvasElement {
      return this._canvas
    }
  }

  return {
    LuaCanvasProcess: MockLuaCanvasProcess,
    isSharedArrayBufferAvailable: vi.fn().mockReturnValue(true),
  }
})

describe('useCanvasGame', () => {
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 800
    mockCanvas.height = 600
    mockProcessInstances.length = 0
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns idle state initially', () => {
      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.state).toBe('idle')
    })

    it('returns isRunning as false initially', () => {
      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.isRunning).toBe(false)
    })

    it('returns null error initially', () => {
      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.error).toBeNull()
    })

    it('returns empty output initially', () => {
      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.output).toBe('')
    })

    it('returns null process initially', () => {
      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.process).toBeNull()
    })
  })

  describe('startGame', () => {
    it('creates a new LuaCanvasProcess with provided code and canvas', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      expect(mockProcessInstances).toHaveLength(1)
      expect(mockProcessInstances[0].getCanvas()).toBe(mockCanvas)
    })

    it('calls start on the process', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]
      expect(mockInstance.start).toHaveBeenCalled()
    })

    it('sets state to running after start', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      expect(result.current.state).toBe('running')
    })

    it('sets isRunning to true after start', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      expect(result.current.isRunning).toBe(true)
    })

    it('stores the process reference', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]
      expect(result.current.process).toBe(mockInstance)
    })

    it('clears previous error when starting new game', () => {
      const { result } = renderHook(() => useCanvasGame())

      // Simulate an error state first
      act(() => {
        result.current.startGame('error code', mockCanvas)
      })

      // Trigger error callback
      const mockInstance = mockProcessInstances[0]
      act(() => {
        mockInstance.onError?.('Some error')
      })

      expect(result.current.error).toBe('Some error')

      // Start new game - error should clear
      act(() => {
        result.current.startGame('new code', mockCanvas)
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('stopGame', () => {
    it('calls stop on the process', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.stopGame()
      })

      expect(mockInstance.stop).toHaveBeenCalled()
    })

    it('sets state to idle after stop', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      act(() => {
        result.current.stopGame()
      })

      expect(result.current.state).toBe('idle')
    })

    it('sets isRunning to false after stop', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      act(() => {
        result.current.stopGame()
      })

      expect(result.current.isRunning).toBe(false)
    })

    it('does nothing if no process is running', () => {
      const { result } = renderHook(() => useCanvasGame())

      // Should not throw
      act(() => {
        result.current.stopGame()
      })

      expect(result.current.state).toBe('idle')
    })
  })

  describe('process callbacks', () => {
    it('accumulates output from onOutput callback', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onOutput?.('Hello ')
      })

      act(() => {
        mockInstance.onOutput?.('World')
      })

      expect(result.current.output).toBe('Hello World')
    })

    it('sets error from onError callback', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onError?.('Runtime error: invalid operation')
      })

      expect(result.current.error).toBe('Runtime error: invalid operation')
    })

    it('sets state to error on onError callback', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onError?.('Runtime error')
      })

      expect(result.current.state).toBe('error')
    })

    it('sets state to idle on onExit callback', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onExit?.(0)
      })

      expect(result.current.state).toBe('idle')
    })

    it('sets isRunning to false on onExit callback', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onExit?.(0)
      })

      expect(result.current.isRunning).toBe(false)
    })

    it('calls external onExit callback if provided', () => {
      const onExit = vi.fn()
      const { result } = renderHook(() => useCanvasGame({ onExit }))

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onExit?.(0)
      })

      expect(onExit).toHaveBeenCalledWith(0)
    })

    it('calls external onOutput callback if provided', () => {
      const onOutput = vi.fn()
      const { result } = renderHook(() => useCanvasGame({ onOutput }))

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onOutput?.('test output')
      })

      expect(onOutput).toHaveBeenCalledWith('test output')
    })

    it('calls external onError callback if provided', () => {
      const onError = vi.fn()
      const { result } = renderHook(() => useCanvasGame({ onError }))

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onError?.('test error')
      })

      expect(onError).toHaveBeenCalledWith('test error')
    })
  })

  describe('mode detection', () => {
    it('returns performance mode when SharedArrayBuffer is available', async () => {
      const { isSharedArrayBufferAvailable } = await import(
        '@lua-learning/canvas-runtime'
      )
      ;(isSharedArrayBufferAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true)

      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.mode).toBe('performance')
    })

    it('returns compatibility mode when SharedArrayBuffer is not available', async () => {
      const { isSharedArrayBufferAvailable } = await import(
        '@lua-learning/canvas-runtime'
      )
      ;(isSharedArrayBufferAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        false
      )

      const { result } = renderHook(() => useCanvasGame())
      expect(result.current.mode).toBe('compatibility')
    })
  })

  describe('cleanup', () => {
    it('stops the process on unmount if running', () => {
      const { result, unmount } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      unmount()

      expect(mockInstance.stop).toHaveBeenCalled()
    })

    it('does not throw on unmount if no process running', () => {
      const { unmount } = renderHook(() => useCanvasGame())

      // Should not throw
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('clearOutput', () => {
    it('clears accumulated output', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onOutput?.('Some output')
      })

      expect(result.current.output).toBe('Some output')

      act(() => {
        result.current.clearOutput()
      })

      expect(result.current.output).toBe('')
    })
  })

  describe('clearError', () => {
    it('clears error and resets state to idle if in error state', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        mockInstance.onError?.('Some error')
      })

      expect(result.current.error).toBe('Some error')
      expect(result.current.state).toBe('error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.state).toBe('idle')
    })
  })
})
