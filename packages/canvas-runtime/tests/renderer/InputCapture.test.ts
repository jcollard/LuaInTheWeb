/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputCapture } from '../../src/renderer/InputCapture.js';

describe('InputCapture', () => {
  let target: HTMLElement;
  let inputCapture: InputCapture;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    inputCapture = new InputCapture(target);
  });

  afterEach(() => {
    inputCapture.dispose();
    document.body.removeChild(target);
  });

  describe('constructor', () => {
    it('should create InputCapture with target element', () => {
      expect(inputCapture).toBeDefined();
    });
  });

  describe('keyboard events', () => {
    describe('isKeyDown', () => {
      it('should return false for keys not pressed', () => {
        expect(inputCapture.isKeyDown('KeyA')).toBe(false);
      });

      it('should return true when key is pressed', () => {
        const event = new KeyboardEvent('keydown', { code: 'KeyA' });
        target.dispatchEvent(event);

        expect(inputCapture.isKeyDown('KeyA')).toBe(true);
      });

      it('should return false after key is released', () => {
        const keydown = new KeyboardEvent('keydown', { code: 'KeyA' });
        const keyup = new KeyboardEvent('keyup', { code: 'KeyA' });

        target.dispatchEvent(keydown);
        expect(inputCapture.isKeyDown('KeyA')).toBe(true);

        target.dispatchEvent(keyup);
        expect(inputCapture.isKeyDown('KeyA')).toBe(false);
      });

      it('should track multiple keys simultaneously', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

        expect(inputCapture.isKeyDown('KeyA')).toBe(true);
        expect(inputCapture.isKeyDown('KeyW')).toBe(true);
        expect(inputCapture.isKeyDown('Space')).toBe(true);
        expect(inputCapture.isKeyDown('KeyD')).toBe(false);
      });

      it('should handle arrow keys', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));

        expect(inputCapture.isKeyDown('ArrowUp')).toBe(true);
        expect(inputCapture.isKeyDown('ArrowLeft')).toBe(true);
        expect(inputCapture.isKeyDown('ArrowDown')).toBe(false);
        expect(inputCapture.isKeyDown('ArrowRight')).toBe(false);
      });
    });

    describe('isKeyPressed (just pressed this frame)', () => {
      it('should return false for keys not pressed', () => {
        expect(inputCapture.isKeyPressed('KeyA')).toBe(false);
      });

      it('should return true when key is first pressed', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);
      });

      it('should return false on subsequent checks without new frame', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);
        // Second check in same frame should still be true
        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);
      });

      it('should return false after frame update while key still held', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);

        inputCapture.update();

        // Key still down but not "just pressed"
        expect(inputCapture.isKeyDown('KeyA')).toBe(true);
        expect(inputCapture.isKeyPressed('KeyA')).toBe(false);
      });

      it('should not re-trigger pressed on auto-repeat keydown', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);

        inputCapture.update();

        // Simulate auto-repeat: keydown fires again while key still held
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        expect(inputCapture.isKeyPressed('KeyA')).toBe(false);
      });

      it('should return true again after key released and pressed again', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);

        inputCapture.update();
        expect(inputCapture.isKeyPressed('KeyA')).toBe(false);

        target.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
        inputCapture.update();

        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        expect(inputCapture.isKeyPressed('KeyA')).toBe(true);
      });
    });

    describe('getKeysDown', () => {
      it('should return empty array when no keys pressed', () => {
        expect(inputCapture.getKeysDown()).toEqual([]);
      });

      it('should return array of all pressed keys', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

        const keysDown = inputCapture.getKeysDown();
        expect(keysDown).toHaveLength(2);
        expect(keysDown).toContain('KeyA');
        expect(keysDown).toContain('KeyW');
      });

      it('should remove key from array after keyup', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

        expect(inputCapture.getKeysDown()).toHaveLength(2);

        target.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));

        const keysDown = inputCapture.getKeysDown();
        expect(keysDown).toHaveLength(1);
        expect(keysDown).toContain('KeyW');
        expect(keysDown).not.toContain('KeyA');
      });
    });
  });

  describe('mouse events', () => {
    describe('mouse position', () => {
      it('should return (0, 0) initially', () => {
        const pos = inputCapture.getMousePosition();
        expect(pos.x).toBe(0);
        expect(pos.y).toBe(0);
      });

      it('should track mouse position on mousemove', () => {
        const event = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 200,
        });
        // Mock getBoundingClientRect for offset calculation
        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
          left: 10,
          top: 20,
          right: 810,
          bottom: 620,
          width: 800,
          height: 600,
          x: 10,
          y: 20,
          toJSON: () => ({}),
        });

        target.dispatchEvent(event);

        const pos = inputCapture.getMousePosition();
        expect(pos.x).toBe(90); // 100 - 10
        expect(pos.y).toBe(180); // 200 - 20
      });

      it('should scale mouse coordinates when canvas is CSS-scaled (uniform)', () => {
        // Create a canvas with logical size 400x300 but displayed at 800x600
        // Same aspect ratio (4:3), so no letterboxing
        const canvas = document.createElement('canvas');
        canvas.width = 400;  // Logical width
        canvas.height = 300; // Logical height
        document.body.appendChild(canvas);

        const canvasInput = new InputCapture(canvas);

        // Mock getBoundingClientRect to simulate CSS scaling (2x uniform)
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          right: 800,
          bottom: 600,
          width: 800,   // Displayed width (2x logical)
          height: 600,  // Displayed height (2x logical)
          x: 0,
          y: 0,
          toJSON: () => ({}),
        });

        // Click at display position (400, 300) - center of displayed canvas
        const event = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(event);

        // Should be scaled to logical coordinates (200, 150) - center of logical canvas
        const pos = canvasInput.getMousePosition();
        expect(pos.x).toBe(200); // 400 * (400/800)
        expect(pos.y).toBe(150); // 300 * (300/600)

        canvasInput.dispose();
        document.body.removeChild(canvas);
      });

      it('should handle object-fit: contain with horizontal letterboxing', () => {
        // Canvas: 500x420 (aspect ~1.19)
        // Container: 1200x600 (aspect 2.0) - wider than canvas
        // Content will be height-limited: 600px tall, 714px wide (600 * 500/420)
        // Horizontal letterbox: (1200 - 714) / 2 = 243px on each side
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 420;
        document.body.appendChild(canvas);

        const canvasInput = new InputCapture(canvas);

        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          right: 1200,
          bottom: 600,
          width: 1200,
          height: 600,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        });

        // Click in the letterbox area (left black bar) at x=100
        // This should give negative canvas coordinates (outside canvas)
        const letterboxEvent = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 300,
        });
        canvas.dispatchEvent(letterboxEvent);

        const letterboxPos = canvasInput.getMousePosition();
        expect(letterboxPos.x).toBeLessThan(0); // Outside canvas (in left letterbox)

        // Click at center of display (600, 300)
        // Content offset X = (1200 - 714.29) / 2 = 242.86
        // Content X = 600 - 242.86 = 357.14
        // Canvas X = 357.14 * (500 / 714.29) = 250
        const centerEvent = new MouseEvent('mousemove', {
          clientX: 600,
          clientY: 300,
        });
        canvas.dispatchEvent(centerEvent);

        const centerPos = canvasInput.getMousePosition();
        expect(centerPos.x).toBeCloseTo(250, 0); // Center of canvas
        expect(centerPos.y).toBeCloseTo(210, 0); // Center of canvas

        // Non-center point to verify letterbox content width calculation
        // contentWidth = rectHeight * canvasAspect = 600 * (500/420) ≈ 714.29
        // offsetX = (1200 - 714.29) / 2 ≈ 242.86
        // At x=350: contentX = 350 - 242.86 = 107.14, canvasX = 107.14 * (500/714.29) ≈ 75
        const offCenterEvent = new MouseEvent('mousemove', {
          clientX: 350,
          clientY: 300,
        });
        canvas.dispatchEvent(offCenterEvent);
        const offCenterPos = canvasInput.getMousePosition();
        expect(offCenterPos.x).toBeCloseTo(75, 0);

        canvasInput.dispose();
        document.body.removeChild(canvas);
      });

      it('should handle object-fit: contain with vertical letterboxing', () => {
        // Canvas: 800x300 (aspect ~2.67)
        // Container: 800x600 (aspect ~1.33) - taller than canvas
        // Content will be width-limited: 800px wide, 300px tall
        // Vertical letterbox: (600 - 300) / 2 = 150px on top and bottom
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 300;
        document.body.appendChild(canvas);

        const canvasInput = new InputCapture(canvas);

        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          right: 800,
          bottom: 600,
          width: 800,
          height: 600,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        });

        // Click in the top letterbox area at y=50
        const letterboxEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 50,
        });
        canvas.dispatchEvent(letterboxEvent);

        const letterboxPos = canvasInput.getMousePosition();
        expect(letterboxPos.y).toBeLessThan(0); // Outside canvas (in top letterbox)

        // Click at center of display (400, 300)
        // Content offset Y = (600 - 300) / 2 = 150
        // Content Y = 300 - 150 = 150
        // Canvas Y = 150 * (300 / 300) = 150
        const centerEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(centerEvent);

        const centerPos = canvasInput.getMousePosition();
        expect(centerPos.x).toBeCloseTo(400, 0); // Center of canvas
        expect(centerPos.y).toBeCloseTo(150, 0); // Center of canvas

        canvasInput.dispose();
        document.body.removeChild(canvas);
      });
    });

    describe('mouse buttons', () => {
      it('should return false for buttons not pressed', () => {
        expect(inputCapture.isMouseButtonDown(0)).toBe(false);
        expect(inputCapture.isMouseButtonDown(1)).toBe(false);
        expect(inputCapture.isMouseButtonDown(2)).toBe(false);
      });

      it('should track left mouse button (button 0)', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

        expect(inputCapture.isMouseButtonDown(0)).toBe(true);
        expect(inputCapture.isMouseButtonDown(1)).toBe(false);
        expect(inputCapture.isMouseButtonDown(2)).toBe(false);
      });

      it('should track right mouse button (button 2)', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));

        expect(inputCapture.isMouseButtonDown(2)).toBe(true);
        expect(inputCapture.isMouseButtonDown(0)).toBe(false);
      });

      it('should track middle mouse button (button 1)', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 1 }));

        expect(inputCapture.isMouseButtonDown(1)).toBe(true);
      });

      it('should release button on mouseup', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        expect(inputCapture.isMouseButtonDown(0)).toBe(true);

        target.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
        expect(inputCapture.isMouseButtonDown(0)).toBe(false);
      });

      it('should track multiple buttons simultaneously', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        target.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));

        expect(inputCapture.isMouseButtonDown(0)).toBe(true);
        expect(inputCapture.isMouseButtonDown(2)).toBe(true);
      });

      it('should update mouseButtonsDown array after mouseup', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        target.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));

        const state1 = inputCapture.getInputState();
        expect(state1.mouseButtonsDown).toContain(0);
        expect(state1.mouseButtonsDown).toContain(2);

        target.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

        const state2 = inputCapture.getInputState();
        expect(state2.mouseButtonsDown).not.toContain(0);
        expect(state2.mouseButtonsDown).toContain(2);
      });
    });

    describe('isMouseButtonPressed (just pressed this frame)', () => {
      it('should return false for buttons not pressed', () => {
        expect(inputCapture.isMouseButtonPressed(0)).toBe(false);
      });

      it('should return true when button is first pressed', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

        expect(inputCapture.isMouseButtonPressed(0)).toBe(true);
      });

      it('should return false after frame update while button still held', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        expect(inputCapture.isMouseButtonPressed(0)).toBe(true);

        inputCapture.update();

        expect(inputCapture.isMouseButtonDown(0)).toBe(true);
        expect(inputCapture.isMouseButtonPressed(0)).toBe(false);
      });

      it('should not re-trigger pressed on duplicate mousedown', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        expect(inputCapture.isMouseButtonPressed(0)).toBe(true);

        inputCapture.update();

        // Second mousedown while still held should not re-trigger pressed
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        expect(inputCapture.isMouseButtonPressed(0)).toBe(false);
      });
    });
  });

  describe('getInputState', () => {
    it('should return empty pressed arrays before any events', () => {
      const state = inputCapture.getInputState();
      expect(state.keysPressed).toEqual([]);
      expect(state.mouseButtonsPressed).toEqual([]);
    });

    it('should return full input state for channel transmission', () => {
      // Set up some input state
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      target.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
      target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

      const state = inputCapture.getInputState();

      expect(state.keysDown).toContain('KeyW');
      expect(state.keysDown).toContain('Space');
      expect(state.keysPressed).toContain('KeyW');
      expect(state.keysPressed).toContain('Space');
      expect(state.mouseX).toBe(400);
      expect(state.mouseY).toBe(300);
      expect(state.mouseButtonsDown).toContain(0);
      expect(state.mouseButtonsPressed).toContain(0);
    });

    describe('caching behavior (GC optimization)', () => {
      it('should return the same object reference across multiple calls', () => {
        const state1 = inputCapture.getInputState();
        const state2 = inputCapture.getInputState();
        const state3 = inputCapture.getInputState();

        expect(state1).toBe(state2);
        expect(state2).toBe(state3);
      });

      it('should reuse keysDown array (same reference)', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

        const state1 = inputCapture.getInputState();
        const keysDown1 = state1.keysDown;

        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));

        const state2 = inputCapture.getInputState();
        const keysDown2 = state2.keysDown;

        // Arrays should be same reference, just with updated contents
        expect(keysDown1).toBe(keysDown2);
        expect(keysDown2).toContain('KeyA');
        expect(keysDown2).toContain('KeyB');
      });

      it('should reuse keysPressed array (same reference)', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

        const state1 = inputCapture.getInputState();
        const keysPressed1 = state1.keysPressed;

        inputCapture.update();
        target.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));

        const state2 = inputCapture.getInputState();
        const keysPressed2 = state2.keysPressed;

        // Arrays should be same reference
        expect(keysPressed1).toBe(keysPressed2);
        expect(keysPressed2).toContain('KeyB');
        expect(keysPressed2).not.toContain('KeyA');
      });

      it('should reuse mouseButtonsDown array (same reference)', () => {
        target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

        const state1 = inputCapture.getInputState();
        const buttonsDown1 = state1.mouseButtonsDown;

        target.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));

        const state2 = inputCapture.getInputState();
        const buttonsDown2 = state2.mouseButtonsDown;

        expect(buttonsDown1).toBe(buttonsDown2);
        expect(buttonsDown2).toContain(0);
        expect(buttonsDown2).toContain(2);
      });

      it('should reuse gamepads array (same reference)', () => {
        const state1 = inputCapture.getInputState();
        const gamepads1 = state1.gamepads;

        const state2 = inputCapture.getInputState();
        const gamepads2 = state2.gamepads;

        expect(gamepads1).toBe(gamepads2);
      });

      it('should only update array when dirty flag is set', () => {
        // No input - arrays empty
        const state1 = inputCapture.getInputState();
        expect(state1.keysDown).toEqual([]);

        // Press a key - dirty flag should be set
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

        const state2 = inputCapture.getInputState();
        expect(state2.keysDown).toEqual(['KeyA']);

        // Call again without any change - should not reallocate
        const state3 = inputCapture.getInputState();
        expect(state3.keysDown).toBe(state2.keysDown);
        expect(state3.keysDown).toEqual(['KeyA']);
      });

      it('should update mouse position without affecting array caching', () => {
        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
          left: 0, top: 0, right: 800, bottom: 600,
          width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
        });

        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        const state1 = inputCapture.getInputState();
        const keysDown1 = state1.keysDown;

        // Move mouse without pressing keys
        target.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }));
        const state2 = inputCapture.getInputState();

        // Mouse position should update
        expect(state2.mouseX).toBe(100);
        expect(state2.mouseY).toBe(200);

        // keysDown array should still be same reference (no re-sync needed)
        expect(state2.keysDown).toBe(keysDown1);
      });
    });
  });

  describe('update', () => {
    it('should clear keysPressed in getInputState after update', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

      const state1 = inputCapture.getInputState();
      expect(state1.keysPressed).toContain('KeyA');
      expect(state1.mouseButtonsPressed).toContain(0);

      inputCapture.update();

      const state2 = inputCapture.getInputState();
      expect(state2.keysPressed).toEqual([]);
      expect(state2.mouseButtonsPressed).toEqual([]);
      // Down arrays should still have values
      expect(state2.keysDown).toContain('KeyA');
      expect(state2.mouseButtonsDown).toContain(0);
    });
  });

  describe('reset', () => {
    it('should clear all input state', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

      expect(inputCapture.isKeyDown('KeyA')).toBe(true);
      expect(inputCapture.isMouseButtonDown(0)).toBe(true);

      inputCapture.reset();

      expect(inputCapture.isKeyDown('KeyA')).toBe(false);
      expect(inputCapture.isMouseButtonDown(0)).toBe(false);
      expect(inputCapture.getKeysDown()).toEqual([]);
    });

    it('should clear all arrays in getInputState after reset', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

      const state1 = inputCapture.getInputState();
      expect(state1.keysDown.length).toBeGreaterThan(0);
      expect(state1.mouseButtonsDown.length).toBeGreaterThan(0);

      inputCapture.reset();

      const state2 = inputCapture.getInputState();
      expect(state2.keysDown).toEqual([]);
      expect(state2.keysPressed).toEqual([]);
      expect(state2.mouseButtonsDown).toEqual([]);
      expect(state2.mouseButtonsPressed).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('should remove event listeners', () => {
      const newCapture = new InputCapture(target);

      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(newCapture.isKeyDown('KeyA')).toBe(true);

      newCapture.dispose();

      // After dispose, events should not be tracked
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
      expect(newCapture.isKeyDown('KeyB')).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      const newCapture = new InputCapture(target);
      expect(() => {
        newCapture.dispose();
        newCapture.dispose();
      }).not.toThrow();
    });

    it('should remove blur listener on dispose', () => {
      const freshTarget = document.createElement('div');
      document.body.appendChild(freshTarget);
      const freshCapture = new InputCapture(freshTarget);

      freshTarget.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(freshCapture.isKeyDown('KeyA')).toBe(true);

      freshCapture.dispose();

      // Blur should no longer clear state after dispose
      freshTarget.dispatchEvent(new FocusEvent('blur'));
      // KeyA is still tracked because blur handler was removed
      expect(freshCapture.isKeyDown('KeyA')).toBe(true);

      document.body.removeChild(freshTarget);
    });
  });

  describe('drag prevention', () => {
    it('should prevent default on mousedown', () => {
      const event = new MouseEvent('mousedown', {
        button: 0,
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      target.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default on dragstart', () => {
      const event = new Event('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      target.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should remove dragstart listener on dispose', () => {
      const newCapture = new InputCapture(target);
      newCapture.dispose();

      const event = new Event('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      target.dispatchEvent(event);

      // The default InputCapture from beforeEach still listens,
      // but newCapture should not. We verify by creating a fresh target.
      const freshTarget = document.createElement('div');
      document.body.appendChild(freshTarget);
      const freshCapture = new InputCapture(freshTarget);
      freshCapture.dispose();

      const freshEvent = new Event('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      const freshSpy = vi.spyOn(freshEvent, 'preventDefault');
      freshTarget.dispatchEvent(freshEvent);

      expect(freshSpy).not.toHaveBeenCalled();
      document.body.removeChild(freshTarget);
    });
  });

  describe('keyboard preventDefault', () => {
    it('should prevent default on keydown for regular keys', () => {
      const keys = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Space', 'KeyA'];
      for (const code of keys) {
        const event = new KeyboardEvent('keydown', {
          code,
          bubbles: true,
          cancelable: true,
        });
        const spy = vi.spyOn(event, 'preventDefault');
        target.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
      }
    });

    it('should prevent default on keyup for regular keys', () => {
      const keys = ['Tab', 'ArrowUp', 'Escape', 'Space', 'KeyA'];
      for (const code of keys) {
        const event = new KeyboardEvent('keyup', {
          code,
          bubbles: true,
          cancelable: true,
        });
        const spy = vi.spyOn(event, 'preventDefault');
        target.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
      }
    });

    it('should NOT prevent default when ctrlKey is true', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyS',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      target.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should NOT prevent default when metaKey is true', () => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyR',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      target.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should NOT prevent default on keyup when ctrlKey is true', () => {
      const event = new KeyboardEvent('keyup', {
        code: 'KeyS',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      target.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should NOT prevent default on keyup when metaKey is true', () => {
      const event = new KeyboardEvent('keyup', {
        code: 'KeyR',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      target.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('focus handling', () => {
    it('should clear keys on blur to prevent stuck keys', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(inputCapture.isKeyDown('KeyA')).toBe(true);

      target.dispatchEvent(new FocusEvent('blur'));

      expect(inputCapture.isKeyDown('KeyA')).toBe(false);
    });

    it('should clear mouse buttons on blur to prevent stuck buttons', () => {
      target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      target.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
      expect(inputCapture.isMouseButtonDown(0)).toBe(true);
      expect(inputCapture.isMouseButtonDown(2)).toBe(true);

      target.dispatchEvent(new FocusEvent('blur'));

      expect(inputCapture.isMouseButtonDown(0)).toBe(false);
      expect(inputCapture.isMouseButtonDown(2)).toBe(false);
    });

    it('should clear all arrays in getInputState on blur', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      target.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));

      const state1 = inputCapture.getInputState();
      expect(state1.keysDown).toContain('KeyA');
      expect(state1.keysPressed).toContain('KeyA');
      expect(state1.mouseButtonsDown).toContain(0);
      expect(state1.mouseButtonsPressed).toContain(0);

      target.dispatchEvent(new FocusEvent('blur'));

      const state2 = inputCapture.getInputState();
      expect(state2.keysDown).toEqual([]);
      expect(state2.keysPressed).toEqual([]);
      expect(state2.mouseButtonsDown).toEqual([]);
      expect(state2.mouseButtonsPressed).toEqual([]);
    });
  });

  describe('gamepad events', () => {
    // Mock gamepad for testing
    function createMockGamepad(
      index: number,
      connected: boolean,
      buttons: { value: number; pressed: boolean }[],
      axes: number[]
    ): Gamepad {
      return {
        index,
        id: `Mock Controller ${index}`,
        connected,
        buttons: buttons as GamepadButton[],
        axes,
        mapping: 'standard',
        timestamp: performance.now(),
        hapticActuators: [],
        vibrationActuator: null,
      };
    }

    function createEmptyButtons(): { value: number; pressed: boolean }[] {
      return Array.from({ length: 17 }, () => ({ value: 0, pressed: false }));
    }

    describe('pollGamepads', () => {
      let mockGetGamepads: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        // jsdom doesn't have navigator.getGamepads, so we need to define it
        mockGetGamepads = vi.fn().mockReturnValue([null, null, null, null]);
        Object.defineProperty(navigator, 'getGamepads', {
          value: mockGetGamepads,
          configurable: true,
          writable: true,
        });
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should detect connected gamepad', () => {
        const buttons = createEmptyButtons();
        const mockGamepad = createMockGamepad(0, true, buttons, [0, 0, 0, 0]);

        mockGetGamepads.mockReturnValue([mockGamepad, null, null, null]);

        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].connected).toBe(true);
        expect(state.gamepads[0].id).toBe('Mock Controller 0');
        expect(state.gamepads[1].connected).toBe(false);
      });

      it('should read button values (analog)', () => {
        const buttons = createEmptyButtons();
        buttons[6] = { value: 0.75, pressed: true }; // Left trigger
        buttons[7] = { value: 0.5, pressed: true };  // Right trigger
        buttons[0] = { value: 1, pressed: true };    // A button

        const mockGamepad = createMockGamepad(0, true, buttons, [0, 0, 0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad, null, null, null]);

        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].buttons[6]).toBeCloseTo(0.75);
        expect(state.gamepads[0].buttons[7]).toBeCloseTo(0.5);
        expect(state.gamepads[0].buttons[0]).toBe(1);
      });

      it('should detect just-pressed buttons', () => {
        const buttons1 = createEmptyButtons();
        const mockGamepad1 = createMockGamepad(0, true, buttons1, [0, 0, 0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad1, null, null, null]);

        // First poll - no buttons pressed
        inputCapture.pollGamepads();
        expect(inputCapture.getInputState().gamepads[0].buttonsPressed).toEqual([]);

        // Second poll - A button pressed
        const buttons2 = createEmptyButtons();
        buttons2[0] = { value: 1, pressed: true };
        const mockGamepad2 = createMockGamepad(0, true, buttons2, [0, 0, 0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad2, null, null, null]);

        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].buttonsPressed).toContain(0);
      });

      it('should not report button as pressed if already held', () => {
        // First poll - A button pressed
        const buttons1 = createEmptyButtons();
        buttons1[0] = { value: 1, pressed: true };
        const mockGamepad1 = createMockGamepad(0, true, buttons1, [0, 0, 0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad1, null, null, null]);
        inputCapture.pollGamepads();

        expect(inputCapture.getInputState().gamepads[0].buttonsPressed).toContain(0);

        // Second poll - A button still held
        const buttons2 = createEmptyButtons();
        buttons2[0] = { value: 1, pressed: true };
        const mockGamepad2 = createMockGamepad(0, true, buttons2, [0, 0, 0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad2, null, null, null]);
        inputCapture.pollGamepads();

        // Button still down but not "just pressed"
        expect(inputCapture.getInputState().gamepads[0].buttons[0]).toBe(1);
        expect(inputCapture.getInputState().gamepads[0].buttonsPressed).not.toContain(0);
      });

      it('should read axis values', () => {
        const buttons = createEmptyButtons();
        const axes = [-0.5, 0.8, 0.3, -0.2];
        const mockGamepad = createMockGamepad(0, true, buttons, axes);
        mockGetGamepads.mockReturnValue([mockGamepad, null, null, null]);

        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].axes[0]).toBeCloseTo(-0.5);
        expect(state.gamepads[0].axes[1]).toBeCloseTo(0.8);
        expect(state.gamepads[0].axes[2]).toBeCloseTo(0.3);
        expect(state.gamepads[0].axes[3]).toBeCloseTo(-0.2);
      });

      it('should handle gamepad with fewer buttons than standard', () => {
        // Create a gamepad with only 4 buttons (less than standard 17)
        const buttons = Array.from({ length: 4 }, () => ({ value: 0, pressed: false }));
        buttons[0] = { value: 1, pressed: true };
        const mockGamepad = createMockGamepad(0, true, buttons, [0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad, null, null, null]);

        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].connected).toBe(true);
        expect(state.gamepads[0].buttons[0]).toBe(1);
        // Buttons beyond the gamepad's count should remain 0
        expect(state.gamepads[0].buttons[4]).toBe(0);
      });

      it('should handle gamepad with fewer axes than standard', () => {
        const buttons = createEmptyButtons();
        // Only 2 axes instead of standard 4
        const mockGamepad = createMockGamepad(0, true, buttons, [0.5, -0.3]);
        mockGetGamepads.mockReturnValue([mockGamepad, null, null, null]);

        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].axes[0]).toBeCloseTo(0.5);
        expect(state.gamepads[0].axes[1]).toBeCloseTo(-0.3);
        // Axes beyond the gamepad's count should remain 0
        expect(state.gamepads[0].axes[2]).toBe(0);
        expect(state.gamepads[0].axes[3]).toBe(0);
      });

      it('should handle gamepad disconnect', () => {
        // Connect gamepad
        const buttons = createEmptyButtons();
        const mockGamepad = createMockGamepad(0, true, buttons, [0, 0, 0, 0]);
        mockGetGamepads.mockReturnValue([mockGamepad, null, null, null]);
        inputCapture.pollGamepads();

        expect(inputCapture.getInputState().gamepads[0].connected).toBe(true);

        // Disconnect gamepad
        mockGetGamepads.mockReturnValue([null, null, null, null]);
        inputCapture.pollGamepads();

        expect(inputCapture.getInputState().gamepads[0].connected).toBe(false);
        expect(inputCapture.getInputState().gamepads[0].id).toBe('');
      });

      it('should support multiple gamepads', () => {
        const buttons = createEmptyButtons();
        const gamepad0 = createMockGamepad(0, true, buttons, [0, 0, 0, 0]);
        const gamepad2 = createMockGamepad(2, true, buttons, [-1, 0, 0, 0]);

        mockGetGamepads.mockReturnValue([gamepad0, null, gamepad2, null]);
        inputCapture.pollGamepads();
        const state = inputCapture.getInputState();

        expect(state.gamepads[0].connected).toBe(true);
        expect(state.gamepads[1].connected).toBe(false);
        expect(state.gamepads[2].connected).toBe(true);
        expect(state.gamepads[2].axes[0]).toBe(-1);
        expect(state.gamepads[3].connected).toBe(false);
      });
    });

    describe('getConnectedGamepadCount', () => {
      let mockGetGamepads: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        mockGetGamepads = vi.fn().mockReturnValue([null, null, null, null]);
        Object.defineProperty(navigator, 'getGamepads', {
          value: mockGetGamepads,
          configurable: true,
          writable: true,
        });
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should return 0 when no gamepads connected', () => {
        inputCapture.pollGamepads();
        expect(inputCapture.getConnectedGamepadCount()).toBe(0);
      });

      it('should return correct count', () => {
        const buttons = createEmptyButtons();
        const gamepad0 = createMockGamepad(0, true, buttons, [0, 0, 0, 0]);
        const gamepad2 = createMockGamepad(2, true, buttons, [0, 0, 0, 0]);

        mockGetGamepads.mockReturnValue([gamepad0, null, gamepad2, null]);
        inputCapture.pollGamepads();

        expect(inputCapture.getConnectedGamepadCount()).toBe(2);
      });
    });
  });
});
