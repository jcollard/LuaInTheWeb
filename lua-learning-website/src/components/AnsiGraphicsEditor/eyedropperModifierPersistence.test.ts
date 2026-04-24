/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_EYEDROPPER_MODIFIER,
  loadStoredEyedropperModifier,
  saveStoredEyedropperModifier,
  isEyedropperModifierPressed,
  eyedropperModifierLabel,
  type EyedropperModifier,
  type ModifierEvent,
} from './eyedropperModifierPersistence'

beforeEach(() => {
  localStorage.clear()
})

describe('eyedropperModifierPersistence', () => {
  it('DEFAULT_EYEDROPPER_MODIFIER is ctrl (preserves pre-existing behavior)', () => {
    expect(DEFAULT_EYEDROPPER_MODIFIER).toBe('ctrl')
  })

  it('returns default when storage is empty', () => {
    expect(loadStoredEyedropperModifier()).toBe('ctrl')
  })

  it('returns default for an unknown stored value (schema protection)', () => {
    localStorage.setItem('ansi-editor:eyedropper-modifier', 'not-a-real-modifier')
    expect(loadStoredEyedropperModifier()).toBe('ctrl')
  })

  it('returns default for empty-string stored value', () => {
    localStorage.setItem('ansi-editor:eyedropper-modifier', '')
    expect(loadStoredEyedropperModifier()).toBe('ctrl')
  })

  it('each valid modifier round-trips', () => {
    const modifiers: readonly EyedropperModifier[] = ['ctrl', 'shift', 'alt', 'meta']
    for (const m of modifiers) {
      saveStoredEyedropperModifier(m)
      expect(loadStoredEyedropperModifier()).toBe(m)
    }
  })

  it('overwrites a previous value', () => {
    saveStoredEyedropperModifier('shift')
    saveStoredEyedropperModifier('alt')
    expect(loadStoredEyedropperModifier()).toBe('alt')
  })

  it('writes under the stable storage key (ansi-editor:eyedropper-modifier)', () => {
    saveStoredEyedropperModifier('shift')
    expect(localStorage.getItem('ansi-editor:eyedropper-modifier')).toBe('shift')
  })

  it('reads from the stable storage key (independent of save round-trip)', () => {
    localStorage.setItem('ansi-editor:eyedropper-modifier', 'meta')
    expect(loadStoredEyedropperModifier()).toBe('meta')
  })

  it('returns default when localStorage.getItem throws', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(loadStoredEyedropperModifier()).toBe('ctrl')
    } finally {
      Storage.prototype.getItem = original
    }
  })

  it('swallows localStorage.setItem errors silently', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    try {
      expect(() => saveStoredEyedropperModifier('shift')).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('isEyedropperModifierPressed', () => {
  function evt(overrides: Partial<ModifierEvent> = {}): ModifierEvent {
    return { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...overrides }
  }

  it('ctrl modifier matches only ctrlKey', () => {
    expect(isEyedropperModifierPressed(evt({ ctrlKey: true }), 'ctrl')).toBe(true)
    expect(isEyedropperModifierPressed(evt({ shiftKey: true }), 'ctrl')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ altKey: true }), 'ctrl')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ metaKey: true }), 'ctrl')).toBe(false)
    expect(isEyedropperModifierPressed(evt(), 'ctrl')).toBe(false)
  })

  it('shift modifier matches only shiftKey', () => {
    expect(isEyedropperModifierPressed(evt({ shiftKey: true }), 'shift')).toBe(true)
    expect(isEyedropperModifierPressed(evt({ ctrlKey: true }), 'shift')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ altKey: true }), 'shift')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ metaKey: true }), 'shift')).toBe(false)
  })

  it('alt modifier matches only altKey', () => {
    expect(isEyedropperModifierPressed(evt({ altKey: true }), 'alt')).toBe(true)
    expect(isEyedropperModifierPressed(evt({ ctrlKey: true }), 'alt')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ shiftKey: true }), 'alt')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ metaKey: true }), 'alt')).toBe(false)
  })

  it('meta modifier matches only metaKey — does NOT fall back to ctrl', () => {
    expect(isEyedropperModifierPressed(evt({ metaKey: true }), 'meta')).toBe(true)
    expect(isEyedropperModifierPressed(evt({ ctrlKey: true }), 'meta')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ shiftKey: true }), 'meta')).toBe(false)
    expect(isEyedropperModifierPressed(evt({ altKey: true }), 'meta')).toBe(false)
  })

  it('returns true when extra non-matching modifiers are also held', () => {
    expect(isEyedropperModifierPressed(evt({ shiftKey: true, altKey: true }), 'shift')).toBe(true)
  })
})

describe('eyedropperModifierLabel', () => {
  it('returns distinct labels per modifier', () => {
    const labels = new Set([
      eyedropperModifierLabel('ctrl'),
      eyedropperModifierLabel('shift'),
      eyedropperModifierLabel('alt'),
      eyedropperModifierLabel('meta'),
    ])
    expect(labels.size).toBe(4)
  })

  it('ctrl label contains "Ctrl"', () => {
    expect(eyedropperModifierLabel('ctrl')).toContain('Ctrl')
  })

  it('shift label contains "Shift"', () => {
    expect(eyedropperModifierLabel('shift')).toContain('Shift')
  })

  it('alt label contains "Alt"', () => {
    expect(eyedropperModifierLabel('alt')).toContain('Alt')
  })

  it('meta label disambiguates mac/windows', () => {
    expect(eyedropperModifierLabel('meta')).toMatch(/Meta/)
    expect(eyedropperModifierLabel('meta')).toMatch(/⌘|Win/)
  })
})
