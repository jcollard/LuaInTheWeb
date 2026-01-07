import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasWindowManager } from './useCanvasWindowManager'

describe('useCanvasWindowManager', () => {
  let mockPopupWindow: {
    document: {
      write: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
      getElementById: ReturnType<typeof vi.fn>
    }
    addEventListener: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    closed: boolean
  }
  let mockCanvas: HTMLCanvasElement
  let originalWindowOpen: typeof window.open

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock canvas element
    mockCanvas = document.createElement('canvas')
    mockCanvas.id = 'game-canvas'
    mockCanvas.width = 800
    mockCanvas.height = 600
    mockCanvas.focus = vi.fn()

    // Create mock popup window
    mockPopupWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
        getElementById: vi.fn().mockReturnValue(mockCanvas),
      },
      addEventListener: vi.fn(),
      close: vi.fn(),
      closed: false,
    }

    // Store original window.open
    originalWindowOpen = window.open

    // Mock window.open
    vi.spyOn(window, 'open').mockReturnValue(mockPopupWindow as unknown as Window)
  })

  afterEach(() => {
    // Restore window.open
    window.open = originalWindowOpen
  })

  describe('openCanvasWindow', () => {
    it('should open a popup window with correct parameters', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      expect(window.open).toHaveBeenCalledWith(
        '',
        'canvas-test-canvas-1',
        expect.stringContaining('width=816')
      )
    })

    it('should write HTML content to the popup window', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      expect(mockPopupWindow.document.write).toHaveBeenCalled()
      expect(mockPopupWindow.document.close).toHaveBeenCalled()
    })

    it('should return the canvas element from the popup', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      let canvas: HTMLCanvasElement | null = null
      await act(async () => {
        canvas = await result.current.openCanvasWindow('test-canvas-1')
      })

      expect(canvas).toBe(mockCanvas)
    })

    it('should focus the canvas element', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      expect(mockCanvas.focus).toHaveBeenCalled()
    })

    it('should register beforeunload event listener', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      expect(mockPopupWindow.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('should throw error if popup is blocked', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)

      const { result } = renderHook(() => useCanvasWindowManager())

      await expect(async () => {
        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })
      }).rejects.toThrow('Failed to open popup window')
    })

    it('should throw error if canvas element is not found', async () => {
      mockPopupWindow.document.getElementById = vi.fn().mockReturnValue(null)

      const { result } = renderHook(() => useCanvasWindowManager())

      await expect(async () => {
        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })
      }).rejects.toThrow('Failed to create canvas element')
    })

    it('should close existing window with same ID before opening new one', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      // Open first window
      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      const firstWindowClose = mockPopupWindow.close

      // Open second window with same ID
      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      expect(firstWindowClose).toHaveBeenCalled()
    })
  })

  describe('closeCanvasWindow', () => {
    it('should close an open popup window', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      act(() => {
        result.current.closeCanvasWindow('test-canvas-1')
      })

      expect(mockPopupWindow.close).toHaveBeenCalled()
    })

    it('should not throw when closing non-existent window', () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      expect(() => {
        act(() => {
          result.current.closeCanvasWindow('non-existent')
        })
      }).not.toThrow()
    })
  })

  describe('closeAllWindows', () => {
    it('should close all open popup windows', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())

      // Open multiple windows
      await act(async () => {
        await result.current.openCanvasWindow('canvas-1')
      })

      // Create a new mock for the second window
      const secondMockWindow = {
        ...mockPopupWindow,
        close: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(secondMockWindow as unknown as Window)

      await act(async () => {
        await result.current.openCanvasWindow('canvas-2')
      })

      act(() => {
        result.current.closeAllWindows()
      })

      expect(mockPopupWindow.close).toHaveBeenCalled()
      expect(secondMockWindow.close).toHaveBeenCalled()
    })
  })

  describe('window close handler registration', () => {
    it('should call registered handler when window is closed by user', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const closeHandler = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      act(() => {
        result.current.registerWindowCloseHandler('test-canvas-1', closeHandler)
      })

      // Simulate user closing the window by triggering beforeunload
      const beforeunloadHandler = mockPopupWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1]

      act(() => {
        beforeunloadHandler?.()
      })

      expect(closeHandler).toHaveBeenCalled()
    })

    it('should allow unregistering close handlers', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const closeHandler = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      act(() => {
        result.current.registerWindowCloseHandler('test-canvas-1', closeHandler)
        result.current.unregisterWindowCloseHandler('test-canvas-1')
      })

      // Simulate user closing the window
      const beforeunloadHandler = mockPopupWindow.addEventListener.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1]

      act(() => {
        beforeunloadHandler?.()
      })

      expect(closeHandler).not.toHaveBeenCalled()
    })
  })

  describe('cleanup on unmount', () => {
    it('should close all windows when hook unmounts', async () => {
      const { result, unmount } = renderHook(() => useCanvasWindowManager())

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      unmount()

      expect(mockPopupWindow.close).toHaveBeenCalled()
    })
  })
})
