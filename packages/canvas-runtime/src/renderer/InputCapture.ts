import type { InputState, GamepadState } from '../shared/types.js';
import { createEmptyGamepadState, MAX_GAMEPADS } from '../shared/types.js';

/**
 * Captures keyboard and mouse input from a target element.
 *
 * InputCapture tracks the current state of keyboard keys and mouse buttons,
 * distinguishing between "currently held" and "just pressed this frame" states.
 * This is essential for game input handling where you need both continuous
 * (isKeyDown) and edge-triggered (isKeyPressed) input detection.
 */
export class InputCapture {
  private readonly target: HTMLElement;
  private readonly keysDown: Set<string> = new Set();
  private readonly keysPressed: Set<string> = new Set();
  private readonly mouseButtonsDown: Set<number> = new Set();
  private readonly mouseButtonsPressed: Set<number> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private disposed = false;

  // Cached arrays to avoid allocation on every getInputState() call.
  // These arrays are reused and should not be mutated by callers.
  private keysDownArray: string[] = [];
  private keysPressedArray: string[] = [];
  private mouseButtonsDownArray: number[] = [];
  private mouseButtonsPressedArray: number[] = [];

  // Dirty flags track when Sets have changed and arrays need re-syncing
  private keysDownDirty = false;
  private keysPressedDirty = false;
  private mouseButtonsDownDirty = false;
  private mouseButtonsPressedDirty = false;

  // Cached InputState object to avoid allocation on every getInputState() call.
  // Callers should not mutate the returned object or its arrays.
  private readonly cachedInputState: InputState;

  // Gamepad state tracking
  private readonly gamepadStates: GamepadState[] = [];
  private readonly previousGamepadButtons: number[][] = [];

  // Bound event handlers for removal
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseUp: (e: MouseEvent) => void;
  private readonly handleContextMenu: (e: MouseEvent) => void;
  private readonly handleBlur: () => void;

  constructor(target: HTMLElement) {
    this.target = target;

    // Initialize gamepad states with pre-allocated arrays
    for (let i = 0; i < MAX_GAMEPADS; i++) {
      this.gamepadStates.push(createEmptyGamepadState());
      this.previousGamepadButtons.push([]);
    }

    // Initialize cached InputState object with references to our cached arrays.
    // The gamepads array is a reference that we'll update each frame.
    this.cachedInputState = {
      keysDown: this.keysDownArray,
      keysPressed: this.keysPressedArray,
      mouseX: 0,
      mouseY: 0,
      mouseButtonsDown: this.mouseButtonsDownArray,
      mouseButtonsPressed: this.mouseButtonsPressedArray,
      gamepads: this.gamepadStates,
    };

    // Bind handlers
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleContextMenu = this.onContextMenu.bind(this);
    this.handleBlur = this.onBlur.bind(this);

    // Add event listeners
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('mousemove', this.handleMouseMove);
    target.addEventListener('mousedown', this.handleMouseDown);
    target.addEventListener('mouseup', this.handleMouseUp);
    target.addEventListener('contextmenu', this.handleContextMenu);
    target.addEventListener('blur', this.handleBlur);
  }

  /**
   * Check if a key is currently held down.
   */
  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /**
   * Check if a key was just pressed this frame.
   * Returns true only until update() is called.
   */
  isKeyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  /**
   * Get all keys currently held down.
   */
  getKeysDown(): Set<string> {
    return new Set(this.keysDown);
  }

  /**
   * Check if a mouse button is currently held down.
   * @param button - 0 = left, 1 = middle, 2 = right
   */
  isMouseButtonDown(button: number): boolean {
    return this.mouseButtonsDown.has(button);
  }

  /**
   * Check if a mouse button was just pressed this frame.
   * @param button - 0 = left, 1 = middle, 2 = right
   */
  isMouseButtonPressed(button: number): boolean {
    return this.mouseButtonsPressed.has(button);
  }

  /**
   * Get the current mouse position relative to the target element.
   */
  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  /**
   * Get the full input state for transmission over a channel.
   *
   * IMPORTANT: The returned object and its arrays are cached and reused
   * across calls. Callers must NOT mutate the returned object or its arrays.
   * This design eliminates GC pressure from input handling.
   */
  getInputState(): InputState {
    // Sync cached arrays from Sets only if they've changed
    this.syncKeysDownArray();
    this.syncKeysPressedArray();
    this.syncMouseButtonsDownArray();
    this.syncMouseButtonsPressedArray();

    // Update scalar values in cached state
    this.cachedInputState.mouseX = this.mouseX;
    this.cachedInputState.mouseY = this.mouseY;

    // gamepadStates are already referenced by cachedInputState and updated in-place
    return this.cachedInputState;
  }

