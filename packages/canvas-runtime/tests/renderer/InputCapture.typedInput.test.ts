/**
 * @vitest-environment jsdom
 *
 * Tests for the typed-character input queue and modifier-state helpers
 * added to InputCapture. Separate from InputCapture.test.ts so the parent
 * file stays under the 900-line cap.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputCapture } from '../../src/renderer/InputCapture.js';

describe('InputCapture typed-character input', () => {
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

  describe('getKeysTyped', () => {
    it('should return empty array when no keys typed', () => {
      expect(inputCapture.getKeysTyped()).toEqual([]);
    });

    it('should queue a typed event with key, code, and modifier booleans', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));

      const typed = inputCapture.getKeysTyped();
      expect(typed).toHaveLength(1);
      expect(typed[0]).toEqual({
        key: 'a',
        code: 'KeyA',
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
      });
    });

    it('should capture shifted symbol via event.key', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '!', shiftKey: true }));

      const typed = inputCapture.getKeysTyped();
      expect(typed).toHaveLength(1);
      expect(typed[0]).toMatchObject({ key: '!', code: 'Digit1', shift: true });
    });

    it('should capture ctrl+s shortcut', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', ctrlKey: true }));

      const typed = inputCapture.getKeysTyped();
      expect(typed).toHaveLength(1);
      expect(typed[0]).toMatchObject({ key: 's', code: 'KeyS', ctrl: true, shift: false });
    });

    it('should capture alt and meta modifier flags', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', altKey: true, metaKey: true }));

      const typed = inputCapture.getKeysTyped();
      expect(typed[0]).toMatchObject({ alt: true, meta: true });
    });

    it('should queue modifier-only presses (Shift alone)', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift', shiftKey: true }));

      const typed = inputCapture.getKeysTyped();
      expect(typed).toHaveLength(1);
      expect(typed[0].key).toBe('Shift');
    });

    it('should queue auto-repeat keydown events (text-entry use case)', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));

      expect(inputCapture.getKeysTyped()).toHaveLength(3);
    });

    it('should clear typed queue on update()', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      expect(inputCapture.getKeysTyped()).toHaveLength(1);

      inputCapture.update();

      expect(inputCapture.getKeysTyped()).toEqual([]);
    });

    it('should clear typed queue on blur', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      expect(inputCapture.getKeysTyped()).toHaveLength(1);

      target.dispatchEvent(new Event('blur'));

      expect(inputCapture.getKeysTyped()).toEqual([]);
    });

    it('should clear typed queue on reset()', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
      expect(inputCapture.getKeysTyped()).toHaveLength(1);

      inputCapture.reset();

      expect(inputCapture.getKeysTyped()).toEqual([]);
    });

    it('should preserve insertion order of multiple events', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', key: 'h' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '!', shiftKey: true }));

      const typed = inputCapture.getKeysTyped();
      expect(typed.map(e => e.key)).toEqual(['h', 'i', '!']);
    });

    it('should expose non-printing special keys (Enter, Backspace, Escape) via event.key', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', key: 'Backspace' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));

      const typed = inputCapture.getKeysTyped();
      expect(typed.map(e => e.key)).toEqual(['Enter', 'Backspace', 'Escape']);
    });
  });

  describe('modifier-down convenience helpers', () => {
    it('isShiftDown returns false when no shift held', () => {
      expect(inputCapture.isShiftDown()).toBe(false);
    });

    it('isShiftDown returns true when ShiftLeft held', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      expect(inputCapture.isShiftDown()).toBe(true);
    });

    it('isShiftDown returns true when ShiftRight held', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftRight' }));
      expect(inputCapture.isShiftDown()).toBe(true);
    });

    it('isCtrlDown returns true when either ControlLeft or ControlRight held', () => {
      expect(inputCapture.isCtrlDown()).toBe(false);
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlLeft' }));
      expect(inputCapture.isCtrlDown()).toBe(true);
      target.dispatchEvent(new KeyboardEvent('keyup', { code: 'ControlLeft' }));
      expect(inputCapture.isCtrlDown()).toBe(false);
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlRight' }));
      expect(inputCapture.isCtrlDown()).toBe(true);
    });

    it('isAltDown returns true when either AltLeft or AltRight held', () => {
      expect(inputCapture.isAltDown()).toBe(false);
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'AltLeft' }));
      expect(inputCapture.isAltDown()).toBe(true);
      target.dispatchEvent(new KeyboardEvent('keyup', { code: 'AltLeft' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'AltRight' }));
      expect(inputCapture.isAltDown()).toBe(true);
    });

    it('isMetaDown returns true when either MetaLeft or MetaRight held', () => {
      expect(inputCapture.isMetaDown()).toBe(false);
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'MetaLeft' }));
      expect(inputCapture.isMetaDown()).toBe(true);
      target.dispatchEvent(new KeyboardEvent('keyup', { code: 'MetaLeft' }));
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'MetaRight' }));
      expect(inputCapture.isMetaDown()).toBe(true);
    });

    it('modifier helpers do not report other letters as modifiers', () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(inputCapture.isShiftDown()).toBe(false);
      expect(inputCapture.isCtrlDown()).toBe(false);
      expect(inputCapture.isAltDown()).toBe(false);
      expect(inputCapture.isMetaDown()).toBe(false);
    });
  });
});
