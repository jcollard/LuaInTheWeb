/**
 * Tests for useCanvasGame hook control methods.
 * Tests reload, pause, resume, and step functionality.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasGame } from './useCanvasGame'

// Create mock process instances that track callbacks
interface MockProcess {
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
  reload: ReturnType<typeof vi.fn>
  step: ReturnType<typeof vi.fn>
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
    pause = vi.fn()
    resume = vi.fn()
    reload = vi.fn()
    step = vi.fn()
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

describe('useCanvasGame control methods', () => {
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

  describe('reloadGame', () => {
    it('calls reload on the process', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.reloadGame()
      })

      expect(mockInstance.reload).toHaveBeenCalled()
    })

    it('does nothing if no process is running', () => {
      const { result } = renderHook(() => useCanvasGame())

      // Should not throw when no process exists
      act(() => {
        result.current.reloadGame()
      })

      expect(result.current.state).toBe('idle')
    })

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.reloadGame()
      })

      act(() => {
        result.current.reloadGame()
      })

      act(() => {
        result.current.reloadGame()
      })

      expect(mockInstance.reload).toHaveBeenCalledTimes(3)
    })

    it('does not change running state', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      expect(result.current.state).toBe('running')

      act(() => {
        result.current.reloadGame()
      })

      expect(result.current.state).toBe('running')
    })
  })

  describe('pauseGame', () => {
    it('calls pause on the process', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.pauseGame()
      })

      expect(mockInstance.pause).toHaveBeenCalled()
    })

    it('sets isPaused to true', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      expect(result.current.isPaused).toBe(false)

      act(() => {
        result.current.pauseGame()
      })

      expect(result.current.isPaused).toBe(true)
    })
  })

  describe('resumeGame', () => {
    it('calls resume on the process', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.pauseGame()
      })

      act(() => {
        result.current.resumeGame()
      })

      expect(mockInstance.resume).toHaveBeenCalled()
    })

    it('sets isPaused to false', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      act(() => {
        result.current.pauseGame()
      })

      expect(result.current.isPaused).toBe(true)

      act(() => {
        result.current.resumeGame()
      })

      expect(result.current.isPaused).toBe(false)
    })
  })

  describe('stepGame', () => {
    it('calls step on the process', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.stepGame()
      })

      expect(mockInstance.step).toHaveBeenCalled()
    })

    it('does nothing if no process is running', () => {
      const { result } = renderHook(() => useCanvasGame())

      // Should not throw when no process exists
      act(() => {
        result.current.stepGame()
      })

      expect(result.current.state).toBe('idle')
    })

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      const mockInstance = mockProcessInstances[0]

      act(() => {
        result.current.stepGame()
      })

      act(() => {
        result.current.stepGame()
      })

      act(() => {
        result.current.stepGame()
      })

      expect(mockInstance.step).toHaveBeenCalledTimes(3)
    })

    it('keeps isPaused true after stepping', () => {
      const { result } = renderHook(() => useCanvasGame())

      act(() => {
        result.current.startGame('print("hello")', mockCanvas)
      })

      act(() => {
        result.current.pauseGame()
      })

      expect(result.current.isPaused).toBe(true)

      act(() => {
        result.current.stepGame()
      })

      // Step should keep paused state true
      expect(result.current.isPaused).toBe(true)
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
