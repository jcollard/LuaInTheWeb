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
      it('should return empty set when no keys pressed', () => {
        expect(inputCapture.getKeysDown()).toEqual(new Set());
      });

      it('should return set of all pressed keys', () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
        target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

        const keysDown = inputCapture.getKeysDown();
        expect(keysDown).toEqual(new Set(['KeyA', 'KeyW']));
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
    });
  });

  describe('getInputState', () => {
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
      expect(inputCapture.getKeysDown()).toEqual(new Set());
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
  });
});