  /**
   * Sync keysDownArray from keysDown Set only when dirty.
   */
  private syncKeysDownArray(): void {
    if (!this.keysDownDirty) return;
    this.keysDownArray.length = 0;
    for (const key of this.keysDown) {
      this.keysDownArray.push(key);
    }
    this.keysDownDirty = false;
  }

  /**
   * Sync keysPressedArray from keysPressed Set only when dirty.
   */
  private syncKeysPressedArray(): void {
    if (!this.keysPressedDirty) return;
    this.keysPressedArray.length = 0;
    for (const key of this.keysPressed) {
      this.keysPressedArray.push(key);
    }
    this.keysPressedDirty = false;
  }

  /**
   * Sync mouseButtonsDownArray from mouseButtonsDown Set only when dirty.
   */
  private syncMouseButtonsDownArray(): void {
    if (!this.mouseButtonsDownDirty) return;
    this.mouseButtonsDownArray.length = 0;
    for (const button of this.mouseButtonsDown) {
      this.mouseButtonsDownArray.push(button);
    }
    this.mouseButtonsDownDirty = false;
  }

  /**
   * Sync mouseButtonsPressedArray from mouseButtonsPressed Set only when dirty.
   */
  private syncMouseButtonsPressedArray(): void {
    if (!this.mouseButtonsPressedDirty) return;
    this.mouseButtonsPressedArray.length = 0;
    for (const button of this.mouseButtonsPressed) {
      this.mouseButtonsPressedArray.push(button);
    }
    this.mouseButtonsPressedDirty = false;
  }

  /**
   * Poll gamepad state from the Web Gamepad API.
   * Must be called each frame before getInputState() to update gamepad data.
   * The Gamepad API requires polling - there are no events for button/axis value changes.
   *
   * This method is optimized to avoid allocations in the hot path by:
   * - Reusing buttonsPressed array (clearing and refilling in-place)
   * - Using in-place copy for previousGamepadButtons
   */
  pollGamepads(): void {
    // navigator.getGamepads() may not exist in non-browser environments
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return;
    }

    const gamepads = navigator.getGamepads();

