/**
 * Tests for the typed-character event queue and modifier-state helpers
 * exposed by InputAPI. Separate from InputAPI.test.ts to keep that file
 * under the per-file line cap.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputAPI } from '../src/InputAPI'
import type { KeyTypedEvent } from '@lua-learning/canvas-runtime'

interface MockInputCapture {
  isKeyDown: ReturnType<typeof vi.fn>
  isKeyPressed: ReturnType<typeof vi.fn>
  getKeysDown: ReturnType<typeof vi.fn>
  getKeysTyped: ReturnType<typeof vi.fn>
  isShiftDown: ReturnType<typeof vi.fn>
  isCtrlDown: ReturnType<typeof vi.fn>
  isAltDown: ReturnType<typeof vi.fn>
  isMetaDown: ReturnType<typeof vi.fn>
  getInputState: ReturnType<typeof vi.fn>
  getMousePosition: ReturnType<typeof vi.fn>
  isMouseButtonDown: ReturnType<typeof vi.fn>
  isMouseButtonPressed: ReturnType<typeof vi.fn>
  getConnectedGamepadCount: ReturnType<typeof vi.fn>
}

function createMockInputCapture(): MockInputCapture {
  return {
    isKeyDown: vi.fn().mockReturnValue(false),
    isKeyPressed: vi.fn().mockReturnValue(false),
    getKeysDown: vi.fn().mockReturnValue([]),
    getKeysTyped: vi.fn().mockReturnValue([] as KeyTypedEvent[]),
    isShiftDown: vi.fn().mockReturnValue(false),
    isCtrlDown: vi.fn().mockReturnValue(false),
    isAltDown: vi.fn().mockReturnValue(false),
    isMetaDown: vi.fn().mockReturnValue(false),
    getInputState: vi.fn().mockReturnValue({
      keysDown: [], keysPressed: [], mouseX: 0, mouseY: 0,
      mouseButtonsDown: [], mouseButtonsPressed: [], gamepads: [],
    }),
    getMousePosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    isMouseButtonDown: vi.fn().mockReturnValue(false),
    isMouseButtonPressed: vi.fn().mockReturnValue(false),
    getConnectedGamepadCount: vi.fn().mockReturnValue(0),
  }
}

describe('InputAPI typed-character events', () => {
  let mockInputCapture: MockInputCapture

  beforeEach(() => {
    mockInputCapture = createMockInputCapture()
  })

  describe('getKeysTyped', () => {
    it('returns empty array when InputCapture is null', () => {
      expect(new InputAPI().getKeysTyped()).toEqual([])
    })

    it('delegates to InputCapture when set', () => {
      const events: KeyTypedEvent[] = [
        { key: 'a', code: 'KeyA', shift: false, ctrl: false, alt: false, meta: false },
        { key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false },
      ]
      mockInputCapture.getKeysTyped.mockReturnValue(events)
      const inputAPI = new InputAPI(mockInputCapture)
      expect(inputAPI.getKeysTyped()).toBe(events)
      expect(mockInputCapture.getKeysTyped).toHaveBeenCalled()
    })
  })

  describe('modifier-down helpers', () => {
    it('isShiftDown returns false when InputCapture is null', () => {
      expect(new InputAPI().isShiftDown()).toBe(false)
    })

    it('isCtrlDown returns false when InputCapture is null', () => {
      expect(new InputAPI().isCtrlDown()).toBe(false)
    })

    it('isAltDown returns false when InputCapture is null', () => {
      expect(new InputAPI().isAltDown()).toBe(false)
    })

    it('isMetaDown returns false when InputCapture is null', () => {
      expect(new InputAPI().isMetaDown()).toBe(false)
    })

    it('delegates each modifier helper to InputCapture', () => {
      mockInputCapture.isShiftDown.mockReturnValue(true)
      mockInputCapture.isCtrlDown.mockReturnValue(true)
      mockInputCapture.isAltDown.mockReturnValue(true)
      mockInputCapture.isMetaDown.mockReturnValue(true)
      const inputAPI = new InputAPI(mockInputCapture)
      expect(inputAPI.isShiftDown()).toBe(true)
      expect(inputAPI.isCtrlDown()).toBe(true)
      expect(inputAPI.isAltDown()).toBe(true)
      expect(inputAPI.isMetaDown()).toBe(true)
    })
  })
})
