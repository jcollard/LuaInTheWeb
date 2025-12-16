import type { InputState } from '../shared/types.js';

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

  // Bound event handlers for removal
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseUp: (e: MouseEvent) => void;
  private readonly handleBlur: () => void;

  constructor(target: HTMLElement) {
    this.target = target;

    // Bind handlers
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleBlur = this.onBlur.bind(this);

    // Add event listeners
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('mousemove', this.handleMouseMove);
    target.addEventListener('mousedown', this.handleMouseDown);
    target.addEventListener('mouseup', this.handleMouseUp);
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
    };
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
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
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

  private onBlur(): void {
    // Clear all input state on blur to prevent stuck keys/buttons
    this.keysDown.clear();
    this.keysPressed.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsPressed.clear();
  }
}
