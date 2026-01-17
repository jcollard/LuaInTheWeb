/**
 * Tests for InputAPI class - Input facade wrapping InputCapture.
 * Follows TDD methodology: tests written before implementation.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputAPI } from '../src/InputAPI'
import type { InputState, GamepadState } from '@lua-learning/canvas-runtime'

/**
 * Mock InputCapture interface for testing.
 * Matches the subset of InputCapture methods used by InputAPI.
 */
interface MockInputCapture {
  isKeyDown: ReturnType<typeof vi.fn>
  isKeyPressed: ReturnType<typeof vi.fn>
  getKeysDown: ReturnType<typeof vi.fn>
  getInputState: ReturnType<typeof vi.fn>
  getMousePosition: ReturnType<typeof vi.fn>
  isMouseButtonDown: ReturnType<typeof vi.fn>
  isMouseButtonPressed: ReturnType<typeof vi.fn>
  getConnectedGamepadCount: ReturnType<typeof vi.fn>
}

/**
 * Creates an empty gamepad state for testing.
 */
function createEmptyGamepadState(): GamepadState {
  return {
    connected: false,
    id: '',
    buttons: new Array(17).fill(0),
    buttonsPressed: [],
    axes: new Array(4).fill(0),
  }
}

/**
 * Creates an empty input state for testing.
 */
function createEmptyInputState(): InputState {
  return {
    keysDown: [],
    keysPressed: [],
    mouseX: 0,
    mouseY: 0,
    mouseButtonsDown: [],
    mouseButtonsPressed: [],
    gamepads: [
      createEmptyGamepadState(),
      createEmptyGamepadState(),
      createEmptyGamepadState(),
      createEmptyGamepadState(),
    ],
  }
}

/**
 * Creates a mock InputCapture for testing.
 */
function createMockInputCapture(): MockInputCapture {
  return {
    isKeyDown: vi.fn().mockReturnValue(false),
    isKeyPressed: vi.fn().mockReturnValue(false),
    getKeysDown: vi.fn().mockReturnValue(new Set<string>()),
    getInputState: vi.fn().mockReturnValue(createEmptyInputState()),
    getMousePosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    isMouseButtonDown: vi.fn().mockReturnValue(false),
    isMouseButtonPressed: vi.fn().mockReturnValue(false),
    getConnectedGamepadCount: vi.fn().mockReturnValue(0),
  }
}

