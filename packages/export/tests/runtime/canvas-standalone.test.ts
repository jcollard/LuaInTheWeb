/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the lua-runtime package to avoid resolution issues
vi.mock('@lua-learning/lua-runtime', () => ({
  canvasLuaCoreCode: '',
  canvasLuaPathCode: '',
  canvasLuaStylingCode: '',
  canvasLuaTextCode: '',
  canvasLuaInputCode: '',
  canvasLuaAudioCode: '',
  LUA_HC_CODE: '',
  LUA_LOCALSTORAGE_CODE: '',
}))

import {
  setupInputListeners,
  setupCanvasBridge,
  createCanvasRuntimeState,
  type CanvasRuntimeState,
} from '../../src/runtime/canvas-standalone'

// Mock CanvasGradient for caching tests
function createMockGradient(): CanvasGradient {
  return {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient
}

// Mock LuaEngine
interface MockLuaEngine {
  global: {
    set: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
  }
  registeredFunctions: Map<string, (...args: unknown[]) => unknown>
}

function createMockLuaEngine(): MockLuaEngine {
  const registeredFunctions = new Map<string, (...args: unknown[]) => unknown>()
  return {
    global: {
      set: vi.fn((name: string, fn: (...args: unknown[]) => unknown) => {
        registeredFunctions.set(name, fn)
      }),
      get: vi.fn((name: string) => registeredFunctions.get(name)),
    },
    registeredFunctions,
  }
}

describe('canvas-standalone', () => {
  describe('setupInputListeners', () => {
    let canvas: HTMLCanvasElement
    let state: CanvasRuntimeState
    let cleanup: (() => void) | null = null

    afterEach(() => {
      cleanup?.()
      cleanup = null
    })

    beforeEach(() => {
      // Create a mock canvas element
      canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600

      // Create a minimal state object for testing setupInputListeners
      // We only need the canvas property for input listener tests
      state = {
        canvas,
        ctx: {} as CanvasRenderingContext2D,
        isRunning: false,
        tickCallback: null,
        lastFrameTime: 0,
        deltaTime: 0,
        totalTime: 0,
        keysDown: new Set<string>(),
        keysPressed: new Set<string>(),
        keysDownArray: [],
        keysPressedArray: [],
        keysDownDirty: true,
        keysPressedDirty: true,
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: new Set<number>(),
        mouseButtonsPressed: new Set<number>(),
        currentFontSize: 16,
        currentFontFamily: 'monospace',
        stopResolve: null,
        audioAssets: new Map(),
        previousGamepadButtons: [[], [], [], []],
        currentGamepadStates: [
          { connected: false, id: '', buttons: [], buttonsPressed: [], axes: [] },
          { connected: false, id: '', buttons: [], buttonsPressed: [], axes: [] },
          { connected: false, id: '', buttons: [], buttonsPressed: [], axes: [] },
          { connected: false, id: '', buttons: [], buttonsPressed: [], axes: [] },
        ],
        pathRegistry: new Map(),
        nextPathId: 1,
        imageDataStore: new Map(),
        nextImageDataId: 1,
        gradientCache: new Map(),
        lineDashCache: null,
        lineDashSegments: [],
      }
    })

    describe('drag prevention', () => {
      it('should prevent default on mousedown', () => {
        cleanup = setupInputListeners(state)

        const event = new MouseEvent('mousedown', {
          button: 0,
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        canvas.dispatchEvent(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })

      it('should prevent default on dragstart', () => {
        cleanup = setupInputListeners(state)

        const event = new Event('dragstart', {
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        canvas.dispatchEvent(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })

      it('should remove dragstart listener on cleanup', () => {
        cleanup = setupInputListeners(state)

        cleanup()
        cleanup = null

        const event = new Event('dragstart', {
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        canvas.dispatchEvent(event)

        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })
    })

    describe('keyboard preventDefault', () => {
      it('should call preventDefault on keydown for regular keys', () => {
        cleanup = setupInputListeners(state)

        const event = new KeyboardEvent('keydown', {
          code: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })

      it('should call preventDefault on keyup for regular keys', () => {
        cleanup = setupInputListeners(state)

        const event = new KeyboardEvent('keyup', {
          code: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })

      it('should NOT call preventDefault on keydown when ctrlKey is true', () => {
        cleanup = setupInputListeners(state)

        const event = new KeyboardEvent('keydown', {
          code: 'KeyA',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })

      it('should NOT call preventDefault on keydown when metaKey is true', () => {
        cleanup = setupInputListeners(state)

        const event = new KeyboardEvent('keydown', {
          code: 'KeyA',
          metaKey: true,
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })

      it('should NOT call preventDefault on keyup when ctrlKey is true', () => {
        cleanup = setupInputListeners(state)

        const event = new KeyboardEvent('keyup', {
          code: 'KeyA',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })

      it('should NOT call preventDefault on keyup when metaKey is true', () => {
        cleanup = setupInputListeners(state)

        const event = new KeyboardEvent('keyup', {
          code: 'KeyA',
          metaKey: true,
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })

      it('should NOT call preventDefault on keydown for browser-reserved keys (F11, F12)', () => {
        cleanup = setupInputListeners(state)

        const keys = ['F11', 'F12']
        for (const code of keys) {
          const event = new KeyboardEvent('keydown', {
            code,
            bubbles: true,
            cancelable: true,
          })
          const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

          document.dispatchEvent(event)

          expect(preventDefaultSpy).not.toHaveBeenCalled()
        }
      })

      it('should NOT call preventDefault on keyup for browser-reserved keys (F11, F12)', () => {
        cleanup = setupInputListeners(state)

        const keys = ['F11', 'F12']
        for (const code of keys) {
          const event = new KeyboardEvent('keyup', {
            code,
            bubbles: true,
            cancelable: true,
          })
          const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

          document.dispatchEvent(event)

          expect(preventDefaultSpy).not.toHaveBeenCalled()
        }
      })

      it('should not call preventDefault on keydown after cleanup', () => {
        cleanup = setupInputListeners(state)

        cleanup()
        cleanup = null

        const event = new KeyboardEvent('keydown', {
          code: 'Tab',
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        document.dispatchEvent(event)

        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })
    })

    describe('contextmenu handling', () => {
      it('should prevent the browser context menu on right-click', () => {
        cleanup = setupInputListeners(state)

        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        canvas.dispatchEvent(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })

      it('should remove contextmenu listener when cleanup is called', () => {
        cleanup = setupInputListeners(state)

        // Call cleanup
        cleanup()
        cleanup = null

        // Create a new event after cleanup
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        canvas.dispatchEvent(event)

        // preventDefault should NOT be called after cleanup
        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('gradient caching (Issue #605)', () => {
    let canvas: HTMLCanvasElement
    let state: CanvasRuntimeState
    let mockEngine: MockLuaEngine
    let mockCtx: CanvasRenderingContext2D

    beforeEach(() => {
      // Create a mock canvas element
      canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600

      // Create mock context with spied gradient creation methods
      mockCtx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 100 }),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '16px monospace',
        textBaseline: 'top' as CanvasTextBaseline,
        textAlign: 'start' as CanvasTextAlign,
        direction: 'ltr' as CanvasDirection,
        lineCap: 'butt' as CanvasLineCap,
        lineJoin: 'miter' as CanvasLineJoin,
        miterLimit: 10,
        lineDashOffset: 0,
        setLineDash: vi.fn(),
        getLineDash: vi.fn().mockReturnValue([]),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        closePath: vi.fn(),
        arcTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        ellipse: vi.fn(),
        roundRect: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        isPointInPath: vi.fn().mockReturnValue(false),
        isPointInStroke: vi.fn().mockReturnValue(false),
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
        imageSmoothingEnabled: true,
        filter: 'none',
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(16),
          width: 2,
          height: 2,
        }),
        putImageData: vi.fn(),
        createLinearGradient: vi.fn(),
        createRadialGradient: vi.fn(),
        createConicGradient: vi.fn(),
        createPattern: vi.fn(),
      } as unknown as CanvasRenderingContext2D

      // Mock canvas.getContext to return our mock context
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx)

      // Create state using the factory function
      state = createCanvasRuntimeState(canvas)

      // Create mock engine
      mockEngine = createMockLuaEngine()

      // Setup the canvas bridge
      setupCanvasBridge(mockEngine as unknown as import('wasmoon').LuaEngine, state)
    })

    describe('linear gradient caching', () => {
      it('should cache linear gradients with same definition', () => {
        const mockGradient = createMockGradient()
        ;(mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient)

        const gradientDef = {
          type: 'linear',
          x0: 0,
          y0: 0,
          x1: 100,
          y1: 0,
          stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
          ],
        }

        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!

        // Call setFillStyle multiple times with same gradient
        setFillStyle(gradientDef)
        setFillStyle(gradientDef)
        setFillStyle(gradientDef)

        // Should only create gradient once due to caching
        expect(mockCtx.createLinearGradient).toHaveBeenCalledTimes(1)
      })

      it('should create new gradient for different linear gradient definitions', () => {
        const mockGradient1 = createMockGradient()
        const mockGradient2 = createMockGradient()
        ;(mockCtx.createLinearGradient as ReturnType<typeof vi.fn>)
          .mockReturnValueOnce(mockGradient1)
          .mockReturnValueOnce(mockGradient2)

        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!

        setFillStyle({
          type: 'linear',
          x0: 0,
          y0: 0,
          x1: 100,
          y1: 0,
          stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }],
        })

        setFillStyle({
          type: 'linear',
          x0: 0,
          y0: 0,
          x1: 200, // Different x1
          y1: 0,
          stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }],
        })

        // Should create two different gradients
        expect(mockCtx.createLinearGradient).toHaveBeenCalledTimes(2)
      })
    })

    describe('radial gradient caching', () => {
      it('should cache radial gradients with same definition', () => {
        const mockGradient = createMockGradient()
        ;(mockCtx.createRadialGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient)

        const gradientDef = {
          type: 'radial',
          x0: 100,
          y0: 100,
          r0: 0,
          x1: 100,
          y1: 100,
          r1: 50,
          stops: [
            { offset: 0, color: 'white' },
            { offset: 1, color: 'black' },
          ],
        }

        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!
        const setStrokeStyle = mockEngine.registeredFunctions.get('__canvas_setStrokeStyle')!

        // Call with same gradient on both fill and stroke
        setFillStyle(gradientDef)
        setStrokeStyle(gradientDef)

        // Should only create gradient once due to caching
        expect(mockCtx.createRadialGradient).toHaveBeenCalledTimes(1)
      })
    })

    describe('conic gradient caching', () => {
      it('should cache conic gradients with same definition', () => {
        const mockGradient = createMockGradient()
        ;(mockCtx.createConicGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient)

        const gradientDef = {
          type: 'conic',
          startAngle: 0,
          x: 200,
          y: 200,
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        }

        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!

        setFillStyle(gradientDef)
        setFillStyle(gradientDef)

        // Should only create gradient once due to caching
        expect(mockCtx.createConicGradient).toHaveBeenCalledTimes(1)
      })
    })

    describe('cache clearing', () => {
      it('should clear gradient cache on __canvas_clear', () => {
        const mockGradient = createMockGradient()
        ;(mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient)

        const gradientDef = {
          type: 'linear',
          x0: 0,
          y0: 0,
          x1: 100,
          y1: 0,
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        }

        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!
        const clear = mockEngine.registeredFunctions.get('__canvas_clear')!

        // Set gradient, clear, then set same gradient again
        setFillStyle(gradientDef)
        clear()
        setFillStyle(gradientDef)

        // Should create gradient twice because cache was cleared
        expect(mockCtx.createLinearGradient).toHaveBeenCalledTimes(2)
      })

      it('should not clear gradient cache on __canvas_clearRect', () => {
        const mockGradient = createMockGradient()
        ;(mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient)

        const gradientDef = {
          type: 'linear',
          x0: 0,
          y0: 0,
          x1: 100,
          y1: 0,
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        }

        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!
        const clearRect = mockEngine.registeredFunctions.get('__canvas_clearRect')!

        // Set gradient, clearRect, then set same gradient again
        setFillStyle(gradientDef)
        clearRect(0, 0, 100, 100)
        setFillStyle(gradientDef)

        // Should only create gradient once (clearRect doesn't clear cache)
        expect(mockCtx.createLinearGradient).toHaveBeenCalledTimes(1)
      })
    })

    describe('string styles', () => {
      it('should handle string styles without caching', () => {
        const setFillStyle = mockEngine.registeredFunctions.get('__canvas_setFillStyle')!
        const setStrokeStyle = mockEngine.registeredFunctions.get('__canvas_setStrokeStyle')!

        setFillStyle('#ff0000')
        setStrokeStyle('blue')

        // String styles should just set directly without gradient creation
        expect(mockCtx.createLinearGradient).not.toHaveBeenCalled()
        expect(mockCtx.createRadialGradient).not.toHaveBeenCalled()
        expect(mockCtx.createConicGradient).not.toHaveBeenCalled()
      })
    })
  })

  describe('line dash caching (Issue #607)', () => {
    let canvas: HTMLCanvasElement
    let state: CanvasRuntimeState
    let mockEngine: MockLuaEngine
    let mockCtx: CanvasRenderingContext2D

    beforeEach(() => {
      // Create a mock canvas element
      canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600

      // Create mock context
      mockCtx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 100 }),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '16px monospace',
        textBaseline: 'top' as CanvasTextBaseline,
        textAlign: 'start' as CanvasTextAlign,
        direction: 'ltr' as CanvasDirection,
        lineCap: 'butt' as CanvasLineCap,
        lineJoin: 'miter' as CanvasLineJoin,
        miterLimit: 10,
        lineDashOffset: 0,
        setLineDash: vi.fn(),
        getLineDash: vi.fn().mockReturnValue([]),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        closePath: vi.fn(),
        arcTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        ellipse: vi.fn(),
        roundRect: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        isPointInPath: vi.fn().mockReturnValue(false),
        isPointInStroke: vi.fn().mockReturnValue(false),
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
        imageSmoothingEnabled: true,
        filter: 'none',
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(16),
          width: 2,
          height: 2,
        }),
        putImageData: vi.fn(),
        createLinearGradient: vi.fn(),
        createRadialGradient: vi.fn(),
        createConicGradient: vi.fn(),
        createPattern: vi.fn(),
      } as unknown as CanvasRenderingContext2D

      // Mock canvas.getContext to return our mock context
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx)

      // Create state using the factory function
      state = createCanvasRuntimeState(canvas)

      // Create mock engine
      mockEngine = createMockLuaEngine()

      // Setup the canvas bridge
      setupCanvasBridge(mockEngine as unknown as import('wasmoon').LuaEngine, state)
    })

    describe('setLineDash', () => {
      it('should store a copy of segments and pass it to canvas context', () => {
        const setLineDash = mockEngine.registeredFunctions.get('__canvas_setLineDash')!

        setLineDash([5, 10, 15])

        // Should have called ctx.setLineDash with the segments
        expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 10, 15])
        // Should have stored segments in state
        expect(state.lineDashSegments).toEqual([5, 10, 15])
        // Cache should be invalidated
        expect(state.lineDashCache).toBeNull()
      })

      it('should store a defensive copy (not reference to original)', () => {
        const setLineDash = mockEngine.registeredFunctions.get('__canvas_setLineDash')!

        const originalSegments = [5, 10]
        setLineDash(originalSegments)

        // Modify original array
        originalSegments.push(15)

        // State should have the original values
        expect(state.lineDashSegments).toEqual([5, 10])
      })

      it('should handle Lua table proxy (1-indexed object without length)', () => {
        const setLineDash = mockEngine.registeredFunctions.get('__canvas_setLineDash')!

        // Simulate a Lua table proxy - 1-indexed object without .length
        const luaTableProxy = { 1: 10, 2: 5, 3: 15 } as unknown as number[]

        setLineDash(luaTableProxy)

        // Should convert to proper JS array
        expect(state.lineDashSegments).toEqual([10, 5, 15])
        expect(mockCtx.setLineDash).toHaveBeenCalledWith([10, 5, 15])
      })

      it('should handle empty Lua table proxy', () => {
        const setLineDash = mockEngine.registeredFunctions.get('__canvas_setLineDash')!

        // Empty Lua table proxy
        const emptyLuaTable = {} as unknown as number[]

        setLineDash(emptyLuaTable)

        expect(state.lineDashSegments).toEqual([])
        expect(mockCtx.setLineDash).toHaveBeenCalledWith([])
      })
    })

    describe('getLineDash', () => {
      it('should return cached array on repeated calls', () => {
        const setLineDash = mockEngine.registeredFunctions.get('__canvas_setLineDash')!
        const getLineDash = mockEngine.registeredFunctions.get('__canvas_getLineDash')!

        setLineDash([5, 10])

        const result1 = getLineDash()
        const result2 = getLineDash()
        const result3 = getLineDash()

        // Should return the same array reference (cached)
        expect(result1).toBe(result2)
        expect(result2).toBe(result3)
        expect(result1).toEqual([5, 10])
      })

      it('should rebuild cache after setLineDash invalidates it', () => {
        const setLineDash = mockEngine.registeredFunctions.get('__canvas_setLineDash')!
        const getLineDash = mockEngine.registeredFunctions.get('__canvas_getLineDash')!

        setLineDash([5, 10])
        const result1 = getLineDash()

        setLineDash([20, 30])
        const result2 = getLineDash()

        // Should be different arrays
        expect(result1).not.toBe(result2)
        expect(result1).toEqual([5, 10])
        expect(result2).toEqual([20, 30])
      })

      it('should return empty array when no line dash set', () => {
        const getLineDash = mockEngine.registeredFunctions.get('__canvas_getLineDash')!

        const result = getLineDash()

        expect(result).toEqual([])
      })
    })
  })
})
