/**
 * InputAPI - Facade for keyboard, mouse, and gamepad input handling.
 *
 * This class wraps InputCapture to provide a clean interface for input queries.
 * It handles null-safety internally, returning appropriate defaults when
 * InputCapture is unavailable (e.g., controller not started).
 */

import type { InputCapture } from '@lua-learning/canvas-runtime'
import type { InputState } from '@lua-learning/canvas-runtime'
import { createEmptyInputState } from '@lua-learning/canvas-runtime'

/**
 * Interface for the subset of InputCapture methods used by InputAPI.
 * This allows for easier testing and type flexibility.
 */
export interface IInputCapture {
  isKeyDown(code: string): boolean
  isKeyPressed(code: string): boolean
  getKeysDown(): string[]
  getInputState(): InputState
  getMousePosition(): { x: number; y: number }
  isMouseButtonDown(button: number): boolean
  isMouseButtonPressed(button: number): boolean
  getConnectedGamepadCount(): number
}

/**
 * Facade for input handling that wraps InputCapture.
 * Provides null-safe access to keyboard, mouse, and gamepad input.
 */
export class InputAPI {
  private inputCapture: IInputCapture | null = null

  /**
   * Create a new InputAPI instance.
   * @param inputCapture - Optional InputCapture to wrap. Can be set later via setInputCapture.
   */
  constructor(inputCapture?: InputCapture | IInputCapture | null) {
    this.inputCapture = inputCapture ?? null
  }

  /**
   * Set or update the underlying InputCapture.
   * @param capture - InputCapture to use, or null to disable input.
   */
  setInputCapture(capture: InputCapture | IInputCapture | null): void {
    this.inputCapture = capture
  }

  // --- Keyboard API ---

  /**
   * Check if a key is currently held down.
   * @param code - KeyboardEvent.code (e.g., 'KeyA', 'Space', 'ArrowUp')
   * @returns true if key is held down, false otherwise or if InputCapture is null
   */
  isKeyDown(code: string): boolean {
    return this.inputCapture?.isKeyDown(code) ?? false
  }

  /**
   * Check if a key was just pressed this frame.
   * @param code - KeyboardEvent.code (e.g., 'KeyA', 'Space', 'ArrowUp')
   * @returns true if key was just pressed, false otherwise or if InputCapture is null
   */
  isKeyPressed(code: string): boolean {
    return this.inputCapture?.isKeyPressed(code) ?? false
  }

  /**
   * Get all keys currently held down.
   *
   * IMPORTANT: The returned array is cached and reused across calls.
   * Callers must NOT mutate the returned array. This design eliminates
   * GC pressure from input handling.
   *
   * @returns Array of key codes, or empty array if InputCapture is null
   */
  getKeysDown(): string[] {
    if (!this.inputCapture) return []
    return this.inputCapture.getKeysDown()
  }

  /**
   * Get all keys pressed this frame.
   * @returns Array of key codes, or empty array if InputCapture is null
   */
  getKeysPressed(): string[] {
    if (!this.inputCapture) return []
    const state = this.inputCapture.getInputState()
    return state.keysPressed
  }

  // --- Mouse API ---

  /**
   * Get mouse X position relative to the canvas.
   * @returns X coordinate, or 0 if InputCapture is null
   */
  getMouseX(): number {
    return this.inputCapture?.getMousePosition().x ?? 0
  }

  /**
   * Get mouse Y position relative to the canvas.
   * @returns Y coordinate, or 0 if InputCapture is null
   */
  getMouseY(): number {
    return this.inputCapture?.getMousePosition().y ?? 0
  }

  /**
   * Check if a mouse button is currently held down.
   * @param button - 0 = left, 1 = middle, 2 = right
   * @returns true if button is held down, false otherwise or if InputCapture is null
   */
  isMouseButtonDown(button: number): boolean {
    return this.inputCapture?.isMouseButtonDown(button) ?? false
  }

  /**
   * Check if a mouse button was just pressed this frame.
   * @param button - 0 = left, 1 = middle, 2 = right
   * @returns true if button was just pressed, false otherwise or if InputCapture is null
   */
  isMouseButtonPressed(button: number): boolean {
    return this.inputCapture?.isMouseButtonPressed(button) ?? false
  }

  // --- Input State API ---

  /**
   * Get the full input state.
   * @returns Complete InputState, or empty state if InputCapture is null
   */
  getInputState(): InputState {
    return this.inputCapture?.getInputState() ?? createEmptyInputState()
  }

  // --- Gamepad API ---

  /**
   * Get the number of connected gamepads.
   * @returns Number of connected gamepads, or 0 if InputCapture is null
   */
  getGamepadCount(): number {
    return this.inputCapture?.getConnectedGamepadCount() ?? 0
  }

  /**
   * Check if a gamepad is connected at the given index.
   * @param index - Gamepad index (0-3)
   * @returns true if gamepad is connected, false otherwise or if index is out of bounds
   */
  isGamepadConnected(index: number): boolean {
    const state = this.inputCapture?.getInputState()
    if (!state || index < 0 || index >= state.gamepads.length) {
      return false
    }
    return state.gamepads[index].connected
  }

  /**
   * Get the value of a gamepad button.
   * @param gamepadIndex - Gamepad index (0-3)
   * @param buttonIndex - Button index (0-16)
   * @returns Button value (0.0-1.0) or 0 if not available
   */
  getGamepadButton(gamepadIndex: number, buttonIndex: number): number {
    const state = this.inputCapture?.getInputState()
    if (!state || gamepadIndex < 0 || gamepadIndex >= state.gamepads.length) {
      return 0
    }
    const gamepad = state.gamepads[gamepadIndex]
    if (!gamepad.connected || buttonIndex < 0 || buttonIndex >= gamepad.buttons.length) {
      return 0
    }
    return gamepad.buttons[buttonIndex]
  }

  /**
   * Check if a gamepad button was just pressed this frame.
   * @param gamepadIndex - Gamepad index (0-3)
   * @param buttonIndex - Button index (0-16)
   * @returns true if button was just pressed
   */
  isGamepadButtonPressed(gamepadIndex: number, buttonIndex: number): boolean {
    const state = this.inputCapture?.getInputState()
    if (!state || gamepadIndex < 0 || gamepadIndex >= state.gamepads.length) {
      return false
    }
    const gamepad = state.gamepads[gamepadIndex]
    if (!gamepad.connected) {
      return false
    }
    return gamepad.buttonsPressed.includes(buttonIndex)
  }

  /**
   * Get the value of a gamepad axis.
   * @param gamepadIndex - Gamepad index (0-3)
   * @param axisIndex - Axis index (0-3)
   * @returns Axis value (-1.0 to 1.0) or 0 if not available
   */
  getGamepadAxis(gamepadIndex: number, axisIndex: number): number {
    const state = this.inputCapture?.getInputState()
    if (!state || gamepadIndex < 0 || gamepadIndex >= state.gamepads.length) {
      return 0
    }
    const gamepad = state.gamepads[gamepadIndex]
    if (!gamepad.connected || axisIndex < 0 || axisIndex >= gamepad.axes.length) {
      return 0
    }
    return gamepad.axes[axisIndex]
  }
}