describe('InputAPI', () => {
  let mockInputCapture: MockInputCapture

  beforeEach(() => {
    mockInputCapture = createMockInputCapture()
  })

  describe('construction', () => {
    it('should construct with no arguments', () => {
      const inputAPI = new InputAPI()
      expect(inputAPI).toBeDefined()
    })

    it('should construct with null InputCapture', () => {
      const inputAPI = new InputAPI(null)
      expect(inputAPI).toBeDefined()
    })

    it('should construct with undefined InputCapture', () => {
      const inputAPI = new InputAPI(undefined)
      expect(inputAPI).toBeDefined()
    })

    it('should construct with valid InputCapture', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      expect(inputAPI).toBeDefined()
    })
  })

  describe('setInputCapture', () => {
    it('should allow setting InputCapture after construction', () => {
      const inputAPI = new InputAPI()
      inputAPI.setInputCapture(mockInputCapture)
      mockInputCapture.isKeyDown.mockReturnValue(true)
      expect(inputAPI.isKeyDown('KeyA')).toBe(true)
    })

    it('should allow setting InputCapture to null', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      inputAPI.setInputCapture(null)
      expect(inputAPI.isKeyDown('KeyA')).toBe(false)
    })

    it('should allow replacing InputCapture', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      const newMockCapture = createMockInputCapture()
      newMockCapture.isKeyDown.mockReturnValue(true)
      inputAPI.setInputCapture(newMockCapture)
      expect(inputAPI.isKeyDown('KeyA')).toBe(true)
      expect(mockInputCapture.isKeyDown).not.toHaveBeenCalled()
    })
  })

  describe('keyboard methods', () => {
    describe('isKeyDown', () => {
      it('should return false when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.isKeyDown('KeyA')).toBe(false)
      })

      it('should delegate to InputCapture.isKeyDown', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isKeyDown.mockReturnValue(true)
        expect(inputAPI.isKeyDown('KeyA')).toBe(true)
        expect(mockInputCapture.isKeyDown).toHaveBeenCalledWith('KeyA')
      })

      it('should return false when key is not down', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isKeyDown.mockReturnValue(false)
        expect(inputAPI.isKeyDown('KeyB')).toBe(false)
      })
    })

    describe('isKeyPressed', () => {
      it('should return false when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.isKeyPressed('KeyA')).toBe(false)
      })

      it('should delegate to InputCapture.isKeyPressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isKeyPressed.mockReturnValue(true)
        expect(inputAPI.isKeyPressed('KeyA')).toBe(true)
        expect(mockInputCapture.isKeyPressed).toHaveBeenCalledWith('KeyA')
      })

      it('should return false when key is not pressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isKeyPressed.mockReturnValue(false)
        expect(inputAPI.isKeyPressed('KeyB')).toBe(false)
      })
    })

    describe('getKeysDown', () => {
      it('should return empty array when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getKeysDown()).toEqual([])
      })

      it('should convert Set to array from InputCapture', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.getKeysDown.mockReturnValue(new Set(['KeyA', 'KeyB']))
        expect(inputAPI.getKeysDown()).toEqual(['KeyA', 'KeyB'])
      })

      it('should return empty array when no keys are down', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.getKeysDown.mockReturnValue(new Set())
        expect(inputAPI.getKeysDown()).toEqual([])
      })
    })

    describe('getKeysPressed', () => {
      it('should return empty array when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getKeysPressed()).toEqual([])
      })

      it('should return keysPressed from input state', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.keysPressed = ['KeyA', 'KeyB']
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getKeysPressed()).toEqual(['KeyA', 'KeyB'])
      })

      it('should return empty array when no keys are pressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getKeysPressed()).toEqual([])
      })
    })
  })

  describe('mouse methods', () => {
    describe('getMouseX', () => {
      it('should return 0 when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getMouseX()).toBe(0)
      })

      it('should return mouse X position from InputCapture', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.getMousePosition.mockReturnValue({ x: 100, y: 50 })
        expect(inputAPI.getMouseX()).toBe(100)
      })
    })

    describe('getMouseY', () => {
      it('should return 0 when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getMouseY()).toBe(0)
      })

      it('should return mouse Y position from InputCapture', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.getMousePosition.mockReturnValue({ x: 100, y: 50 })
        expect(inputAPI.getMouseY()).toBe(50)
      })
    })

    describe('isMouseButtonDown', () => {
      it('should return false when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.isMouseButtonDown(0)).toBe(false)
      })

      it('should delegate to InputCapture.isMouseButtonDown', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isMouseButtonDown.mockReturnValue(true)
        expect(inputAPI.isMouseButtonDown(0)).toBe(true)
        expect(mockInputCapture.isMouseButtonDown).toHaveBeenCalledWith(0)
      })

      it('should work with right mouse button', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isMouseButtonDown.mockReturnValue(true)
        expect(inputAPI.isMouseButtonDown(2)).toBe(true)
        expect(mockInputCapture.isMouseButtonDown).toHaveBeenCalledWith(2)
      })
    })

    describe('isMouseButtonPressed', () => {
      it('should return false when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.isMouseButtonPressed(0)).toBe(false)
      })

      it('should delegate to InputCapture.isMouseButtonPressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isMouseButtonPressed.mockReturnValue(true)
        expect(inputAPI.isMouseButtonPressed(0)).toBe(true)
        expect(mockInputCapture.isMouseButtonPressed).toHaveBeenCalledWith(0)
      })

      it('should work with middle mouse button', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.isMouseButtonPressed.mockReturnValue(true)
        expect(inputAPI.isMouseButtonPressed(1)).toBe(true)
        expect(mockInputCapture.isMouseButtonPressed).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('getInputState', () => {
    it('should return empty input state when InputCapture is null', () => {
      const inputAPI = new InputAPI(null)
      const state = inputAPI.getInputState()
      expect(state.keysDown).toEqual([])
      expect(state.keysPressed).toEqual([])
      expect(state.mouseX).toBe(0)
      expect(state.mouseY).toBe(0)
      expect(state.mouseButtonsDown).toEqual([])
      expect(state.mouseButtonsPressed).toEqual([])
      expect(state.gamepads).toHaveLength(4)
      expect(state.gamepads[0].connected).toBe(false)
    })

    it('should delegate to InputCapture.getInputState', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      const expectedState = createEmptyInputState()
      expectedState.keysDown = ['KeyA']
      expectedState.mouseX = 100
      mockInputCapture.getInputState.mockReturnValue(expectedState)
      const state = inputAPI.getInputState()
      expect(state).toBe(expectedState)
    })
  })

  describe('gamepad methods', () => {
    describe('getGamepadCount', () => {
      it('should return 0 when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getGamepadCount()).toBe(0)
      })

      it('should delegate to InputCapture.getConnectedGamepadCount', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        mockInputCapture.getConnectedGamepadCount.mockReturnValue(2)
        expect(inputAPI.getGamepadCount()).toBe(2)
      })
    })

    describe('isGamepadConnected', () => {
      it('should return false when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.isGamepadConnected(0)).toBe(false)
      })

      it('should return true when gamepad is connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.isGamepadConnected(0)).toBe(true)
      })

      it('should return false when gamepad is not connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.isGamepadConnected(0)).toBe(false)
      })

      it('should return false for negative index', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.isGamepadConnected(-1)).toBe(false)
      })

      it('should return false for index out of bounds', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.isGamepadConnected(4)).toBe(false)
      })
    })

    describe('getGamepadButton', () => {
      it('should return 0 when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getGamepadButton(0, 0)).toBe(0)
      })

      it('should return button value when gamepad is connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        state.gamepads[0].buttons[0] = 0.75
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getGamepadButton(0, 0)).toBe(0.75)
      })

      it('should return 0 when gamepad is not connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getGamepadButton(0, 0)).toBe(0)
      })

      it('should return 0 for negative gamepad index', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getGamepadButton(-1, 0)).toBe(0)
      })

      it('should return 0 for gamepad index out of bounds', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getGamepadButton(4, 0)).toBe(0)
      })

      it('should return 0 for negative button index', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getGamepadButton(0, -1)).toBe(0)
      })

      it('should return 0 for button index out of bounds', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getGamepadButton(0, 17)).toBe(0)
      })
    })

    describe('isGamepadButtonPressed', () => {
      it('should return false when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.isGamepadButtonPressed(0, 0)).toBe(false)
      })

      it('should return true when button is in buttonsPressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        state.gamepads[0].buttonsPressed = [0, 2]
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.isGamepadButtonPressed(0, 0)).toBe(true)
        expect(inputAPI.isGamepadButtonPressed(0, 2)).toBe(true)
      })

      it('should return false when button is not in buttonsPressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        state.gamepads[0].buttonsPressed = [0]
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.isGamepadButtonPressed(0, 1)).toBe(false)
      })

      it('should return false when gamepad is not connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.isGamepadButtonPressed(0, 0)).toBe(false)
      })

      it('should return false when gamepad is not connected even if button is in buttonsPressed', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = false
        state.gamepads[0].buttonsPressed = [0, 1, 2]
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.isGamepadButtonPressed(0, 0)).toBe(false)
      })

      it('should return false for negative gamepad index', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.isGamepadButtonPressed(-1, 0)).toBe(false)
      })

      it('should return false for gamepad index out of bounds', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.isGamepadButtonPressed(4, 0)).toBe(false)
      })
    })

    describe('getGamepadAxis', () => {
      it('should return 0 when InputCapture is null', () => {
        const inputAPI = new InputAPI(null)
        expect(inputAPI.getGamepadAxis(0, 0)).toBe(0)
      })

      it('should return axis value when gamepad is connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        state.gamepads[0].axes[0] = -0.5
        state.gamepads[0].axes[1] = 0.75
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getGamepadAxis(0, 0)).toBe(-0.5)
        expect(inputAPI.getGamepadAxis(0, 1)).toBe(0.75)
      })

      it('should return 0 when gamepad is not connected', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getGamepadAxis(0, 0)).toBe(0)
      })

      it('should return 0 for negative gamepad index', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getGamepadAxis(-1, 0)).toBe(0)
      })

      it('should return 0 for gamepad index out of bounds', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        expect(inputAPI.getGamepadAxis(4, 0)).toBe(0)
      })

      it('should return 0 for negative axis index', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getGamepadAxis(0, -1)).toBe(0)
      })

      it('should return 0 for axis index out of bounds', () => {
        const inputAPI = new InputAPI(mockInputCapture)
        const state = createEmptyInputState()
        state.gamepads[0].connected = true
        mockInputCapture.getInputState.mockReturnValue(state)
        expect(inputAPI.getGamepadAxis(0, 4)).toBe(0)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle multiple gamepads', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      const state = createEmptyInputState()
      state.gamepads[0].connected = true
      state.gamepads[0].buttons[0] = 1
      state.gamepads[1].connected = true
      state.gamepads[1].buttons[0] = 0.5
      state.gamepads[2].connected = false
      state.gamepads[3].connected = true
      state.gamepads[3].axes[0] = -1
      mockInputCapture.getInputState.mockReturnValue(state)

      expect(inputAPI.isGamepadConnected(0)).toBe(true)
      expect(inputAPI.isGamepadConnected(1)).toBe(true)
      expect(inputAPI.isGamepadConnected(2)).toBe(false)
      expect(inputAPI.isGamepadConnected(3)).toBe(true)
      expect(inputAPI.getGamepadButton(0, 0)).toBe(1)
      expect(inputAPI.getGamepadButton(1, 0)).toBe(0.5)
      expect(inputAPI.getGamepadButton(2, 0)).toBe(0)
      expect(inputAPI.getGamepadAxis(3, 0)).toBe(-1)
    })

    it('should handle all button values from 0 to 1', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      const state = createEmptyInputState()
      state.gamepads[0].connected = true
      mockInputCapture.getInputState.mockReturnValue(state)

      // Test boundary values
      state.gamepads[0].buttons[0] = 0
      expect(inputAPI.getGamepadButton(0, 0)).toBe(0)

      state.gamepads[0].buttons[0] = 1
      expect(inputAPI.getGamepadButton(0, 0)).toBe(1)

      state.gamepads[0].buttons[0] = 0.5
      expect(inputAPI.getGamepadButton(0, 0)).toBe(0.5)
    })

    it('should handle axis values from -1 to 1', () => {
      const inputAPI = new InputAPI(mockInputCapture)
      const state = createEmptyInputState()
      state.gamepads[0].connected = true
      mockInputCapture.getInputState.mockReturnValue(state)

      // Test boundary values
      state.gamepads[0].axes[0] = -1
      expect(inputAPI.getGamepadAxis(0, 0)).toBe(-1)

      state.gamepads[0].axes[0] = 1
      expect(inputAPI.getGamepadAxis(0, 0)).toBe(1)

      state.gamepads[0].axes[0] = 0
      expect(inputAPI.getGamepadAxis(0, 0)).toBe(0)
    })
  })
})