    for (let i = 0; i < MAX_GAMEPADS; i++) {
      const gamepad = gamepads[i];
      const state = this.gamepadStates[i];

      if (!gamepad) {
        // No gamepad in this slot
        if (state.connected) {
          // Was connected, now disconnected - reset state
          state.connected = false;
          state.id = '';
          state.buttons.fill(0);
          state.buttonsPressed.length = 0;
          state.axes.fill(0);
          this.previousGamepadButtons[i].length = 0;
        }
        continue;
      }

      // Update connection state
      state.connected = gamepad.connected;
      state.id = gamepad.id;

      // Clear buttonsPressed array in-place (reuse, no allocation)
      state.buttonsPressed.length = 0;

      // Update button values
      const buttonCount = Math.min(gamepad.buttons.length, state.buttons.length);
      const prevButtons = this.previousGamepadButtons[i];
      for (let b = 0; b < buttonCount; b++) {
        const buttonValue = gamepad.buttons[b].value;
        const wasPressed = (prevButtons[b] ?? 0) > 0;
        const isPressed = buttonValue > 0;

        state.buttons[b] = buttonValue;

        // Detect just-pressed (edge trigger)
        if (isPressed && !wasPressed) {
          state.buttonsPressed.push(b);
        }
      }

      // Copy current button state for next frame comparison (in-place, no spread)
      // Ensure previousGamepadButtons array is long enough
      if (prevButtons.length < buttonCount) {
        prevButtons.length = buttonCount;
      }
      for (let b = 0; b < buttonCount; b++) {
        prevButtons[b] = state.buttons[b];
      }

      // Update axis values
      const axisCount = Math.min(gamepad.axes.length, state.axes.length);
      for (let a = 0; a < axisCount; a++) {
        state.axes[a] = gamepad.axes[a];
      }
    }
  }

  /**
   * Get the number of connected gamepads.
   */
  getConnectedGamepadCount(): number {
    return this.gamepadStates.filter((g) => g.connected).length;
  }

  /**
   * Update called at the end of each frame.
   * Clears the "just pressed" state for keys and buttons.
   */
  update(): void {
    if (this.keysPressed.size > 0) {
      this.keysPressed.clear();
      this.keysPressedDirty = true;
    }
    if (this.mouseButtonsPressed.size > 0) {
      this.mouseButtonsPressed.clear();
      this.mouseButtonsPressedDirty = true;
    }
  }

  /**
   * Reset all input state.
   */
  reset(): void {
    if (this.keysDown.size > 0) {
      this.keysDown.clear();
      this.keysDownDirty = true;
    }
    if (this.keysPressed.size > 0) {
      this.keysPressed.clear();
      this.keysPressedDirty = true;
    }
    if (this.mouseButtonsDown.size > 0) {
      this.mouseButtonsDown.clear();
      this.mouseButtonsDownDirty = true;
    }
    if (this.mouseButtonsPressed.size > 0) {
      this.mouseButtonsPressed.clear();
      this.mouseButtonsPressedDirty = true;
    }
    this.mouseX = 0;
    this.mouseY = 0;
  }

  /**
   * Remove all event listeners and clean up.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('mousemove', this.handleMouseMove);
    this.target.removeEventListener('mousedown', this.handleMouseDown);
    this.target.removeEventListener('mouseup', this.handleMouseUp);
    this.target.removeEventListener('contextmenu', this.handleContextMenu);
    this.target.removeEventListener('blur', this.handleBlur);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.keysDown.has(event.code)) {
      this.keysPressed.add(event.code);
      this.keysPressedDirty = true;
    }
    this.keysDown.add(event.code);
    this.keysDownDirty = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keysDown.delete(event.code);
    this.keysDownDirty = true;
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.target.getBoundingClientRect();
    // Get position relative to displayed element
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;

    // If target is a canvas, handle object-fit: contain letterboxing and scaling
    if (this.target instanceof HTMLCanvasElement) {
      const canvasWidth = this.target.width;
      const canvasHeight = this.target.height;
      const rectWidth = rect.width;
      const rectHeight = rect.height;

      // Calculate how the canvas content is positioned with object-fit: contain
      // When aspect ratios differ, there will be letterboxing (black bars)
      const canvasAspect = canvasWidth / canvasHeight;
      const rectAspect = rectWidth / rectHeight;

      let contentWidth: number;
      let contentHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (rectAspect > canvasAspect) {
        // Container is wider than canvas - horizontal letterboxing (black bars on sides)
        contentHeight = rectHeight;
        contentWidth = rectHeight * canvasAspect;
        offsetX = (rectWidth - contentWidth) / 2;
        offsetY = 0;
      } else {
        // Container is taller than canvas - vertical letterboxing (black bars top/bottom)
        contentWidth = rectWidth;
        contentHeight = rectWidth / canvasAspect;
        offsetX = 0;
        offsetY = (rectHeight - contentHeight) / 2;
      }

      // Translate from display coords to content coords (accounting for letterboxing)
      const contentX = displayX - offsetX;
      const contentY = displayY - offsetY;

      // Scale from content coords to canvas logical coords
      this.mouseX = contentX * (canvasWidth / contentWidth);
      this.mouseY = contentY * (canvasHeight / contentHeight);
    } else {
      this.mouseX = displayX;
      this.mouseY = displayY;
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.mouseButtonsDown.has(event.button)) {
      this.mouseButtonsPressed.add(event.button);
      this.mouseButtonsPressedDirty = true;
    }
    this.mouseButtonsDown.add(event.button);
    this.mouseButtonsDownDirty = true;
  }

  private onMouseUp(event: MouseEvent): void {
    this.mouseButtonsDown.delete(event.button);
    this.mouseButtonsDownDirty = true;
  }

  private onContextMenu(event: MouseEvent): void {
    // Prevent browser context menu so right-click can be used in games
    event.preventDefault();
  }

  private onBlur(): void {
    // Clear all input state on blur to prevent stuck keys/buttons
    if (this.keysDown.size > 0) {
      this.keysDown.clear();
      this.keysDownDirty = true;
    }
    if (this.keysPressed.size > 0) {
      this.keysPressed.clear();
      this.keysPressedDirty = true;
    }
    if (this.mouseButtonsDown.size > 0) {
      this.mouseButtonsDown.clear();
      this.mouseButtonsDownDirty = true;
    }
    if (this.mouseButtonsPressed.size > 0) {
      this.mouseButtonsPressed.clear();
      this.mouseButtonsPressedDirty = true;
    }
  }
}
