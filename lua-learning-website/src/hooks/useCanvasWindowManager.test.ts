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
    postMessage: ReturnType<typeof vi.fn>
  }
  let mockCanvas: HTMLCanvasElement
  let originalWindowOpen: typeof window.open
  let originalWindowAddEventListener: typeof window.addEventListener

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
      postMessage: vi.fn(),
    }

    // Store original window.open
    originalWindowOpen = window.open
    originalWindowAddEventListener = window.addEventListener

    // Mock window.open
    vi.spyOn(window, 'open').mockReturnValue(mockPopupWindow as unknown as Window)

    // Mock window.addEventListener
    vi.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    // Restore window.open and addEventListener
    window.open = originalWindowOpen
    window.addEventListener = originalWindowAddEventListener
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

  describe('hot reload mode', () => {
    it('should register reload handler with manual mode by default', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const reloadHandler = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      act(() => {
        result.current.registerWindowReloadHandler('test-canvas-1', reloadHandler)
      })

      // triggerAutoReload should NOT call manual mode handlers
      act(() => {
        result.current.triggerAutoReload()
      })

      expect(reloadHandler).not.toHaveBeenCalled()
    })

    it('should register reload handler with specified hot reload mode', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const reloadHandler = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      act(() => {
        result.current.registerWindowReloadHandler('test-canvas-1', reloadHandler, 'auto')
      })

      // triggerAutoReload should call auto mode handlers
      act(() => {
        result.current.triggerAutoReload()
      })

      expect(reloadHandler).toHaveBeenCalledTimes(1)
    })

    it('should call only auto mode handlers on triggerAutoReload', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const manualHandler = vi.fn()
      const autoHandler = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('canvas-1')
      })

      // Create a new mock for the second window
      const secondMockWindow = {
        ...mockPopupWindow,
        close: vi.fn(),
        document: {
          write: vi.fn(),
          close: vi.fn(),
          getElementById: vi.fn().mockReturnValue(mockCanvas),
        },
        addEventListener: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(secondMockWindow as unknown as Window)

      await act(async () => {
        await result.current.openCanvasWindow('canvas-2')
      })

      act(() => {
        result.current.registerWindowReloadHandler('canvas-1', manualHandler, 'manual')
        result.current.registerWindowReloadHandler('canvas-2', autoHandler, 'auto')
      })

      act(() => {
        result.current.triggerAutoReload()
      })

      expect(manualHandler).not.toHaveBeenCalled()
      expect(autoHandler).toHaveBeenCalledTimes(1)
    })

    it('should call all auto mode handlers when multiple windows are in auto mode', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const autoHandler1 = vi.fn()
      const autoHandler2 = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('canvas-1')
      })

      // Create a new mock for the second window
      const secondMockWindow = {
        ...mockPopupWindow,
        close: vi.fn(),
        document: {
          write: vi.fn(),
          close: vi.fn(),
          getElementById: vi.fn().mockReturnValue(mockCanvas),
        },
        addEventListener: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(secondMockWindow as unknown as Window)

      await act(async () => {
        await result.current.openCanvasWindow('canvas-2')
      })

      act(() => {
        result.current.registerWindowReloadHandler('canvas-1', autoHandler1, 'auto')
        result.current.registerWindowReloadHandler('canvas-2', autoHandler2, 'auto')
      })

      act(() => {
        result.current.triggerAutoReload()
      })

      expect(autoHandler1).toHaveBeenCalledTimes(1)
      expect(autoHandler2).toHaveBeenCalledTimes(1)
    })

    it('should not call handlers after unregister', async () => {
      const { result } = renderHook(() => useCanvasWindowManager())
      const reloadHandler = vi.fn()

      await act(async () => {
        await result.current.openCanvasWindow('test-canvas-1')
      })

      act(() => {
        result.current.registerWindowReloadHandler('test-canvas-1', reloadHandler, 'auto')
        result.current.unregisterWindowReloadHandler('test-canvas-1')
      })

      act(() => {
        result.current.triggerAutoReload()
      })

      expect(reloadHandler).not.toHaveBeenCalled()
    })
  })

  describe('execution controls', () => {
    describe('handler registration', () => {
      it('should register pause handler', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const pauseHandler = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        act(() => {
          result.current.registerWindowPauseHandler('test-canvas-1', pauseHandler)
        })

        // Simulate pause message from popup
        const messageHandler = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'message'
        )?.[1]

        act(() => {
          messageHandler?.({ data: { type: 'canvas-pause' } })
        })

        expect(pauseHandler).toHaveBeenCalled()
      })

      it('should register play handler', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const playHandler = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        act(() => {
          result.current.registerWindowPlayHandler('test-canvas-1', playHandler)
        })

        // Simulate play message from popup
        const messageHandler = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'message'
        )?.[1]

        act(() => {
          messageHandler?.({ data: { type: 'canvas-play' } })
        })

        expect(playHandler).toHaveBeenCalled()
      })

      it('should register stop handler', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const stopHandler = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        act(() => {
          result.current.registerWindowStopHandler('test-canvas-1', stopHandler)
        })

        // Simulate stop message from popup
        const messageHandler = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'message'
        )?.[1]

        act(() => {
          messageHandler?.({ data: { type: 'canvas-stop' } })
        })

        expect(stopHandler).toHaveBeenCalled()
      })

      it('should register step handler', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const stepHandler = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        act(() => {
          result.current.registerWindowStepHandler('test-canvas-1', stepHandler)
        })

        // Simulate step message from popup
        const messageHandler = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'message'
        )?.[1]

        act(() => {
          messageHandler?.({ data: { type: 'canvas-step' } })
        })

        expect(stepHandler).toHaveBeenCalled()
      })
    })

    describe('handler unregistration', () => {
      it('should not call pause handler after unregister', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const pauseHandler = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        act(() => {
          result.current.registerWindowPauseHandler('test-canvas-1', pauseHandler)
          result.current.unregisterWindowExecutionHandlers('test-canvas-1')
        })

        // Simulate pause message from popup
        const messageHandler = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'message'
        )?.[1]

        act(() => {
          messageHandler?.({ data: { type: 'canvas-pause' } })
        })

        expect(pauseHandler).not.toHaveBeenCalled()
      })
    })

    describe('control state updates', () => {
      it('should send control state update to popup window', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const mockPostMessage = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        // Add postMessage to mock window
        const windowState = (result.current as unknown as { windowsRef: { current: Map<string, { window: { postMessage: typeof mockPostMessage } }> } }).windowsRef?.current?.get?.('test-canvas-1')
        if (windowState) {
          windowState.window.postMessage = mockPostMessage
        }
        // Workaround: mock postMessage on the mock popup window
        mockPopupWindow.postMessage = mockPostMessage

        act(() => {
          result.current.updateWindowControlState('test-canvas-1', { isRunning: true, isPaused: false })
        })

        expect(mockPostMessage).toHaveBeenCalledWith(
          { type: 'canvas-control-state', isRunning: true, isPaused: false },
          '*'
        )
      })

      it('should send isPaused=true when game is paused', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())
        const mockPostMessage = vi.fn()

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        mockPopupWindow.postMessage = mockPostMessage

        act(() => {
          result.current.updateWindowControlState('test-canvas-1', { isRunning: true, isPaused: true })
        })

        expect(mockPostMessage).toHaveBeenCalledWith(
          { type: 'canvas-control-state', isRunning: true, isPaused: true },
          '*'
        )
      })
    })

    describe('HTML content includes execution controls', () => {
      it('should include pause button in popup HTML', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        const htmlWritten = mockPopupWindow.document.write.mock.calls[0]?.[0] as string
        expect(htmlWritten).toContain('id="pause-btn"')
      })

      it('should include play button in popup HTML', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        const htmlWritten = mockPopupWindow.document.write.mock.calls[0]?.[0] as string
        expect(htmlWritten).toContain('id="play-btn"')
      })

      it('should include stop button in popup HTML', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        const htmlWritten = mockPopupWindow.document.write.mock.calls[0]?.[0] as string
        expect(htmlWritten).toContain('id="stop-btn"')
      })

      it('should include step button in popup HTML', async () => {
        const { result } = renderHook(() => useCanvasWindowManager())

        await act(async () => {
          await result.current.openCanvasWindow('test-canvas-1')
        })

        const htmlWritten = mockPopupWindow.document.write.mock.calls[0]?.[0] as string
        expect(htmlWritten).toContain('id="step-btn"')
      })
    })
  })
})
