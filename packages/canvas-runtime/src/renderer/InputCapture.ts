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

    // Initialize gamepad states
    for (let i = 0; i < MAX_GAMEPADS; i++) {
      this.gamepadStates.push(createEmptyGamepadState());
      this.previousGamepadButtons.push([]);
    }

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
   */
  getInputState(): InputState {
    return {
      keysDown: Array.from(this.keysDown),
      keysPressed: Array.from(this.keysPressed),
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      mouseButtonsDown: Array.from(this.mouseButtonsDown),
      mouseButtonsPressed: Array.from(this.mouseButtonsPressed),
      gamepads: this.getGamepadStates(),
    };
  }

  /**
   * Poll gamepad state from the Web Gamepad API.
   * Must be called each frame before getInputState() to update gamepad data.
   * The Gamepad API requires polling - there are no events for button/axis value changes.
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
          state.buttonsPressed = [];
          state.axes.fill(0);
          this.previousGamepadButtons[i] = [];
        }
        continue;
      }

      // Update connection state
      state.connected = gamepad.connected;
      state.id = gamepad.id;

      // Track which buttons were newly pressed this frame
      const newlyPressed: number[] = [];

      // Update button values
      const buttonCount = Math.min(gamepad.buttons.length, state.buttons.length);
      for (let b = 0; b < buttonCount; b++) {
        const buttonValue = gamepad.buttons[b].value;
        const wasPressed = (this.previousGamepadButtons[i][b] ?? 0) > 0;
        const isPressed = buttonValue > 0;

        state.buttons[b] = buttonValue;

        // Detect just-pressed (edge trigger)
        if (isPressed && !wasPressed) {
          newlyPressed.push(b);
        }
      }

      state.buttonsPressed = newlyPressed;

      // Store current button state for next frame comparison
      this.previousGamepadButtons[i] = [...state.buttons];

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
   * Get the current gamepad states.
   * Returns copies of the internal gamepad states.
   */
  private getGamepadStates(): GamepadState[] {
    return this.gamepadStates.map((g) => ({
      connected: g.connected,
      id: g.id,
      buttons: [...g.buttons],
      buttonsPressed: [...g.buttonsPressed],
      axes: [...g.axes],
    }));
  }

  /**
   * Update called at the end of each frame.
   * Clears the "just pressed" state for keys and buttons.
   */
  update(): void {
    this.keysPressed.clear();
    this.mouseButtonsPressed.clear();
  }

  /**
   * Reset all input state.
   */
  reset(): void {
    this.keysDown.clear();
    this.keysPressed.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsPressed.clear();
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
    }
    this.keysDown.add(event.code);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keysDown.delete(event.code);
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
    }
    this.mouseButtonsDown.add(event.button);
  }

  private onMouseUp(event: MouseEvent): void {
    this.mouseButtonsDown.delete(event.button);
  }

  private onContextMenu(event: MouseEvent): void {
    // Prevent browser context menu so right-click can be used in games
    event.preventDefault();
  }

  private onBlur(): void {
    // Clear all input state on blur to prevent stuck keys/buttons
    this.keysDown.clear();
    this.keysPressed.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsPressed.clear();
  }
}
