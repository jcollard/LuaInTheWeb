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
  type CanvasRuntimeState,
} from '../../src/runtime/canvas-standalone'

describe('canvas-standalone', () => {
  describe('setupInputListeners', () => {
    let canvas: HTMLCanvasElement
    let state: CanvasRuntimeState

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
      }
    })

    describe('contextmenu handling', () => {
      it('should prevent the browser context menu on right-click', () => {
        setupInputListeners(state)

        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        canvas.dispatchEvent(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })

      it('should remove contextmenu listener when cleanup is called', () => {
        const cleanup = setupInputListeners(state)

        // Call cleanup
        cleanup()

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
})
